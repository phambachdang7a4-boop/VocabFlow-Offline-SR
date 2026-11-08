import { getAuth } from '@clerk/express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Router, type IRouter, type RequestHandler } from 'express';
import {
  db,
  userCourseProgress,
  userCourseSelections,
  userReviewStatistics,
  userVocabulary,
  userWordTombstones,
} from '@workspace/db';
import {
  MergeUserSyncData200Response,
  MergeUserSyncDataBody,
} from '@workspace/api-zod';

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

router.post('/sync', requireAuth, async (req, res) => {
  const parsed = MergeUserSyncDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dữ liệu đồng bộ không hợp lệ.' });
    return;
  }
  if (parsed.data.reviewStats.some(stat => stat.correctCount > stat.reviewedCount)) {
    res.status(400).json({ error: 'Số liệu ôn tập không hợp lệ.' });
    return;
  }
  if (
    hasDuplicates(parsed.data.words, word => word.syncId) ||
    hasDuplicates(parsed.data.deletedWords, word => word.syncId) ||
    hasDuplicates(parsed.data.courseProgress, item => item.lessonId) ||
    hasDuplicates(parsed.data.courseSelections, item => `${item.lessonId}\u0000${item.wordId}`) ||
    hasDuplicates(parsed.data.reviewStats, item => `${item.deviceId}\u0000${item.day}`)
  ) {
    res.status(400).json({ error: 'Danh sách đồng bộ có mục trùng lặp.' });
    return;
  }

  try {
    const result = await db.transaction(async tx => {
      const userId = res.locals.userId;
      const snapshot = {
        words: parsed.data.words.map(word => ({
          ...word,
          createdAt: toTimestamp(word.createdAt),
          contentUpdatedAt: toTimestamp(word.contentUpdatedAt),
          progressUpdatedAt: toTimestamp(word.progressUpdatedAt),
        })),
        deletedWords: parsed.data.deletedWords.map(word => ({
          ...word,
          deletedAt: toTimestamp(word.deletedAt),
        })),
        courseProgress: parsed.data.courseProgress.map(progress => ({
          ...progress,
          completedAt: progress.completedAt ? toTimestamp(progress.completedAt) : null,
          updatedAt: toTimestamp(progress.updatedAt),
        })),
        courseSelections: parsed.data.courseSelections.map(selection => ({
          ...selection,
          updatedAt: toTimestamp(selection.updatedAt),
        })),
        reviewStats: parsed.data.reviewStats.map(stat => ({
          ...stat,
          updatedAt: toTimestamp(stat.updatedAt),
        })),
      };

      if (snapshot.words.length) {
        await tx.insert(userVocabulary).values(snapshot.words.map(word => ({
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
        }))).onConflictDoUpdate({
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

      const wordsAfterUpsert = await tx.select({
        syncId: userVocabulary.syncId,
        contentUpdatedAt: userVocabulary.contentUpdatedAt,
        progressUpdatedAt: userVocabulary.progressUpdatedAt,
      }).from(userVocabulary).where(eq(userVocabulary.userId, userId));
      const tombstonesBeforeMerge = await tx.select().from(userWordTombstones)
        .where(eq(userWordTombstones.userId, userId));
      const wordsById = new Map(wordsAfterUpsert.map(word => [word.syncId, word]));
      const staleTombstoneIds = tombstonesBeforeMerge
        .filter(tombstone => {
          const word = wordsById.get(tombstone.syncId);
          return word && maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) > tombstone.deletedAt;
        })
        .map(tombstone => tombstone.syncId);
      if (staleTombstoneIds.length) {
        await tx.delete(userWordTombstones).where(and(
          eq(userWordTombstones.userId, userId),
          inArray(userWordTombstones.syncId, staleTombstoneIds),
        ));
      }

      const tombstonesToMerge = snapshot.deletedWords.filter(deleted => {
        const activeWord = wordsById.get(deleted.syncId);
        return !activeWord ||
          maxTimestamp(activeWord.contentUpdatedAt, activeWord.progressUpdatedAt) <= deleted.deletedAt;
      });
      if (tombstonesToMerge.length) {
        await tx.insert(userWordTombstones).values(tombstonesToMerge.map(deleted => ({
          userId,
          syncId: deleted.syncId,
          deletedAt: deleted.deletedAt,
        }))).onConflictDoUpdate({
          target: [userWordTombstones.userId, userWordTombstones.syncId],
          set: {
            deletedAt: sql`GREATEST(${userWordTombstones.deletedAt}, EXCLUDED.deleted_at)`,
          },
        });
      }

      if (snapshot.courseProgress.length) {
        await tx.insert(userCourseProgress).values(snapshot.courseProgress.map(progress => ({
          userId,
          lessonId: progress.lessonId,
          currentIndex: progress.currentIndex,
          stage: progress.stage,
          completedAt: progress.completedAt,
          updatedAt: progress.updatedAt,
        }))).onConflictDoUpdate({
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
        await tx.insert(userCourseSelections).values(snapshot.courseSelections.map(selection => ({
          userId,
          lessonId: selection.lessonId,
          wordId: selection.wordId,
          selected: selection.selected,
          updatedAt: selection.updatedAt,
        }))).onConflictDoUpdate({
          target: [
            userCourseSelections.userId,
            userCourseSelections.lessonId,
            userCourseSelections.wordId,
          ],
          set: {
            selected: sql`CASE WHEN EXCLUDED.updated_at >= ${userCourseSelections.updatedAt} THEN EXCLUDED.selected ELSE ${userCourseSelections.selected} END`,
            updatedAt: sql`GREATEST(${userCourseSelections.updatedAt}, EXCLUDED.updated_at)`,
          },
        });
      }

      if (snapshot.reviewStats.length) {
        await tx.insert(userReviewStatistics).values(snapshot.reviewStats.map(stat => ({
          userId,
          deviceId: stat.deviceId,
          day: stat.day,
          reviewedCount: stat.reviewedCount,
          correctCount: stat.correctCount,
          updatedAt: stat.updatedAt,
        }))).onConflictDoUpdate({
          target: [
            userReviewStatistics.userId,
            userReviewStatistics.deviceId,
            userReviewStatistics.day,
          ],
          set: {
            reviewedCount: sql`GREATEST(${userReviewStatistics.reviewedCount}, EXCLUDED.reviewed_count)`,
            correctCount: sql`GREATEST(${userReviewStatistics.correctCount}, EXCLUDED.correct_count)`,
            updatedAt: sql`GREATEST(${userReviewStatistics.updatedAt}, EXCLUDED.updated_at)`,
          },
        });
      }

      const [allWords, allTombstones, allProgress, allSelections, allStats] = await Promise.all([
        tx.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)),
        tx.select().from(userWordTombstones).where(eq(userWordTombstones.userId, userId)),
        tx.select().from(userCourseProgress).where(eq(userCourseProgress.userId, userId)),
        tx.select().from(userCourseSelections).where(eq(userCourseSelections.userId, userId)),
        tx.select().from(userReviewStatistics).where(eq(userReviewStatistics.userId, userId)),
      ]);
      const tombstonesById = new Map(allTombstones.map(item => [item.syncId, item.deletedAt]));
      const wordsByIdForResponse = new Map(allWords.map(word => [word.syncId, word]));
      const activeWords = allWords
        .filter(word => {
          const deletedAt = tombstonesById.get(word.syncId);
          return !deletedAt || maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt) > deletedAt;
        })
        .map(({ userId: _owner, ...word }) => word);
      const activeTombstones = allTombstones
        .filter(item => {
          const word = wordsByIdForResponse.get(item.syncId);
          return !word || item.deletedAt >= maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt);
        })
        .map(({ userId: _owner, ...deleted }) => deleted);
      const deletedIds = allTombstones
        .filter(item => {
          const word = wordsByIdForResponse.get(item.syncId);
          return word && item.deletedAt >= maxTimestamp(word.contentUpdatedAt, word.progressUpdatedAt);
        })
        .map(item => item.syncId);
      if (deletedIds.length) {
        await tx.delete(userVocabulary).where(and(
          eq(userVocabulary.userId, userId),
          inArray(userVocabulary.syncId, deletedIds),
        ));
      }

      return {
        words: activeWords,
        deletedWords: activeTombstones,
        courseProgress: allProgress.map(({ userId: _owner, ...progress }) => progress),
        courseSelections: allSelections.map(({ userId: _owner, ...selection }) => selection),
        reviewStats: allStats.map(({ userId: _owner, ...stat }) => stat),
      };
    });

    res.json(MergeUserSyncData200Response.parse(result));
  } catch (error) {
    req.log.error({ errName: error instanceof Error ? error.name : 'UnknownError' }, 'User sync failed');
    res.status(503).json({ error: 'Chưa thể đồng bộ lúc này. Dữ liệu vẫn được giữ trên thiết bị.' });
  }
});

function maxTimestamp(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
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
