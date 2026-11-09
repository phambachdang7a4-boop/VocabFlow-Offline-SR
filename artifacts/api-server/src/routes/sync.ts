import { getAuth } from '@clerk/express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Router, type IRouter, type RequestHandler } from 'express';
import {
  db,
  userCourseProgress,
  userCourseSelections,
  userDailyMissionAwards,
  userReviewSessionResults,
  userReviewStatistics,
  userSyncRevisions,
  userVocabulary,
  userWordTombstones,
} from '@workspace/db';
import { MergeUserSyncData200Response, MergeUserSyncDataBody, ReplaceUserSyncData200Response, ReplaceUserSyncDataBody } from '@workspace/api-zod';

declare global {
  namespace Express {
    interface Locals {
      userId: string;
    }
  }
}

const router: IRouter = Router();

const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Đăng nhập để đồng bộ dữ liệu.' });
    return;
  }
  res.locals.userId = userId;
  next();
};

router.post('/sync/replace', requireAuth, async (req, res) => {
  const parsed = ReplaceUserSyncDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Tệp sao lưu không hợp lệ.' });
    return;
  }
  if (parsed.data.reviewStats.some((stat) => stat.correctCount > stat.reviewedCount)) {
    res.status(400).json({ error: 'Số liệu ôn tập không hợp lệ.' });
    return;
  }
  const reviewSessions = parsed.data.reviewSessions ?? [];
  const missionAwards = parsed.data.missionAwards ?? [];
  if (hasInvalidMissionData(reviewSessions, missionAwards)) {
    res.status(400).json({ error: 'Dữ liệu nhiệm vụ hoặc phiên ôn không hợp lệ.' });
    return;
  }
  if (
    hasDuplicates(parsed.data.words, (word) => word.syncId) ||
    hasDuplicates(parsed.data.deletedWords, (word) => word.syncId) ||
    hasDuplicates(parsed.data.courseProgress, (item) => item.lessonId) ||
    hasDuplicates(parsed.data.courseSelections, (item) => `${item.lessonId}\u0000${item.wordId}`) ||
    hasDuplicates(parsed.data.reviewStats, (item) => `${item.deviceId}\u0000${item.day}`) ||
    hasDuplicates(reviewSessions, (item) => item.sessionId) ||
    hasDuplicates(missionAwards, (item) => `${item.day}\u0000${item.missionId}`) ||
    parsed.data.deletedWords.some((deleted) => parsed.data.words.some((word) => word.syncId === deleted.syncId))
  ) {
    res.status(400).json({ error: 'Gói sao lưu có mục trùng hoặc mâu thuẫn.' });
    return;
  }

  try {
    const snapshot = {
      words: parsed.data.words.map((word) => ({
        ...word,
        createdAt: toTimestamp(word.createdAt),
        contentUpdatedAt: toTimestamp(word.contentUpdatedAt),
        progressUpdatedAt: toTimestamp(word.progressUpdatedAt),
      })),
      deletedWords: parsed.data.deletedWords.map((word) => ({
        ...word,
        deletedAt: toTimestamp(word.deletedAt),
      })),
      courseProgress: parsed.data.courseProgress.map((progress) => ({
        ...progress,
        completedAt: progress.completedAt ? toTimestamp(progress.completedAt) : null,
        updatedAt: toTimestamp(progress.updatedAt),
      })),
      courseSelections: parsed.data.courseSelections.map((selection) => ({
        ...selection,
        updatedAt: toTimestamp(selection.updatedAt),
      })),
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
    };

    const result = await db.transaction(async (tx) => {
      const userId = res.locals.userId;
      await tx.insert(userSyncRevisions).values({ userId, revision: 0 }).onConflictDoNothing();
      const [storedRevision] = await tx.select({ revision: userSyncRevisions.revision }).from(userSyncRevisions).where(eq(userSyncRevisions.userId, userId));
      const revision = (storedRevision?.revision ?? 0) + 1;
      await tx.delete(userVocabulary).where(eq(userVocabulary.userId, userId));
      await tx.delete(userWordTombstones).where(eq(userWordTombstones.userId, userId));
      await tx.delete(userCourseProgress).where(eq(userCourseProgress.userId, userId));
      await tx.delete(userCourseSelections).where(eq(userCourseSelections.userId, userId));
      await tx.delete(userReviewStatistics).where(eq(userReviewStatistics.userId, userId));
      await tx.delete(userReviewSessionResults).where(eq(userReviewSessionResults.userId, userId));
      await tx.delete(userDailyMissionAwards).where(eq(userDailyMissionAwards.userId, userId));

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
      if (snapshot.courseProgress.length) {
        await tx.insert(userCourseProgress).values(
          snapshot.courseProgress.map((progress) => ({
            userId,
            lessonId: progress.lessonId,
            currentIndex: progress.currentIndex,
            stage: progress.stage,
            completedAt: progress.completedAt,
            updatedAt: progress.updatedAt,
          })),
        );
      }
      if (snapshot.courseSelections.length) {
        await tx.insert(userCourseSelections).values(
          snapshot.courseSelections.map((selection) => ({
            userId,
            lessonId: selection.lessonId,
            wordId: selection.wordId,
            selected: selection.selected,
            updatedAt: selection.updatedAt,
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
      await tx.insert(userSyncRevisions).values({ userId, revision }).onConflictDoUpdate({
        target: userSyncRevisions.userId,
        set: { revision },
      });
      return { ...snapshot, revision };
    });
    res.json(ReplaceUserSyncData200Response.parse(result));
  } catch (error) {
    req.log.error({ errName: error instanceof Error ? error.name : 'UnknownError' }, 'User account restore failed');
    res.status(503).json({
      error: 'Chưa thể khôi phục tài khoản lúc này. Dữ liệu trên thiết bị vẫn được giữ.',
    });
  }
});

router.post('/sync', requireAuth, async (req, res) => {
  const parsed = MergeUserSyncDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dữ liệu đồng bộ không hợp lệ.' });
    return;
  }
  if (parsed.data.reviewStats.some((stat) => stat.correctCount > stat.reviewedCount)) {
    res.status(400).json({ error: 'Số liệu ôn tập không hợp lệ.' });
    return;
  }
  const reviewSessions = parsed.data.reviewSessions ?? [];
  const missionAwards = parsed.data.missionAwards ?? [];
  if (hasInvalidMissionData(reviewSessions, missionAwards)) {
    res.status(400).json({ error: 'Dữ liệu nhiệm vụ hoặc phiên ôn không hợp lệ.' });
    return;
  }
  if (
    hasDuplicates(parsed.data.words, (word) => word.syncId) ||
    hasDuplicates(parsed.data.deletedWords, (word) => word.syncId) ||
    hasDuplicates(parsed.data.courseProgress, (item) => item.lessonId) ||
    hasDuplicates(parsed.data.courseSelections, (item) => `${item.lessonId}\u0000${item.wordId}`) ||
    hasDuplicates(parsed.data.reviewStats, (item) => `${item.deviceId}\u0000${item.day}`) ||
    hasDuplicates(reviewSessions, (item) => item.sessionId) ||
    hasDuplicates(missionAwards, (item) => `${item.day}\u0000${item.missionId}`)
  ) {
    res.status(400).json({ error: 'Danh sách đồng bộ có mục trùng lặp.' });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const userId = res.locals.userId;
      await tx.insert(userSyncRevisions).values({ userId, revision: 0 }).onConflictDoNothing();
      const [storedRevision] = await tx.select({ revision: userSyncRevisions.revision }).from(userSyncRevisions).where(eq(userSyncRevisions.userId, userId));
      const accountRevision = storedRevision?.revision ?? 0;
      const incomingRevision = parsed.data.revision;
      if (incomingRevision === undefined && accountRevision > 0) {
        return { status: 'client-update' as const };
      }
      if ((incomingRevision ?? 0) < accountRevision) {
        return { status: 'stale' as const };
      }
      if ((incomingRevision ?? 0) > accountRevision) {
        return { status: 'future' as const };
      }
      const snapshot = {
        words: parsed.data.words.map((word) => ({
          ...word,
          createdAt: toTimestamp(word.createdAt),
          contentUpdatedAt: toTimestamp(word.contentUpdatedAt),
          progressUpdatedAt: toTimestamp(word.progressUpdatedAt),
        })),
        deletedWords: parsed.data.deletedWords.map((word) => ({
          ...word,
          deletedAt: toTimestamp(word.deletedAt),
        })),
        courseProgress: parsed.data.courseProgress.map((progress) => ({
          ...progress,
          completedAt: progress.completedAt ? toTimestamp(progress.completedAt) : null,
          updatedAt: toTimestamp(progress.updatedAt),
        })),
        courseSelections: parsed.data.courseSelections.map((selection) => ({
          ...selection,
          updatedAt: toTimestamp(selection.updatedAt),
        })),
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
      const tombstonesBeforeMerge = await tx.select().from(userWordTombstones).where(eq(userWordTombstones.userId, userId));
      const wordsById = new Map(wordsAfterUpsert.map((word) => [word.syncId, word]));
      const staleTombstoneIds = tombstonesBeforeMerge
        .filter((tombstone) => {
          const word = wordsById.get(tombstone.syncId);
          return word && maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) > tombstone.deletedAt;
        })
        .map((tombstone) => tombstone.syncId);
      if (staleTombstoneIds.length) {
        await tx.delete(userWordTombstones).where(and(eq(userWordTombstones.userId, userId), inArray(userWordTombstones.syncId, staleTombstoneIds)));
      }

      const tombstonesToMerge = snapshot.deletedWords.filter((deleted) => {
        const activeWord = wordsById.get(deleted.syncId);
        return !activeWord || maxTimestamp(activeWord.contentUpdatedAt, activeWord.progressUpdatedAt) <= deleted.deletedAt;
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

      if (snapshot.courseProgress.length) {
        await tx
          .insert(userCourseProgress)
          .values(
            snapshot.courseProgress.map((progress) => ({
              userId,
              lessonId: progress.lessonId,
              currentIndex: progress.currentIndex,
              stage: progress.stage,
              completedAt: progress.completedAt,
              updatedAt: progress.updatedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [userCourseProgress.userId, userCourseProgress.lessonId],
            set: {
              currentIndex: sql`GREATEST(${userCourseProgress.currentIndex}, EXCLUDED.current_index)`,
              stage: sql`CASE
              WHEN ${userCourseProgress.stage} = 'completed' OR EXCLUDED.stage = 'completed' THEN 'completed'
              WHEN EXCLUDED.current_index > ${userCourseProgress.currentIndex} THEN EXCLUDED.stage
              WHEN EXCLUDED.current_index < ${userCourseProgress.currentIndex} THEN ${userCourseProgress.stage}
              WHEN EXCLUDED.updated_at >= ${userCourseProgress.updatedAt} THEN EXCLUDED.stage
              ELSE ${userCourseProgress.stage}
            END`,
              completedAt: sql`COALESCE(${userCourseProgress.completedAt}, EXCLUDED.completed_at)`,
              updatedAt: sql`GREATEST(${userCourseProgress.updatedAt}, EXCLUDED.updated_at)`,
            },
          });
      }

      if (snapshot.courseSelections.length) {
        await tx
          .insert(userCourseSelections)
          .values(
            snapshot.courseSelections.map((selection) => ({
              userId,
              lessonId: selection.lessonId,
              wordId: selection.wordId,
              selected: selection.selected,
              updatedAt: selection.updatedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [userCourseSelections.userId, userCourseSelections.lessonId, userCourseSelections.wordId],
            set: {
              selected: sql`CASE WHEN EXCLUDED.updated_at >= ${userCourseSelections.updatedAt} THEN EXCLUDED.selected ELSE ${userCourseSelections.selected} END`,
              updatedAt: sql`GREATEST(${userCourseSelections.updatedAt}, EXCLUDED.updated_at)`,
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
            target: [userReviewStatistics.userId, userReviewStatistics.deviceId, userReviewStatistics.day],
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

      const [allWords, allTombstones, allProgress, allSelections, allStats, allSessions, allAwards] = await Promise.all([
        tx.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)),
        tx.select().from(userWordTombstones).where(eq(userWordTombstones.userId, userId)),
        tx.select().from(userCourseProgress).where(eq(userCourseProgress.userId, userId)),
        tx.select().from(userCourseSelections).where(eq(userCourseSelections.userId, userId)),
        tx.select().from(userReviewStatistics).where(eq(userReviewStatistics.userId, userId)),
        tx.select().from(userReviewSessionResults).where(eq(userReviewSessionResults.userId, userId)),
        tx.select().from(userDailyMissionAwards).where(eq(userDailyMissionAwards.userId, userId)),
      ]);
      const tombstonesById = new Map(allTombstones.map((item) => [item.syncId, item.deletedAt]));
      const wordsByIdForResponse = new Map(allWords.map((word) => [word.syncId, word]));
      const activeWords = allWords
        .filter((word) => {
          const deletedAt = tombstonesById.get(word.syncId);
          return !deletedAt || maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) > deletedAt;
        })
        .map(({ userId: _owner, ...word }) => word);
      const activeTombstones = allTombstones
        .filter((item) => {
          const word = wordsByIdForResponse.get(item.syncId);
          return !word || item.deletedAt >= maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt);
        })
        .map(({ userId: _owner, ...deleted }) => deleted);
      const deletedIds = allTombstones
        .filter((item) => {
          const word = wordsByIdForResponse.get(item.syncId);
          return word && item.deletedAt >= maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt);
        })
        .map((item) => item.syncId);
      if (deletedIds.length) {
        await tx.delete(userVocabulary).where(and(eq(userVocabulary.userId, userId), inArray(userVocabulary.syncId, deletedIds)));
      }

      return {
        status: 'merged' as const,
        snapshot: {
          revision: accountRevision,
          words: activeWords,
          deletedWords: activeTombstones,
          courseProgress: allProgress.map(({ userId: _owner, ...progress }) => progress),
          courseSelections: allSelections.map(({ userId: _owner, ...selection }) => selection),
          reviewStats: allStats.map(({ userId: _owner, ...stat }) => stat),
          reviewSessions: allSessions.map(({ userId: _owner, ...session }) => ({
            ...session,
            day: session.day,
          })),
          missionAwards: allAwards.map(({ userId: _owner, ...award }) => ({
            ...award,
            day: award.day,
          })),
        },
      };
    });

    if (result.status === 'client-update' || result.status === 'future') {
      res.status(409).json({
        error: 'Tài khoản đã đổi phiên bản dữ liệu. Cập nhật VocabFlow để tiếp tục đồng bộ.',
      });
      return;
    }
    if (result.status === 'stale') {
      res.json(MergeUserSyncData200Response.parse(await readUserSyncSnapshot(res.locals.userId)));
      return;
    }
    res.json(MergeUserSyncData200Response.parse(result.snapshot));
  } catch (error) {
    req.log.error({ errName: error instanceof Error ? error.name : 'UnknownError' }, 'User sync failed');
    res.status(503).json({
      error: 'Chưa thể đồng bộ lúc này. Dữ liệu vẫn được giữ trên thiết bị.',
    });
  }
});

async function readUserSyncSnapshot(userId: string) {
  const [revisionRows, allWords, allTombstones, allProgress, allSelections, allStats, allSessions, allAwards] = await Promise.all([
    db.select({ revision: userSyncRevisions.revision }).from(userSyncRevisions).where(eq(userSyncRevisions.userId, userId)),
    db.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)),
    db.select().from(userWordTombstones).where(eq(userWordTombstones.userId, userId)),
    db.select().from(userCourseProgress).where(eq(userCourseProgress.userId, userId)),
    db.select().from(userCourseSelections).where(eq(userCourseSelections.userId, userId)),
    db.select().from(userReviewStatistics).where(eq(userReviewStatistics.userId, userId)),
    db.select().from(userReviewSessionResults).where(eq(userReviewSessionResults.userId, userId)),
    db.select().from(userDailyMissionAwards).where(eq(userDailyMissionAwards.userId, userId)),
  ]);
  const tombstonesById = new Map(allTombstones.map((item) => [item.syncId, item.deletedAt]));
  const wordsById = new Map(allWords.map((word) => [word.syncId, word]));
  const words = allWords
    .filter((word) => {
      const deletedAt = tombstonesById.get(word.syncId);
      return !deletedAt || maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) > deletedAt;
    })
    .map(({ userId: _owner, ...word }) => word);
  const deletedWords = allTombstones
    .filter((item) => {
      const word = wordsById.get(item.syncId);
      return !word || item.deletedAt >= maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt);
    })
    .map(({ userId: _owner, ...deleted }) => deleted);

  return {
    revision: revisionRows[0]?.revision ?? 0,
    words,
    deletedWords,
    courseProgress: allProgress.map(({ userId: _owner, ...progress }) => progress),
    courseSelections: allSelections.map(({ userId: _owner, ...selection }) => selection),
    reviewStats: allStats.map(({ userId: _owner, ...stat }) => stat),
    reviewSessions: allSessions.map(({ userId: _owner, ...session }) => ({ ...session, day: session.day })),
    missionAwards: allAwards.map(({ userId: _owner, ...award }) => ({ ...award, day: award.day })),
  };
}

function maxTimestamp(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function hasInvalidMissionData(
  sessions: Array<{ reviewedCount: number; correctCount: number }>,
  awards: Array<{ stone: number; missionId: string }>,
): boolean {
  return (
    sessions.some(
      (session) =>
        !Number.isSafeInteger(session.reviewedCount) ||
        !Number.isSafeInteger(session.correctCount) ||
        session.reviewedCount < 0 ||
        session.correctCount < 0 ||
        session.correctCount > session.reviewedCount,
    ) ||
    awards.some((award) => !Number.isSafeInteger(award.stone) || award.stone < 1 || award.stone > 20 || !award.missionId.trim())
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
