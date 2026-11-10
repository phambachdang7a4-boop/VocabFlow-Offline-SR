import { getAuth } from "@clerk/express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  db,
  userCourseProgress,
  userCourseSelections,
  userCollectionCrafts,
  userDailyMissionAwards,
  userMissionChests,
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
  const missionAwards = parsed.data.missionAwards ?? [];
  const missionChests = parsed.data.missionChests ?? [];
  const collectionCrafts = parsed.data.collectionCrafts ?? [];
  if (
    hasInvalidMissionData(
      reviewSessions,
      missionAwards,
      missionChests,
      collectionCrafts,
    )
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
    hasDuplicates(collectionCrafts, (item) => item.craftId) ||
    hasDuplicates(
      collectionCrafts,
      (item) => `${item.rarity}\u0000${item.craftIndex}`,
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
        .delete(userDailyMissionAwards)
        .where(eq(userDailyMissionAwards.userId, userId));
      await tx
        .delete(userMissionChests)
        .where(eq(userMissionChests.userId, userId));
      await tx
        .delete(userCollectionCrafts)
        .where(eq(userCollectionCrafts.userId, userId));

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
  const missionAwards = parsed.data.missionAwards ?? [];
  const missionChests = parsed.data.missionChests ?? [];
  const collectionCrafts = parsed.data.collectionCrafts ?? [];
  if (
    hasInvalidMissionData(
      reviewSessions,
      missionAwards,
      missionChests,
      collectionCrafts,
    )
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
    hasDuplicates(collectionCrafts, (item) => item.craftId) ||
    hasDuplicates(
      collectionCrafts,
      (item) => `${item.rarity}\u0000${item.craftIndex}`,
    )
  ) {
    res.status(400).json({ error: "Danh sách đồng bộ có mục trùng lặp." });
    return;
  }

  try {
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
          : current.opened
            ? current
            : normalizedChest.ruleSet < current.ruleSet
              ? current
              : normalizedChest.ruleSet > current.ruleSet
                ? current.upgradeAttempts === 0
                  ? normalizedChest
                  : current
                : normalizedChest.opened
                  ? normalizedChest
                  : normalizedChest.upgradeAttempts > current.upgradeAttempts ||
                      (normalizedChest.upgradeAttempts ===
                        current.upgradeAttempts &&
                        normalizedChest.updatedAt > current.updatedAt)
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

      const [
        allWords,
        allTombstones,
        allStats,
        allSessions,
        allAwards,
        allChests,
        allCrafts,
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
          missionAwards: allAwards.map(({ userId: _owner, ...award }) => ({
            ...award,
            day: award.day,
          })),
          missionChests: allChests.map(({ userId: _owner, ...chest }) => ({
            ...chest,
            day: chest.day,
          })),
          collectionCrafts: allCrafts.map(
            ({ userId: _owner, ...craft }) => craft,
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
    allAwards,
    allChests,
    allCrafts,
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
    missionAwards: allAwards.map(({ userId: _owner, ...award }) => ({
      ...award,
      day: award.day,
    })),
    missionChests: allChests.map(({ userId: _owner, ...chest }) => ({
      ...chest,
      day: chest.day,
    })),
    collectionCrafts: allCrafts.map(({ userId: _owner, ...craft }) => craft),
  };
}

function maxTimestamp(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function hasInvalidMissionData(
  sessions: Array<{
    reviewedCount: number;
    correctCount: number;
    maxCombo?: number;
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
      return (
        !rarity ||
        !Number.isSafeInteger(craft.craftIndex) ||
        craft.craftIndex < 1 ||
        craft.craftId !== `craft-${craft.rarity}-${craft.craftIndex}` ||
        !craft.artworkId.trim() ||
        (craft.pieceCost !== undefined &&
          craft.pieceCost !== 20 &&
          craft.pieceCost !== 100) ||
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
    (ruleSet !== 1 && ruleSet !== 2 && ruleSet !== 3 && ruleSet !== 4) ||
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
    if (outcome.success) {
      rarity = outcome.rarity;
      opened = attempt === attemptLimit || rarity === "legendary";
    } else {
      opened = true;
    }
  }
  if (
    resolvedAttempts !== chest.upgradeAttempts ||
    rarity !== chest.rarity ||
    opened !== chest.opened ||
    !Number.isFinite(Date.parse(toTimestamp(chest.createdAt))) ||
    !Number.isFinite(Date.parse(toTimestamp(chest.updatedAt)))
  )
    return false;
  if (!opened) return chest.finalStone === null;
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
  return chest.finalStone === expectedStone;
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
