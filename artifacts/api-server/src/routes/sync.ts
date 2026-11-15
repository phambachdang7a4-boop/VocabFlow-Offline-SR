import { getAuth } from "@clerk/express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  db,
  userCourseProgress,
  userCourseSelections,
  userCollectionCrafts,
  userCollectionPieceSpends,
  userDailyMissionAwards,
  userMissionChests,
  userMissionShopPurchases,
  userStoneInvestments,
  userInvestmentStudyDays,
  userReviewComboRewards,
  userReviewSessionResults,
  userReviewStatistics,
  userSyncRevisions,
  userVocabulary,
  userWordTombstones,
} from "@workspace/db";
import {
  MergeUserSyncData200Response,
  MergeUserSyncDataBody,
  ReplaceUserSyncData200Response,
  ReplaceUserSyncDataBody,
} from "@workspace/api-zod";

declare global {
  namespace Express {
    interface Locals {
      userId: string;
    }
  }
}

const router: IRouter = Router();
const COURSE_SOURCE_MARKER = "Khóa học:";

function isCurrentStatueCraft(craft: {
  craftId: string;
  rarity: string;
  artworkId: string;
}) {
  return craft.craftId.startsWith("cycle2-");
}

function isCourseGeneratedWord(word: { note: string }) {
  return word.note.includes(COURSE_SOURCE_MARKER);
}

const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Đăng nhập để đồng bộ dữ liệu." });
    return;
  }
  res.locals.userId = userId;
  next();
};

router.post("/sync/replace", requireAuth, async (req, res) => {
  const parsed = ReplaceUserSyncDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Tệp sao lưu không hợp lệ." });
    return;
  }
  if (
    parsed.data.reviewStats.some(
      (stat) => stat.correctCount > stat.reviewedCount,
    )
  ) {
    res.status(400).json({ error: "Số liệu ôn tập không hợp lệ." });
    return;
  }
  const reviewSessions = parsed.data.reviewSessions ?? [];
  const reviewComboRewards = parsed.data.reviewComboRewards ?? [];
  const missionAwards = parsed.data.missionAwards ?? [];
  const missionChests = parsed.data.missionChests ?? [];
  const missionShopPurchases = parsed.data.missionShopPurchases ?? [];
  const stoneInvestments = parsed.data.stoneInvestments ?? [];
  const investmentStudyDays = parsed.data.investmentStudyDays ?? [];
  const rawCollectionCrafts = parsed.data.collectionCrafts ?? [];
  const collectionCrafts = rawCollectionCrafts.filter(isCurrentStatueCraft);
  const legacyPieceSpends = rawCollectionCrafts
    .filter((craft) => !isCurrentStatueCraft(craft))
    .map(pieceSpendFromLegacyCraft);
  const collectionPieceSpends = mergePieceSpends(
    parsed.data.collectionPieceSpends ?? [],
    legacyPieceSpends,
  );
  if (
    hasInvalidMissionData(
      reviewSessions,
      reviewComboRewards,
      missionAwards,
      missionChests,
      rawCollectionCrafts,
    ) ||
    hasInvalidCollectionPieceSpends(collectionPieceSpends) ||
    hasInvalidMissionShopPurchases(missionShopPurchases) ||
    hasInvalidStoneInvestments(stoneInvestments) ||
    hasInvalidInvestmentStudyDays(investmentStudyDays)
  ) {
    res
      .status(400)
      .json({ error: "Dữ liệu nhiệm vụ hoặc phiên ôn không hợp lệ." });
    return;
  }
  if (
    hasDuplicates(parsed.data.words, (word) => word.syncId) ||
    hasDuplicates(parsed.data.deletedWords, (word) => word.syncId) ||
    hasDuplicates(parsed.data.courseProgress, (item) => item.lessonId) ||
    hasDuplicates(
      parsed.data.courseSelections,
      (item) => `${item.lessonId}\u0000${item.wordId}`,
    ) ||
    hasDuplicates(
      parsed.data.reviewStats,
      (item) => `${item.deviceId}\u0000${item.day}`,
    ) ||
    hasDuplicates(
      reviewComboRewards,
      (item) => `${item.sessionId}\u0000${item.comboIndex}`,
    ) ||
    hasDuplicates(reviewSessions, (item) => item.sessionId) ||
    hasDuplicates(
      missionAwards,
      (item) => `${item.day}\u0000${item.missionId}`,
    ) ||
    hasDuplicates(missionChests, (item) => item.chestId) ||
    hasDuplicates(
      missionChests,
      (item) => `${item.day}\u0000${item.missionId}`,
    ) ||
    hasDuplicates(rawCollectionCrafts, (item) => item.craftId) ||
    hasDuplicates(
      rawCollectionCrafts,
      (item) => `${item.rarity}\u0000${item.craftIndex}`,
    ) ||
    hasDuplicates(collectionPieceSpends, (item) => item.spendId) ||
    hasDuplicates(missionShopPurchases, (item) => item.purchaseId) ||
    hasDuplicates(stoneInvestments, (item) => item.investmentId) ||
    hasDuplicates(investmentStudyDays, (item) => item.day) ||
    hasDuplicates(
      missionShopPurchases,
      (item) => `${item.day}\u0000${item.slot}`,
    ) ||
    hasDuplicates(
      missionShopPurchases,
      (item) => `${item.day}\u0000${item.rarity}`,
    ) ||
    parsed.data.deletedWords.some((deleted) =>
      parsed.data.words.some((word) => word.syncId === deleted.syncId),
    )
  ) {
    res.status(400).json({ error: "Gói sao lưu có mục trùng hoặc mâu thuẫn." });
    return;
  }

  try {
    const snapshot = {
      words: parsed.data.words
        .filter((word) => !isCourseGeneratedWord(word))
        .map((word) => ({
          ...word,
          createdAt: toTimestamp(word.createdAt),
          contentUpdatedAt: toTimestamp(word.contentUpdatedAt),
          progressUpdatedAt: toTimestamp(word.progressUpdatedAt),
        })),
      deletedWords: parsed.data.deletedWords.map((word) => ({
        ...word,
        deletedAt: toTimestamp(word.deletedAt),
      })),
      courseProgress: [],
      courseSelections: [],
      reviewStats: parsed.data.reviewStats.map((stat) => ({
        ...stat,
        sessionCount: stat.sessionCount ?? 0,
        updatedAt: toTimestamp(stat.updatedAt),
      })),
      reviewSessions: reviewSessions.map((session) => ({
        ...session,
        createdAt: toTimestamp(session.createdAt),
      })),
      reviewComboRewards: reviewComboRewards.map((reward) => ({
        ...reward,
        createdAt: toTimestamp(reward.createdAt),
      })),
      missionAwards: missionAwards.map((award) => ({
        ...award,
        completedAt: toTimestamp(award.completedAt),
      })),
      missionChests: missionChests.map((chest) => ({
        ...chest,
        createdAt: toTimestamp(chest.createdAt),
        updatedAt: toTimestamp(chest.updatedAt),
      })),
      collectionCrafts: collectionCrafts.map((craft) => ({
        ...craft,
        craftedAt: toTimestamp(craft.craftedAt),
      })),
      collectionPieceSpends: collectionPieceSpends.map((spend) => ({
        ...spend,
        spentAt: toTimestamp(spend.spentAt),
      })),
      missionShopPurchases: missionShopPurchases.map((purchase) => ({
        ...purchase,
        purchasedAt: toTimestamp(purchase.purchasedAt),
      })),
      stoneInvestments: stoneInvestments.map((investment) => ({
        ...investment,
        createdAt: toTimestamp(investment.createdAt),
        settledAt: investment.settledAt
          ? toTimestamp(investment.settledAt)
          : null,
      })),
      investmentStudyDays: investmentStudyDays.map((day) => ({
        ...day,
        updatedAt: toTimestamp(day.updatedAt),
      })),
    };

    const result = await db.transaction(async (tx) => {
      const userId = res.locals.userId;
      await tx
        .insert(userSyncRevisions)
        .values({ userId, revision: 0 })
        .onConflictDoNothing();
      const [storedRevision] = await tx
        .select({ revision: userSyncRevisions.revision })
        .from(userSyncRevisions)
        .where(eq(userSyncRevisions.userId, userId));
      const revision = (storedRevision?.revision ?? 0) + 1;
      let pieceSpendsToSave: CollectionPieceSpendLike[] =
        snapshot.collectionPieceSpends;
      if (parsed.data.collectionPieceSpends === undefined) {
        const [storedPieceSpends, storedCrafts] = await Promise.all([
          tx
            .select()
            .from(userCollectionPieceSpends)
            .where(eq(userCollectionPieceSpends.userId, userId)),
          tx
            .select()
            .from(userCollectionCrafts)
            .where(eq(userCollectionCrafts.userId, userId)),
        ]);
        const incomingCraftIds = new Set(
          rawCollectionCrafts.map((craft) => craft.craftId),
        );
        pieceSpendsToSave = mergePieceSpends(
          pieceSpendsToSave,
          storedPieceSpends,
          storedCrafts
            .filter((craft) => !incomingCraftIds.has(craft.craftId))
            .map(pieceSpendFromLegacyCraft),
        ).map((spend) => ({
          ...spend,
          spentAt: toTimestamp(spend.spentAt),
        }));
      }
      await tx.delete(userVocabulary).where(eq(userVocabulary.userId, userId));
      await tx
        .delete(userWordTombstones)
        .where(eq(userWordTombstones.userId, userId));
      await tx
        .delete(userCourseProgress)
        .where(eq(userCourseProgress.userId, userId));
      await tx
        .delete(userCourseSelections)
        .where(eq(userCourseSelections.userId, userId));
      await tx
        .delete(userReviewStatistics)
        .where(eq(userReviewStatistics.userId, userId));
      await tx
        .delete(userReviewSessionResults)
        .where(eq(userReviewSessionResults.userId, userId));
      await tx
        .delete(userReviewComboRewards)
        .where(eq(userReviewComboRewards.userId, userId));
      await tx
        .delete(userDailyMissionAwards)
        .where(eq(userDailyMissionAwards.userId, userId));
      await tx
        .delete(userMissionChests)
        .where(eq(userMissionChests.userId, userId));
      await tx
        .delete(userCollectionCrafts)
        .where(eq(userCollectionCrafts.userId, userId));
      await tx
        .delete(userCollectionPieceSpends)
        .where(eq(userCollectionPieceSpends.userId, userId));
      await tx
        .delete(userMissionShopPurchases)
        .where(eq(userMissionShopPurchases.userId, userId));
      await tx
        .delete(userStoneInvestments)
        .where(eq(userStoneInvestments.userId, userId));
      await tx
        .delete(userInvestmentStudyDays)
        .where(eq(userInvestmentStudyDays.userId, userId));

      if (snapshot.words.length) {
        await tx.insert(userVocabulary).values(
          snapshot.words.map((word) => ({
            userId,
            syncId: word.syncId,
            term: word.term,
            meaning: word.meaning,
            ipa: word.ipa,
            example: word.example,
            note: word.note,
            dictionaryEntryId: word.dictionaryEntryId,
            dictionarySenseId: word.dictionarySenseId,
            createdAt: word.createdAt,
            contentUpdatedAt: word.contentUpdatedAt,
            reviewCount: word.reviewCount,
            level: word.level,
            learnedOn: word.learnedOn,
            nextReviewOn: word.nextReviewOn,
            completed: word.completed,
            lastReviewedOn: word.lastReviewedOn,
            frozen: word.frozen,
            progressUpdatedAt: word.progressUpdatedAt,
          })),
        );
      }
      if (snapshot.deletedWords.length) {
        await tx.insert(userWordTombstones).values(
          snapshot.deletedWords.map((word) => ({
            userId,
            syncId: word.syncId,
            deletedAt: word.deletedAt,
          })),
        );
      }
      if (snapshot.reviewStats.length) {
        await tx.insert(userReviewStatistics).values(
          snapshot.reviewStats.map((stat) => ({
            userId,
            deviceId: stat.deviceId,
            day: stat.day,
            reviewedCount: stat.reviewedCount,
            correctCount: stat.correctCount,
            sessionCount: stat.sessionCount,
            updatedAt: stat.updatedAt,
          })),
        );
      }
      if (snapshot.reviewSessions.length) {
        await tx.insert(userReviewSessionResults).values(
          snapshot.reviewSessions.map((session) => ({
            userId,
            sessionId: session.sessionId,
            deviceId: session.deviceId,
            day: session.day,
            reviewedCount: session.reviewedCount,
            correctCount: session.correctCount,
            activeDurationMs: session.activeDurationMs ?? 0,
            maxCombo: session.maxCombo ?? 0,
            grade: session.grade,
            completed: session.completed,
            createdAt: session.createdAt,
          })),
        );
      }
      if (snapshot.reviewComboRewards.length) {
        await tx.insert(userReviewComboRewards).values(
          snapshot.reviewComboRewards.map((reward) => ({
            userId,
            sessionId: reward.sessionId,
            deviceId: reward.deviceId,
            day: reward.day,
            comboIndex: reward.comboIndex,
            comboLength: reward.comboLength,
            createdAt: reward.createdAt,
          })),
        );
      }
      if (snapshot.missionAwards.length) {
        await tx.insert(userDailyMissionAwards).values(
          snapshot.missionAwards.map((award) => ({
            userId,
            day: award.day,
            missionId: award.missionId,
            stone: award.stone,
            completedAt: award.completedAt,
          })),
        );
      }
      if (snapshot.missionChests.length) {
        await tx.insert(userMissionChests).values(
          snapshot.missionChests.map((chest) => ({
            userId,
            chestId: chest.chestId,
            day: chest.day,
            missionId: chest.missionId,
            baseStone: chest.baseStone,
            upgradeAttempts: chest.upgradeAttempts,
            rarity: chest.rarity,
            ruleSet: chest.ruleSet ?? 1,
            superUpgrade: chest.superUpgrade ?? false,
            opened: chest.opened,
            finalStone: chest.finalStone,
            createdAt: chest.createdAt,
            updatedAt: chest.updatedAt,
          })),
        );
      }
      if (snapshot.collectionCrafts.length) {
        await tx.insert(userCollectionCrafts).values(
          snapshot.collectionCrafts.map((craft) => ({
            userId,
            craftId: craft.craftId,
            rarity: craft.rarity,
            craftIndex: craft.craftIndex,
            artworkId: craft.artworkId,
            craftedAt: craft.craftedAt,
            pieceCost: craft.pieceCost ?? 20,
          })),
        );
      }
      if (pieceSpendsToSave.length) {
        await tx.insert(userCollectionPieceSpends).values(
          pieceSpendsToSave.map((spend) => ({
            userId,
            spendId: spend.spendId,
            rarity: spend.rarity,
            pieceCost: spend.pieceCost,
            spentAt: toTimestamp(spend.spentAt),
          })),
        );
      }
      if (snapshot.missionShopPurchases.length) {
        await tx.insert(userMissionShopPurchases).values(
          snapshot.missionShopPurchases.map((purchase) => ({
            userId,
            purchaseId: purchase.purchaseId,
            day: purchase.day,
            slot: purchase.slot,
            rarity: purchase.rarity,
            stoneCost: purchase.stoneCost,
            discountPercent: purchase.discountPercent,
            purchasedAt: purchase.purchasedAt,
          })),
        );
      }
      if (snapshot.stoneInvestments.length) {
        await tx.insert(userStoneInvestments).values(
          snapshot.stoneInvestments.map((investment) => ({
            userId,
            investmentId: investment.investmentId,
            plan: investment.plan,
            principal: investment.principal,
            durationDays: investment.durationDays,
            startDay: investment.startDay,
            endDay: investment.endDay,
            status: investment.status,
            settlementAmount: investment.settlementAmount,
            createdAt: investment.createdAt,
            settledAt: investment.settledAt,
          })),
        );
      }
      if (snapshot.investmentStudyDays.length) {
        await tx.insert(userInvestmentStudyDays).values(
          snapshot.investmentStudyDays.map((day) => ({
            userId,
            day: day.day,
            reviewed: day.reviewed,
            studiedCourse: day.studiedCourse,
            updatedAt: day.updatedAt,
          })),
        );
      }
      await tx
        .insert(userSyncRevisions)
        .values({ userId, revision })
        .onConflictDoUpdate({
          target: userSyncRevisions.userId,
          set: { revision },
        });
      return { ...snapshot, revision };
    });
    res.json(ReplaceUserSyncData200Response.parse(result));
  } catch (error) {
    req.log.error(
      { errName: error instanceof Error ? error.name : "UnknownError" },
      "User account restore failed",
    );
    res.status(503).json({
      error:
        "Chưa thể khôi phục tài khoản lúc này. Dữ liệu trên thiết bị vẫn được giữ.",
    });
  }
});

router.post("/sync", requireAuth, async (req, res) => {
  const parsed = MergeUserSyncDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dữ liệu đồng bộ không hợp lệ." });
    return;
  }
  if (
    parsed.data.reviewStats.some(
      (stat) => stat.correctCount > stat.reviewedCount,
    )
  ) {
    res.status(400).json({ error: "Số liệu ôn tập không hợp lệ." });
    return;
  }
  const reviewSessions = parsed.data.reviewSessions ?? [];
  const reviewComboRewards = parsed.data.reviewComboRewards ?? [];
  const missionAwards = parsed.data.missionAwards ?? [];
  const missionChests = parsed.data.missionChests ?? [];
  const missionShopPurchases = parsed.data.missionShopPurchases ?? [];
  const stoneInvestments = parsed.data.stoneInvestments ?? [];
  const investmentStudyDays = parsed.data.investmentStudyDays ?? [];
  const rawCollectionCrafts = parsed.data.collectionCrafts ?? [];
  const collectionCrafts = rawCollectionCrafts.filter(isCurrentStatueCraft);
  const legacyPieceSpends = rawCollectionCrafts
    .filter((craft) => !isCurrentStatueCraft(craft))
    .map(pieceSpendFromLegacyCraft);
  const collectionPieceSpends = mergePieceSpends(
    parsed.data.collectionPieceSpends ?? [],
    legacyPieceSpends,
  );
  if (
    hasInvalidMissionData(
      reviewSessions,
      reviewComboRewards,
      missionAwards,
      missionChests,
      rawCollectionCrafts,
    ) ||
    hasInvalidCollectionPieceSpends(collectionPieceSpends) ||
    hasInvalidMissionShopPurchases(missionShopPurchases) ||
    hasInvalidStoneInvestments(stoneInvestments) ||
    hasInvalidInvestmentStudyDays(investmentStudyDays)
  ) {
    res
      .status(400)
      .json({ error: "Dữ liệu nhiệm vụ hoặc phiên ôn không hợp lệ." });
    return;
  }
  if (
    hasDuplicates(parsed.data.words, (word) => word.syncId) ||
    hasDuplicates(parsed.data.deletedWords, (word) => word.syncId) ||
    hasDuplicates(parsed.data.courseProgress, (item) => item.lessonId) ||
    hasDuplicates(
      parsed.data.courseSelections,
      (item) => `${item.lessonId}\u0000${item.wordId}`,
    ) ||
    hasDuplicates(
      parsed.data.reviewStats,
      (item) => `${item.deviceId}\u0000${item.day}`,
    ) ||
    hasDuplicates(
      reviewComboRewards,
      (item) => `${item.sessionId}\u0000${item.comboIndex}`,
    ) ||
    hasDuplicates(reviewSessions, (item) => item.sessionId) ||
    hasDuplicates(
      missionAwards,
      (item) => `${item.day}\u0000${item.missionId}`,
    ) ||
    hasDuplicates(missionChests, (item) => item.chestId) ||
    hasDuplicates(
      missionChests,
      (item) => `${item.day}\u0000${item.missionId}`,
    ) ||
    hasDuplicates(rawCollectionCrafts, (item) => item.craftId) ||
    hasDuplicates(
      rawCollectionCrafts,
      (item) => `${item.rarity}\u0000${item.craftIndex}`,
    ) ||
    hasDuplicates(collectionPieceSpends, (item) => item.spendId) ||
    hasDuplicates(missionShopPurchases, (item) => item.purchaseId) ||
    hasDuplicates(
      missionShopPurchases,
      (item) => `${item.day}\u0000${item.slot}`,
    ) ||
    hasDuplicates(
      missionShopPurchases,
      (item) => `${item.day}\u0000${item.rarity}`,
    ) ||
    hasDuplicates(stoneInvestments, (item) => item.investmentId) ||
    hasDuplicates(investmentStudyDays, (item) => item.day)
  ) {
    res.status(400).json({ error: "Danh sách đồng bộ có mục trùng lặp." });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const userId = res.locals.userId;
      const storedCrafts = await tx
        .select()
        .from(userCollectionCrafts)
        .where(eq(userCollectionCrafts.userId, userId));
      const storedLegacySpends = storedCrafts
        .filter((craft) => !isCurrentStatueCraft(craft))
        .map(pieceSpendFromLegacyCraft);
      const spendsToMerge = mergePieceSpends(
        collectionPieceSpends,
        storedLegacySpends,
      ).map((spend) => ({
        ...spend,
        spentAt: toTimestamp(spend.spentAt),
      }));
      if (spendsToMerge.length) {
        await tx
          .insert(userCollectionPieceSpends)
          .values(
            spendsToMerge.map((spend) => ({
              userId,
              spendId: spend.spendId,
              rarity: spend.rarity,
              pieceCost: spend.pieceCost,
              spentAt: toTimestamp(spend.spentAt),
            })),
          )
          .onConflictDoNothing();
      }
      // Preserve historical piece spending, but lock all old statue rewards.
      // Only cycle-two unlock IDs survive this collection reset.
      await tx
        .delete(userCollectionCrafts)
        .where(
          and(
            eq(userCollectionCrafts.userId, userId),
            sql`${userCollectionCrafts.craftId} NOT LIKE 'cycle2-%'`,
          ),
        );
      await tx
        .insert(userSyncRevisions)
        .values({ userId, revision: 0 })
        .onConflictDoNothing();
      const [storedRevision] = await tx
        .select({ revision: userSyncRevisions.revision })
        .from(userSyncRevisions)
        .where(eq(userSyncRevisions.userId, userId));
      const accountRevision = storedRevision?.revision ?? 0;
      const incomingRevision = parsed.data.revision;
      if (incomingRevision === undefined && accountRevision > 0) {
        return { status: "client-update" as const };
      }
      if ((incomingRevision ?? 0) < accountRevision) {
        return { status: "stale" as const };
      }
      if ((incomingRevision ?? 0) > accountRevision) {
        return { status: "future" as const };
      }
      await tx
        .delete(userCourseProgress)
        .where(eq(userCourseProgress.userId, userId));
      await tx
        .delete(userCourseSelections)
        .where(eq(userCourseSelections.userId, userId));
      await tx
        .delete(userVocabulary)
        .where(
          and(
            eq(userVocabulary.userId, userId),
            sql`${userVocabulary.note} LIKE ${`%${COURSE_SOURCE_MARKER}%`}`,
          ),
        );
      const snapshot = {
        words: parsed.data.words
          .filter((word) => !isCourseGeneratedWord(word))
          .map((word) => ({
            ...word,
            createdAt: toTimestamp(word.createdAt),
            contentUpdatedAt: toTimestamp(word.contentUpdatedAt),
            progressUpdatedAt: toTimestamp(word.progressUpdatedAt),
          })),
        deletedWords: parsed.data.deletedWords.map((word) => ({
          ...word,
          deletedAt: toTimestamp(word.deletedAt),
        })),
        courseProgress: [],
        courseSelections: [],
        reviewStats: parsed.data.reviewStats.map((stat) => ({
          ...stat,
          sessionCount: stat.sessionCount ?? 0,
          updatedAt: toTimestamp(stat.updatedAt),
        })),
        reviewSessions: reviewSessions.map((session) => ({
          ...session,
          createdAt: toTimestamp(session.createdAt),
        })),
        reviewComboRewards: reviewComboRewards.map((reward) => ({
          ...reward,
          createdAt: toTimestamp(reward.createdAt),
        })),
        missionAwards: missionAwards.map((award) => ({
          ...award,
          completedAt: toTimestamp(award.completedAt),
        })),
        missionChests: missionChests.map((chest) => ({
          ...chest,
          createdAt: toTimestamp(chest.createdAt),
          updatedAt: toTimestamp(chest.updatedAt),
        })),
        collectionCrafts: collectionCrafts.map((craft) => ({
          ...craft,
          craftedAt: toTimestamp(craft.craftedAt),
        })),
        collectionPieceSpends: collectionPieceSpends.map((spend) => ({
          ...spend,
          spentAt: toTimestamp(spend.spentAt),
        })),
        missionShopPurchases: missionShopPurchases.map((purchase) => ({
          ...purchase,
          purchasedAt: toTimestamp(purchase.purchasedAt),
        })),
        stoneInvestments: stoneInvestments.map((investment) => ({
          ...investment,
          createdAt: toTimestamp(investment.createdAt),
          settledAt: investment.settledAt
            ? toTimestamp(investment.settledAt)
            : null,
        })),
        investmentStudyDays: investmentStudyDays.map((day) => ({
          ...day,
          updatedAt: toTimestamp(day.updatedAt),
        })),
      };

      if (snapshot.words.length) {
        await tx
          .insert(userVocabulary)
          .values(
            snapshot.words.map((word) => ({
              userId,
              syncId: word.syncId,
              term: word.term,
              meaning: word.meaning,
              ipa: word.ipa,
              example: word.example,
              note: word.note,
              dictionaryEntryId: word.dictionaryEntryId,
              dictionarySenseId: word.dictionarySenseId,
              createdAt: word.createdAt,
              contentUpdatedAt: word.contentUpdatedAt,
              reviewCount: word.reviewCount,
              level: word.level,
              learnedOn: word.learnedOn,
              nextReviewOn: word.nextReviewOn,
              completed: word.completed,
              lastReviewedOn: word.lastReviewedOn,
              frozen: word.frozen,
              progressUpdatedAt: word.progressUpdatedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [userVocabulary.userId, userVocabulary.syncId],
            set: {
              term: sql`CASE WHEN EXCLUDED.content_updated_at > ${userVocabulary.contentUpdatedAt} THEN EXCLUDED.term ELSE ${userVocabulary.term} END`,
              meaning: sql`CASE WHEN EXCLUDED.content_updated_at > ${userVocabulary.contentUpdatedAt} THEN EXCLUDED.meaning ELSE ${userVocabulary.meaning} END`,
              ipa: sql`CASE WHEN EXCLUDED.content_updated_at > ${userVocabulary.contentUpdatedAt} THEN EXCLUDED.ipa ELSE ${userVocabulary.ipa} END`,
              example: sql`CASE WHEN EXCLUDED.content_updated_at > ${userVocabulary.contentUpdatedAt} THEN EXCLUDED.example ELSE ${userVocabulary.example} END`,
              note: sql`CASE WHEN EXCLUDED.content_updated_at > ${userVocabulary.contentUpdatedAt} THEN EXCLUDED.note ELSE ${userVocabulary.note} END`,
              dictionaryEntryId: sql`CASE WHEN EXCLUDED.content_updated_at > ${userVocabulary.contentUpdatedAt} THEN EXCLUDED.dictionary_entry_id ELSE ${userVocabulary.dictionaryEntryId} END`,
              dictionarySenseId: sql`CASE WHEN EXCLUDED.content_updated_at > ${userVocabulary.contentUpdatedAt} THEN EXCLUDED.dictionary_sense_id ELSE ${userVocabulary.dictionarySenseId} END`,
              createdAt: sql`LEAST(${userVocabulary.createdAt}, EXCLUDED.created_at)`,
              contentUpdatedAt: sql`GREATEST(${userVocabulary.contentUpdatedAt}, EXCLUDED.content_updated_at)`,
              reviewCount: sql`CASE WHEN EXCLUDED.progress_updated_at > ${userVocabulary.progressUpdatedAt} THEN EXCLUDED.review_count ELSE ${userVocabulary.reviewCount} END`,
              level: sql`CASE WHEN EXCLUDED.progress_updated_at > ${userVocabulary.progressUpdatedAt} THEN EXCLUDED.level ELSE ${userVocabulary.level} END`,
              learnedOn: sql`CASE WHEN EXCLUDED.progress_updated_at > ${userVocabulary.progressUpdatedAt} THEN EXCLUDED.learned_on ELSE ${userVocabulary.learnedOn} END`,
              nextReviewOn: sql`CASE WHEN EXCLUDED.progress_updated_at > ${userVocabulary.progressUpdatedAt} THEN EXCLUDED.next_review_on ELSE ${userVocabulary.nextReviewOn} END`,
              completed: sql`CASE WHEN EXCLUDED.progress_updated_at > ${userVocabulary.progressUpdatedAt} THEN EXCLUDED.completed ELSE ${userVocabulary.completed} END`,
              lastReviewedOn: sql`CASE WHEN EXCLUDED.progress_updated_at > ${userVocabulary.progressUpdatedAt} THEN EXCLUDED.last_reviewed_on ELSE ${userVocabulary.lastReviewedOn} END`,
              frozen: sql`CASE WHEN EXCLUDED.progress_updated_at > ${userVocabulary.progressUpdatedAt} THEN EXCLUDED.frozen ELSE ${userVocabulary.frozen} END`,
              progressUpdatedAt: sql`GREATEST(${userVocabulary.progressUpdatedAt}, EXCLUDED.progress_updated_at)`,
            },
          });
      }

      const wordsAfterUpsert = await tx
        .select({
          syncId: userVocabulary.syncId,
          contentUpdatedAt: userVocabulary.contentUpdatedAt,
          progressUpdatedAt: userVocabulary.progressUpdatedAt,
        })
        .from(userVocabulary)
        .where(eq(userVocabulary.userId, userId));
      const tombstonesBeforeMerge = await tx
        .select()
        .from(userWordTombstones)
        .where(eq(userWordTombstones.userId, userId));
      const wordsById = new Map(
        wordsAfterUpsert.map((word) => [word.syncId, word]),
      );
      const staleTombstoneIds = tombstonesBeforeMerge
        .filter((tombstone) => {
          const word = wordsById.get(tombstone.syncId);
          return (
            word &&
            maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) >
              tombstone.deletedAt
          );
        })
        .map((tombstone) => tombstone.syncId);
      if (staleTombstoneIds.length) {
        await tx
          .delete(userWordTombstones)
          .where(
            and(
              eq(userWordTombstones.userId, userId),
              inArray(userWordTombstones.syncId, staleTombstoneIds),
            ),
          );
      }

      const tombstonesToMerge = snapshot.deletedWords.filter((deleted) => {
        const activeWord = wordsById.get(deleted.syncId);
        return (
          !activeWord ||
          maxTimestamp(
            activeWord.contentUpdatedAt,
            activeWord.progressUpdatedAt,
          ) <= deleted.deletedAt
        );
      });
      if (tombstonesToMerge.length) {
        await tx
          .insert(userWordTombstones)
          .values(
            tombstonesToMerge.map((deleted) => ({
              userId,
              syncId: deleted.syncId,
              deletedAt: deleted.deletedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [userWordTombstones.userId, userWordTombstones.syncId],
            set: {
              deletedAt: sql`GREATEST(${userWordTombstones.deletedAt}, EXCLUDED.deleted_at)`,
            },
          });
      }

      if (snapshot.reviewStats.length) {
        await tx
          .insert(userReviewStatistics)
          .values(
            snapshot.reviewStats.map((stat) => ({
              userId,
              deviceId: stat.deviceId,
              day: stat.day,
              reviewedCount: stat.reviewedCount,
              correctCount: stat.correctCount,
              sessionCount: stat.sessionCount,
              updatedAt: stat.updatedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [
              userReviewStatistics.userId,
              userReviewStatistics.deviceId,
              userReviewStatistics.day,
            ],
            set: {
              reviewedCount: sql`GREATEST(${userReviewStatistics.reviewedCount}, EXCLUDED.reviewed_count)`,
              correctCount: sql`GREATEST(${userReviewStatistics.correctCount}, EXCLUDED.correct_count)`,
              sessionCount: sql`GREATEST(${userReviewStatistics.sessionCount}, EXCLUDED.session_count)`,
              updatedAt: sql`GREATEST(${userReviewStatistics.updatedAt}, EXCLUDED.updated_at)`,
            },
          });
      }

      if (snapshot.reviewSessions.length) {
        await tx
          .insert(userReviewSessionResults)
          .values(
            snapshot.reviewSessions.map((session) => ({
              userId,
              sessionId: session.sessionId,
              deviceId: session.deviceId,
              day: session.day,
              reviewedCount: session.reviewedCount,
              correctCount: session.correctCount,
              activeDurationMs: session.activeDurationMs ?? 0,
              maxCombo: session.maxCombo ?? 0,
              grade: session.grade,
              completed: session.completed,
              createdAt: session.createdAt,
            })),
          )
          .onConflictDoNothing();
      }
      if (snapshot.reviewComboRewards.length) {
        await tx
          .insert(userReviewComboRewards)
          .values(
            snapshot.reviewComboRewards.map((reward) => ({
              userId,
              sessionId: reward.sessionId,
              deviceId: reward.deviceId,
              day: reward.day,
              comboIndex: reward.comboIndex,
              comboLength: reward.comboLength,
              createdAt: reward.createdAt,
            })),
          )
          .onConflictDoNothing();
      }
      if (snapshot.missionAwards.length) {
        await tx
          .insert(userDailyMissionAwards)
          .values(
            snapshot.missionAwards.map((award) => ({
              userId,
              day: award.day,
              missionId: award.missionId,
              stone: award.stone,
              completedAt: award.completedAt,
            })),
          )
          .onConflictDoNothing();
      }
      for (const chest of snapshot.missionChests) {
        const normalizedChest = {
          ...chest,
          ruleSet: chest.ruleSet ?? 1,
          superUpgrade: chest.superUpgrade ?? false,
        };
        const [current] = await tx
          .select()
          .from(userMissionChests)
          .where(
            and(
              eq(userMissionChests.userId, userId),
              eq(userMissionChests.chestId, normalizedChest.chestId),
            ),
          );
        const selected = !current
          ? normalizedChest
          : normalizedChest.ruleSet < current.ruleSet
            ? current
            : normalizedChest.ruleSet > current.ruleSet
              ? current.upgradeAttempts === 0 ||
                (current.ruleSet === 4 && normalizedChest.ruleSet === 5)
                ? normalizedChest
                : current
              : normalizedChest.upgradeAttempts > current.upgradeAttempts
                ? normalizedChest
                : normalizedChest.upgradeAttempts < current.upgradeAttempts
                  ? current
                  : Date.parse(toTimestamp(normalizedChest.updatedAt)) >
                      Date.parse(toTimestamp(current.updatedAt))
                    ? normalizedChest
                    : Date.parse(toTimestamp(normalizedChest.updatedAt)) <
                        Date.parse(toTimestamp(current.updatedAt))
                      ? current
                      : normalizedChest.opened && !current.opened
                        ? normalizedChest
                        : current;
        await tx
          .insert(userMissionChests)
          .values({
            userId,
            chestId: selected.chestId,
            day: selected.day,
            missionId: selected.missionId,
            baseStone: selected.baseStone,
            upgradeAttempts: selected.upgradeAttempts,
            rarity: selected.rarity,
            ruleSet: selected.ruleSet,
            superUpgrade: selected.superUpgrade,
            opened: selected.opened,
            finalStone: selected.finalStone,
            createdAt: selected.createdAt,
            updatedAt: selected.updatedAt,
          })
          .onConflictDoUpdate({
            target: [userMissionChests.userId, userMissionChests.chestId],
            set: {
              upgradeAttempts: selected.upgradeAttempts,
              rarity: selected.rarity,
              ruleSet: selected.ruleSet,
              superUpgrade: selected.superUpgrade,
              opened: selected.opened,
              finalStone: selected.finalStone,
              updatedAt: selected.updatedAt,
            },
          });
      }
      if (snapshot.collectionCrafts.length) {
        await tx
          .insert(userCollectionCrafts)
          .values(
            snapshot.collectionCrafts.map((craft) => ({
              userId,
              craftId: craft.craftId,
              rarity: craft.rarity,
              craftIndex: craft.craftIndex,
              artworkId: craft.artworkId,
              craftedAt: craft.craftedAt,
              pieceCost: craft.pieceCost ?? 20,
            })),
          )
          .onConflictDoNothing();
      }
      if (snapshot.missionShopPurchases.length) {
        await tx
          .insert(userMissionShopPurchases)
          .values(
            snapshot.missionShopPurchases.map((purchase) => ({
              userId,
              purchaseId: purchase.purchaseId,
              day: purchase.day,
              slot: purchase.slot,
              rarity: purchase.rarity,
              stoneCost: purchase.stoneCost,
              discountPercent: purchase.discountPercent,
              purchasedAt: purchase.purchasedAt,
            })),
          )
          .onConflictDoNothing();
      }
      for (const incoming of snapshot.stoneInvestments) {
        const [current] = await tx
          .select()
          .from(userStoneInvestments)
          .where(
            and(
              eq(userStoneInvestments.userId, userId),
              eq(userStoneInvestments.investmentId, incoming.investmentId),
            ),
          );
        if (
          current &&
          (current.plan !== incoming.plan ||
            current.principal !== incoming.principal ||
            current.durationDays !== incoming.durationDays ||
            current.startDay !== incoming.startDay ||
            current.endDay !== incoming.endDay)
        ) {
          throw new Error("Thương Vụ đồng bộ có dữ liệu mâu thuẫn.");
        }
        if (!current) {
          await tx.insert(userStoneInvestments).values({
            userId,
            investmentId: incoming.investmentId,
            plan: incoming.plan,
            principal: incoming.principal,
            durationDays: incoming.durationDays,
            startDay: incoming.startDay,
            endDay: incoming.endDay,
            status: incoming.status,
            settlementAmount: incoming.settlementAmount,
            createdAt: incoming.createdAt,
            settledAt: incoming.settledAt,
          });
        } else if (
          current.status === "active" ||
          (incoming.status !== "active" &&
            Date.parse(incoming.settledAt ?? "") >
              Date.parse(current.settledAt ?? ""))
        ) {
          await tx
            .update(userStoneInvestments)
            .set({
              status: incoming.status,
              settlementAmount: incoming.settlementAmount,
              settledAt: incoming.settledAt,
            })
            .where(
              and(
                eq(userStoneInvestments.userId, userId),
                eq(userStoneInvestments.investmentId, incoming.investmentId),
              ),
            );
        }
      }
      if (snapshot.investmentStudyDays.length) {
        await tx
          .insert(userInvestmentStudyDays)
          .values(
            snapshot.investmentStudyDays.map((day) => ({
              userId,
              day: day.day,
              reviewed: day.reviewed,
              studiedCourse: day.studiedCourse,
              updatedAt: day.updatedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [userInvestmentStudyDays.userId, userInvestmentStudyDays.day],
            set: {
              reviewed: sql`${userInvestmentStudyDays.reviewed} OR excluded.reviewed`,
              studiedCourse: sql`${userInvestmentStudyDays.studiedCourse} OR excluded.studied_course`,
              updatedAt: sql`GREATEST(${userInvestmentStudyDays.updatedAt}, excluded.updated_at)`,
            },
          });
      }
      const [
        allWords,
        allTombstones,
        allStats,
        allSessions,
        allComboRewards,
        allAwards,
        allChests,
        allCrafts,
        allPieceSpends,
        allShopPurchases,
        allInvestments,
        allInvestmentStudyDays,
      ] = await Promise.all([
        tx
          .select()
          .from(userVocabulary)
          .where(eq(userVocabulary.userId, userId)),
        tx
          .select()
          .from(userWordTombstones)
          .where(eq(userWordTombstones.userId, userId)),
        tx
          .select()
          .from(userReviewStatistics)
          .where(eq(userReviewStatistics.userId, userId)),
        tx
          .select()
          .from(userReviewSessionResults)
          .where(eq(userReviewSessionResults.userId, userId)),
        tx
          .select()
          .from(userReviewComboRewards)
          .where(eq(userReviewComboRewards.userId, userId)),
        tx
          .select()
          .from(userDailyMissionAwards)
          .where(eq(userDailyMissionAwards.userId, userId)),
        tx
          .select()
          .from(userMissionChests)
          .where(eq(userMissionChests.userId, userId)),
        tx
          .select()
          .from(userCollectionCrafts)
          .where(eq(userCollectionCrafts.userId, userId)),
        tx
          .select()
          .from(userCollectionPieceSpends)
          .where(eq(userCollectionPieceSpends.userId, userId)),
        tx
          .select()
          .from(userMissionShopPurchases)
          .where(eq(userMissionShopPurchases.userId, userId)),
        tx
          .select()
          .from(userStoneInvestments)
          .where(eq(userStoneInvestments.userId, userId)),
        tx
          .select()
          .from(userInvestmentStudyDays)
          .where(eq(userInvestmentStudyDays.userId, userId)),
      ]);
      const tombstonesById = new Map(
        allTombstones.map((item) => [item.syncId, item.deletedAt]),
      );
      const wordsByIdForResponse = new Map(
        allWords.map((word) => [word.syncId, word]),
      );
      const activeWords = allWords
        .filter((word) => {
          const deletedAt = tombstonesById.get(word.syncId);
          return (
            !deletedAt ||
            maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) >
              deletedAt
          );
        })
        .map(({ userId: _owner, ...word }) => word);
      const activeTombstones = allTombstones
        .filter((item) => {
          const word = wordsByIdForResponse.get(item.syncId);
          return (
            !word ||
            item.deletedAt >=
              maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt)
          );
        })
        .map(({ userId: _owner, ...deleted }) => deleted);
      const deletedIds = allTombstones
        .filter((item) => {
          const word = wordsByIdForResponse.get(item.syncId);
          return (
            word &&
            item.deletedAt >=
              maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt)
          );
        })
        .map((item) => item.syncId);
      if (deletedIds.length) {
        await tx
          .delete(userVocabulary)
          .where(
            and(
              eq(userVocabulary.userId, userId),
              inArray(userVocabulary.syncId, deletedIds),
            ),
          );
      }

      return {
        status: "merged" as const,
        snapshot: {
          revision: accountRevision,
          words: activeWords,
          deletedWords: activeTombstones,
          courseProgress: [],
          courseSelections: [],
          reviewStats: allStats.map(({ userId: _owner, ...stat }) => stat),
          reviewSessions: allSessions.map(({ userId: _owner, ...session }) => ({
            ...session,
            day: session.day,
          })),
          reviewComboRewards: allComboRewards.map(
            ({ userId: _owner, ...reward }) => ({
              ...reward,
              day: reward.day,
            }),
          ),
          missionAwards: allAwards.map(({ userId: _owner, ...award }) => ({
            ...award,
            day: award.day,
          })),
          missionChests: allChests.map(({ userId: _owner, ...chest }) => ({
            ...chest,
            day: chest.day,
          })),
          collectionCrafts: allCrafts
            .filter((craft) => isCurrentStatueCraft(craft))
            .map(({ userId: _owner, ...craft }) => craft),
          collectionPieceSpends: mergePieceSpends(
            allPieceSpends.map(({ userId: _owner, ...spend }) => spend),
            allCrafts
              .filter((craft) => !isCurrentStatueCraft(craft))
              .map(pieceSpendFromLegacyCraft),
          ),
          missionShopPurchases: allShopPurchases.map(
            ({ userId: _owner, ...purchase }) => ({
              ...purchase,
              day: purchase.day,
            }),
          ),
          stoneInvestments: allInvestments.map(
            ({ userId: _owner, ...investment }) => investment,
          ),
          investmentStudyDays: allInvestmentStudyDays.map(
            ({ userId: _owner, ...day }) => day,
          ),
        },
      };
    });

    if (result.status === "client-update" || result.status === "future") {
      res.status(409).json({
        error:
          "Tài khoản đã đổi phiên bản dữ liệu. Cập nhật VocabFlow để tiếp tục đồng bộ.",
      });
      return;
    }
    if (result.status === "stale") {
      res.json(
        MergeUserSyncData200Response.parse(
          await readUserSyncSnapshot(res.locals.userId),
        ),
      );
      return;
    }
    res.json(MergeUserSyncData200Response.parse(result.snapshot));
  } catch (error) {
    req.log.error(
      { errName: error instanceof Error ? error.name : "UnknownError" },
      "User sync failed",
    );
    res.status(503).json({
      error: "Chưa thể đồng bộ lúc này. Dữ liệu vẫn được giữ trên thiết bị.",
    });
  }
});

async function readUserSyncSnapshot(userId: string) {
  const [
    revisionRows,
    allWords,
    allTombstones,
    allStats,
    allSessions,
    allComboRewards,
    allAwards,
    allChests,
    allCrafts,
    allPieceSpends,
    allShopPurchases,
    allInvestments,
    allInvestmentStudyDays,
  ] = await Promise.all([
    db
      .select({ revision: userSyncRevisions.revision })
      .from(userSyncRevisions)
      .where(eq(userSyncRevisions.userId, userId)),
    db.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)),
    db
      .select()
      .from(userWordTombstones)
      .where(eq(userWordTombstones.userId, userId)),
    db
      .select()
      .from(userReviewStatistics)
      .where(eq(userReviewStatistics.userId, userId)),
    db
      .select()
      .from(userReviewSessionResults)
      .where(eq(userReviewSessionResults.userId, userId)),
    db
      .select()
      .from(userReviewComboRewards)
      .where(eq(userReviewComboRewards.userId, userId)),
    db
      .select()
      .from(userDailyMissionAwards)
      .where(eq(userDailyMissionAwards.userId, userId)),
    db
      .select()
      .from(userMissionChests)
      .where(eq(userMissionChests.userId, userId)),
    db
      .select()
      .from(userCollectionCrafts)
      .where(eq(userCollectionCrafts.userId, userId)),
    db
      .select()
      .from(userCollectionPieceSpends)
      .where(eq(userCollectionPieceSpends.userId, userId)),
    db
      .select()
      .from(userMissionShopPurchases)
      .where(eq(userMissionShopPurchases.userId, userId)),
    db
      .select()
      .from(userStoneInvestments)
      .where(eq(userStoneInvestments.userId, userId)),
    db
      .select()
      .from(userInvestmentStudyDays)
      .where(eq(userInvestmentStudyDays.userId, userId)),
  ]);
  const tombstonesById = new Map(
    allTombstones.map((item) => [item.syncId, item.deletedAt]),
  );
  const wordsById = new Map(allWords.map((word) => [word.syncId, word]));
  const words = allWords
    .filter((word) => {
      const deletedAt = tombstonesById.get(word.syncId);
      return (
        !deletedAt ||
        maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) > deletedAt
      );
    })
    .map(({ userId: _owner, ...word }) => word);
  const deletedWords = allTombstones
    .filter((item) => {
      const word = wordsById.get(item.syncId);
      return (
        !word ||
        item.deletedAt >=
          maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt)
      );
    })
    .map(({ userId: _owner, ...deleted }) => deleted);

  return {
    revision: revisionRows[0]?.revision ?? 0,
    words,
    deletedWords,
    courseProgress: [],
    courseSelections: [],
    reviewStats: allStats.map(({ userId: _owner, ...stat }) => stat),
    reviewSessions: allSessions.map(({ userId: _owner, ...session }) => ({
      ...session,
      day: session.day,
    })),
    reviewComboRewards: allComboRewards.map(
      ({ userId: _owner, ...reward }) => ({
        ...reward,
        day: reward.day,
      }),
    ),
    missionAwards: allAwards.map(({ userId: _owner, ...award }) => ({
      ...award,
      day: award.day,
    })),
    missionChests: allChests.map(({ userId: _owner, ...chest }) => ({
      ...chest,
      day: chest.day,
    })),
    collectionCrafts: allCrafts
      .filter((craft) => isCurrentStatueCraft(craft))
      .map(({ userId: _owner, ...craft }) => craft),
    collectionPieceSpends: mergePieceSpends(
      allPieceSpends.map(({ userId: _owner, ...spend }) => spend),
      allCrafts
        .filter((craft) => !isCurrentStatueCraft(craft))
        .map(pieceSpendFromLegacyCraft),
    ),
    missionShopPurchases: allShopPurchases.map(
      ({ userId: _owner, ...purchase }) => ({
        ...purchase,
        day: purchase.day,
      }),
    ),
    stoneInvestments: allInvestments.map(
      ({ userId: _owner, ...investment }) => investment,
    ),
    investmentStudyDays: allInvestmentStudyDays.map(
      ({ userId: _owner, ...day }) => day,
    ),
  };
}

function maxTimestamp(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function hasInvalidMissionShopPurchases(
  purchases: Array<{
    purchaseId: string;
    day: string;
    slot: number;
    rarity: string;
    stoneCost: number;
    discountPercent: number;
    purchasedAt: string | Date;
  }>,
): boolean {
  return purchases.some((purchase) => {
    if (
      !isValidDay(purchase.day) ||
      !Number.isSafeInteger(purchase.slot) ||
      purchase.slot < 0 ||
      purchase.slot > 2 ||
      !Number.isSafeInteger(purchase.stoneCost) ||
      !Number.isSafeInteger(purchase.discountPercent) ||
      !Number.isFinite(Date.parse(toTimestamp(purchase.purchasedAt)))
    ) {
      return true;
    }
    const offered = missionShopOffersForDay(purchase.day)[purchase.slot];
    return (
      purchase.purchaseId !== `shop:${purchase.day}:${purchase.slot}` ||
      purchase.rarity !== offered.rarity ||
      purchase.stoneCost !== offered.price ||
      purchase.discountPercent !== offered.discountPercent
    );
  });
}

function hasInvalidStoneInvestments(
  investments: Array<{
    investmentId: string;
    plan: string;
    principal: number;
    durationDays: number;
    startDay: string;
    endDay: string;
    status: string;
    settlementAmount: number | null;
    createdAt: string | Date;
    settledAt: string | Date | null;
  }>,
): boolean {
  return investments.some((investment) => {
    const {
      investmentId,
      plan,
      principal,
      durationDays,
      startDay,
      endDay,
      status,
      settlementAmount,
      createdAt,
      settledAt,
    } = investment;
    if (
      !/^investment:[a-z0-9-]{1,120}$/i.test(investmentId) ||
      !["safe", "balanced", "risky"].includes(plan) ||
      !Number.isSafeInteger(principal) ||
      principal <= 0 ||
      principal > 900_000_000 ||
      (durationDays !== 7 && durationDays !== 14) ||
      !isValidDay(startDay) ||
      !isValidDay(endDay) ||
      endDay !== addUtcDays(startDay, durationDays - 1) ||
      !["active", "succeeded", "failed"].includes(status) ||
      !Number.isFinite(Date.parse(toTimestamp(createdAt)))
    ) {
      return true;
    }

    if (status === "active") {
      return settlementAmount !== null || settledAt !== null;
    }
    if (
      !Number.isSafeInteger(settlementAmount) ||
      settledAt === null ||
      !Number.isFinite(Date.parse(toTimestamp(settledAt)))
    ) {
      return true;
    }
    if (status === "succeeded") {
      const rate = plan === "safe" ? 5 : plan === "balanced" ? 10 : 40;
      const interest = Math.round(
        (principal * rate * (durationDays === 14 ? 3 : 1)) / 100,
      );
      return settlementAmount !== principal + interest;
    }
    const failedPayoutPercent =
      plan === "safe" ? 99 : plan === "balanced" ? 70 : -20;
    return settlementAmount !== Math.round((principal * failedPayoutPercent) / 100);
  });
}

function hasInvalidInvestmentStudyDays(
  days: Array<{
    day: string;
    reviewed: boolean;
    studiedCourse: boolean;
    updatedAt: string | Date;
  }>,
): boolean {
  return days.some(
    (item) =>
      !isValidDay(item.day) ||
      typeof item.reviewed !== "boolean" ||
      typeof item.studiedCourse !== "boolean" ||
      (!item.reviewed && !item.studiedCourse) ||
      !Number.isFinite(Date.parse(toTimestamp(item.updatedAt))),
  );
}

function addUtcDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function missionShopOffersForDay(day: string) {
  const rarities = ["rare", "epic", "legendary"];
  for (let index = rarities.length - 1; index > 0; index -= 1) {
    const other =
      stableHash(`mission-shop-order:${day}:${index}`) % (index + 1);
    [rarities[index], rarities[other]] = [rarities[other]!, rarities[index]!];
  }
  const discountPercent =
    10 + (stableHash(`mission-shop-discount:${day}`) % 51);
  return rarities.map((rarity, slot) => {
    const basePrice = rarity === "rare" ? 200 : rarity === "epic" ? 400 : 1000;
    const appliedDiscount = slot === 2 ? discountPercent : 0;
    return {
      rarity,
      price: Math.round((basePrice * (100 - appliedDiscount)) / 100),
      discountPercent: appliedDiscount,
    };
  });
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function hasInvalidMissionData(
  sessions: Array<{
    reviewedCount: number;
    correctCount: number;
    maxCombo?: number;
  }>,
  comboRewards: Array<{
    sessionId: string;
    deviceId: string;
    day: string;
    comboIndex: number;
    comboLength: number;
    createdAt: string | Date;
  }>,
  awards: Array<{ stone: number; missionId: string }>,
  chests: Array<{
    chestId: string;
    day: string;
    missionId: string;
    baseStone: number;
    upgradeAttempts: number;
    rarity: string;
    opened: boolean;
    finalStone: number | null;
    createdAt: string | Date;
    updatedAt: string | Date;
  }>,
  crafts: Array<{
    craftId: string;
    rarity: string;
    craftIndex: number;
    artworkId: string;
    craftedAt: string | Date;
    pieceCost?: number;
  }>,
): boolean {
  return (
    sessions.some(
      (session) =>
        !Number.isSafeInteger(session.reviewedCount) ||
        !Number.isSafeInteger(session.correctCount) ||
        !Number.isSafeInteger(session.maxCombo ?? 0) ||
        session.reviewedCount < 0 ||
        session.correctCount < 0 ||
        (session.maxCombo ?? 0) < 0 ||
        (session.maxCombo ?? 0) > session.correctCount ||
        session.correctCount > session.reviewedCount,
    ) ||
    comboRewards.some((reward) => {
      const createdAt =
        reward.createdAt instanceof Date
          ? reward.createdAt.getTime()
          : Date.parse(reward.createdAt);
      return (
        !reward.sessionId.trim() ||
        reward.sessionId.length > 120 ||
        !reward.deviceId.trim() ||
        reward.deviceId.length > 80 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(reward.day) ||
        !Number.isSafeInteger(reward.comboIndex) ||
        reward.comboIndex < 1 ||
        !Number.isSafeInteger(reward.comboLength) ||
        reward.comboLength < 1 ||
        !Number.isFinite(Date.parse(reward.day)) ||
        !Number.isFinite(createdAt)
      );
    }) ||
    awards.some((award) => {
      const match = /^(review|add-words|lesson|grade|time|combo)-([1-3])$/.exec(
        award.missionId,
      );
      if (!match || !Number.isSafeInteger(award.stone)) return true;
      const level = Number(match[2]);
      const ranges: Record<number, readonly [number, number]> = {
        1: [1, 5],
        2: [5, 10],
        3: [10, 20],
      };
      const [minimum, maximum] = ranges[level];
      return award.stone < minimum || award.stone > maximum;
    }) ||
    chests.some((chest) => !isValidMissionChestRecord(chest)) ||
    crafts.some((craft) => {
      const rarity = isChestRarity(craft.rarity);
      const expectedId =
        craft.craftId === `craft-${craft.rarity}-${craft.craftIndex}` ||
        craft.craftId === `cycle2-${craft.rarity}-${craft.craftIndex}` ||
        craft.craftId.startsWith("cycle2-corvi-");
      return (
        !rarity ||
        !Number.isSafeInteger(craft.craftIndex) ||
        craft.craftIndex < 1 ||
        !expectedId ||
        !craft.artworkId.trim() ||
        (craft.pieceCost !== undefined &&
          craft.pieceCost !== -20 &&
          craft.pieceCost !== 0 &&
          craft.pieceCost !== 20 &&
          craft.pieceCost !== 100) ||
        (craft.pieceCost === -20 &&
          !craft.craftId.startsWith("cycle2-corvi-")) ||
        !Number.isFinite(Date.parse(toTimestamp(craft.craftedAt)))
      );
    })
  );
}

function isValidMissionChestRecord(chest: {
  chestId: string;
  day: string;
  missionId: string;
  baseStone: number;
  upgradeAttempts: number;
  rarity: string;
  ruleSet?: number;
  superUpgrade?: boolean;
  opened: boolean;
  finalStone: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}): boolean {
  const ruleSet = chest.ruleSet ?? 1;
  const superUpgrade = chest.superUpgrade ?? false;
  const attemptLimit = ruleSet >= 2 && superUpgrade ? 4 : 3;
  if (
    !chest.chestId.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(chest.day) ||
    !/^(review|add-words|lesson|grade|time|combo)-[1-3]$/.test(
      chest.missionId,
    ) ||
    !Number.isSafeInteger(chest.baseStone) ||
    chest.baseStone < 1 ||
    chest.baseStone > 20 ||
    !Number.isSafeInteger(chest.upgradeAttempts) ||
    chest.upgradeAttempts < 0 ||
    chest.upgradeAttempts > attemptLimit ||
    (ruleSet !== 1 &&
      ruleSet !== 2 &&
      ruleSet !== 3 &&
      ruleSet !== 4 &&
      ruleSet !== 5) ||
    (ruleSet === 1 && superUpgrade) ||
    (ruleSet >= 2 && superUpgrade !== serverHasSuperUpgrade(chest.chestId)) ||
    !isChestRarity(chest.rarity)
  ) {
    return false;
  }
  let rarity =
    ruleSet === 1 ? "common" : serverStartingChestRarity(chest.missionId);
  let opened = false;
  let resolvedAttempts = 0;
  let lastUpgradeSucceeded = true;
  for (let attempt = 1; attempt <= chest.upgradeAttempts; attempt += 1) {
    if (opened) return false;
    const outcome = serverChestUpgrade(
      chest.chestId,
      attempt,
      rarity,
      ruleSet,
      superUpgrade,
    );
    resolvedAttempts = attempt;
    lastUpgradeSucceeded = outcome.success;
    if (outcome.success) rarity = outcome.rarity;
    opened =
      attempt === attemptLimit ||
      rarity === "legendary" ||
      (ruleSet === 1 && !outcome.success);
  }
  const wasPrematurelyFinalized =
    ruleSet >= 2 &&
    chest.opened &&
    !opened &&
    !lastUpgradeSucceeded &&
    chest.upgradeAttempts < attemptLimit &&
    rarity !== "legendary";
  if (
    resolvedAttempts !== chest.upgradeAttempts ||
    rarity !== chest.rarity ||
    (opened !== chest.opened && !wasPrematurelyFinalized) ||
    !Number.isFinite(Date.parse(toTimestamp(chest.createdAt))) ||
    !Number.isFinite(Date.parse(toTimestamp(chest.updatedAt)))
  )
    return false;
  if (!opened && !wasPrematurelyFinalized) return chest.finalStone === null;
  const legacyBonuses: Record<string, number> = {
    common: 0,
    uncommon: 2,
    rare: 5,
    epic: 10,
    legendary: 20,
  };
  const fixedRewards: Record<string, number> = {
    common: 25,
    uncommon: 50,
    rare: 100,
    epic: 150,
    legendary: 1000,
  };
  const expectedStone =
    ruleSet >= 3
      ? fixedRewards[rarity]
      : chest.baseStone + legacyBonuses[rarity];
  return (
    chest.finalStone ===
    expectedStone +
      serverCommonFragmentStoneBonus(chest.chestId, rarity, ruleSet)
  );
}

function serverCommonFragmentStoneBonus(
  chestId: string,
  rarity: string,
  ruleSet: number,
): number {
  if (ruleSet !== 5) return 0;
  const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
  const rarityIndex = rarities.indexOf(rarity);
  const costs: Record<string, number> = {
    common: 1,
    uncommon: 3,
    rare: 9,
    epic: 27,
    legendary: 81,
  };
  const ranges: Record<string, readonly [number, number]> = {
    common: [2, 10],
    uncommon: [6, 30],
    rare: [18, 90],
    epic: [54, 270],
    legendary: [162, 810],
  };
  const range = ranges[rarity];
  if (rarityIndex < 0 || !range) return 0;
  let points =
    range[0] +
    (serverHash(`fragment-points:${chestId}:${rarity}`) %
      (range[1] - range[0] + 1));
  let convertedCommonCount = 0;
  let roll = 0;
  while (points > 0) {
    const available = rarities
      .slice(0, rarityIndex + 1)
      .filter((candidate) => costs[candidate]! <= points);
    const selectedHash = serverHash(
      `fragment-distribution:${chestId}:${rarity}:${roll}`,
    );
    const selected = available[selectedHash % available.length]!;
    if (selected === "common") convertedCommonCount += 1;
    points -= costs[selected]!;
    roll += 1;
  }
  return convertedCommonCount * 5;
}

function serverChestUpgrade(
  chestId: string,
  attempt: number,
  currentRarity: string,
  ruleSet: number,
  superUpgrade: boolean,
): { success: boolean; rarity: string } {
  if (ruleSet === 1) return serverLegacyChestUpgrade(chestId, attempt);
  const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
  const currentIndex = rarities.indexOf(currentRarity);
  if (currentIndex < 0 || currentIndex >= rarities.length - 1)
    return { success: false, rarity: currentRarity };
  const nextRarity = rarities[currentIndex + 1]!;
  if (attempt === 4 && superUpgrade)
    return { success: true, rarity: nextRarity };
  const chances = [70, 50, 25, 10];
  const chance = chances[currentIndex];
  if (chance === undefined) return { success: false, rarity: currentRarity };
  const roll =
    serverHash(`rarity-upgrade-v2:${chestId}:${attempt}:${currentRarity}`) %
    100;
  return roll < chance
    ? { success: true, rarity: nextRarity }
    : { success: false, rarity: currentRarity };
}

function serverLegacyChestUpgrade(
  chestId: string,
  attempt: number,
): { success: boolean; rarity: string } {
  const roll = serverHash(`${chestId}:${attempt}`) % 100;
  if (attempt === 1)
    return roll < 55
      ? { success: true, rarity: "uncommon" }
      : { success: false, rarity: "common" };
  if (attempt === 2)
    return roll < 40
      ? { success: true, rarity: "rare" }
      : { success: false, rarity: "uncommon" };
  if (roll < 5) return { success: true, rarity: "legendary" };
  if (roll < 25) return { success: true, rarity: "epic" };
  return { success: false, rarity: "rare" };
}

function serverStartingChestRarity(missionId: string): string {
  const slot = missionId.slice(missionId.lastIndexOf("-") + 1);
  return slot === "1" ? "common" : slot === "2" ? "uncommon" : "rare";
}

function serverHasSuperUpgrade(chestId: string): boolean {
  return serverHash(`super-upgrade:${chestId}`) % 100 < 2;
}

function serverHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function isChestRarity(value: string): boolean {
  return ["common", "uncommon", "rare", "epic", "legendary"].includes(value);
}

interface CollectionPieceSpendLike {
  spendId: string;
  rarity: string;
  pieceCost: number;
  spentAt: Date | string;
}

function pieceSpendFromLegacyCraft(craft: {
  craftId: string;
  rarity: string;
  pieceCost?: number;
  craftedAt: Date | string;
}): CollectionPieceSpendLike {
  return {
    spendId: `legacy:${craft.craftId}`,
    rarity: craft.rarity,
    pieceCost: craft.pieceCost === 100 ? 100 : 20,
    spentAt: toTimestamp(craft.craftedAt),
  };
}

function mergePieceSpends(
  ...groups: CollectionPieceSpendLike[][]
): CollectionPieceSpendLike[] {
  const byId = new Map<string, CollectionPieceSpendLike>();
  for (const spend of groups.flat()) {
    if (!byId.has(spend.spendId)) byId.set(spend.spendId, spend);
  }
  return [...byId.values()];
}

function hasInvalidCollectionPieceSpends(
  spends: CollectionPieceSpendLike[],
): boolean {
  return spends.some(
    (spend) =>
      !spend.spendId.trim() ||
      spend.spendId.length > 160 ||
      !isChestRarity(spend.rarity) ||
      (spend.pieceCost !== 20 && spend.pieceCost !== 100) ||
      !Number.isFinite(Date.parse(toTimestamp(spend.spentAt))),
  );
}

function hasDuplicates<T>(items: T[], keyFor: (item: T) => string): boolean {
  const keys = new Set<string>();
  for (const item of items) {
    const key = keyFor(item);
    if (keys.has(key)) return true;
    keys.add(key);
  }
  return false;
}

function toTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export default router;
