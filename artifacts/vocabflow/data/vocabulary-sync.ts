import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  getDatabaseScope,
  getSyncQueueState,
  markSyncPending,
  notifySyncApplied,
  subscribeSyncChanges,
  switchDatabaseScope,
  withSyncDatabase,
} from "./vocabulary";
import type { DailyReviewGrade } from "../domain/daily-missions";
import type { MissionChest } from "../domain/mission-chests";
import { reopenPrematureMissionChest } from "../domain/mission-chests";
import {
  isCollectionArtwork,
  type CollectionCraft,
} from "../domain/collection-artworks";

export interface SyncWord {
  syncId: string;
  term: string;
  meaning: string;
  ipa: string;
  example: string;
  note: string;
  dictionaryEntryId: number | null;
  dictionarySenseId: number | null;
  createdAt: string;
  contentUpdatedAt: string;
  reviewCount: number;
  level: number;
  learnedOn: string;
  nextReviewOn: string | null;
  completed: boolean;
  lastReviewedOn: string | null;
  frozen: boolean;
  progressUpdatedAt: string;
}

export interface SyncDeletedWord {
  syncId: string;
  deletedAt: string;
}

export interface SyncCourseProgress {
  lessonId: string;
  currentIndex: number;
  stage: "flashcard" | "answer" | "selection" | "completed";
  completedAt: string | null;
  updatedAt: string;
}

export interface SyncCourseSelection {
  lessonId: string;
  wordId: string;
  selected: boolean;
  updatedAt: string;
}

export interface SyncReviewStat {
  deviceId: string;
  day: string;
  reviewedCount: number;
  correctCount: number;
  sessionCount: number;
  updatedAt: string;
}

export interface SyncReviewSession {
  sessionId: string;
  deviceId: string;
  day: string;
  reviewedCount: number;
  correctCount: number;
  activeDurationMs?: number;
  maxCombo?: number;
  grade: DailyReviewGrade;
  completed: boolean;
  createdAt: string;
}

export interface SyncReviewComboReward {
  sessionId: string;
  deviceId: string;
  day: string;
  comboIndex: number;
  comboLength: number;
  createdAt: string;
}

export interface SyncMissionAward {
  day: string;
  missionId: string;
  stone: number;
  completedAt: string;
}

export interface SyncMissionChest extends MissionChest {}

export interface SyncCollectionCraft extends CollectionCraft {}

export interface SyncCollectionPieceSpend {
  spendId: string;
  rarity: MissionChest["rarity"];
  pieceCost: 20 | 100;
  spentAt: string;
}

export interface SyncPayload {
  revision: number;
  words: SyncWord[];
  deletedWords: SyncDeletedWord[];
  courseProgress: SyncCourseProgress[];
  courseSelections: SyncCourseSelection[];
  reviewStats: SyncReviewStat[];
  reviewSessions: SyncReviewSession[];
  reviewComboRewards?: SyncReviewComboReward[];
  missionAwards: SyncMissionAward[];
  missionChests: SyncMissionChest[];
  collectionCrafts: SyncCollectionCraft[];
  collectionPieceSpends: SyncCollectionPieceSpend[];
}

export interface LocalSyncSnapshot {
  payload: SyncPayload;
  generation: number;
  pending: boolean;
}

const LEGACY_IMPORT_KEY = "vocabflow.sync.legacy-imported-account";
const COURSE_SOURCE_MARKER = "Khóa học:";

function discardRemovedCourseData(payload: SyncPayload): SyncPayload {
  return {
    ...payload,
    collectionCrafts: (payload.collectionCrafts ?? []).filter((craft) =>
      isCollectionArtwork(craft.rarity, craft.artworkId),
    ),
    collectionPieceSpends: payload.collectionPieceSpends ?? [],
    words: payload.words.filter(
      (word) => !word.note.includes(COURSE_SOURCE_MARKER),
    ),
    courseProgress: [],
    courseSelections: [],
  };
}

export { getDatabaseScope };

export function subscribeToSyncChanges(listener: () => void): () => void {
  return subscribeSyncChanges(listener);
}

export function getLocalSyncState(): Promise<{
  generation: number;
  pending: boolean;
}> {
  return getSyncQueueState();
}

export async function exportSyncSnapshot(): Promise<LocalSyncSnapshot> {
  return withSyncDatabase(async (db) => {
    const [
      words,
      deletedWords,
      reviewStats,
      reviewSessions,
      reviewComboRewards,
      missionAwards,
      missionChests,
      collectionCrafts,
      state,
    ] = await Promise.all([
      db.getAllAsync<SyncWord>(`
        SELECT w.sync_id AS syncId, w.term, w.meaning, w.ipa, w.example, w.note,
          w.dictionary_entry_id AS dictionaryEntryId, w.dictionary_sense_id AS dictionarySenseId,
          w.created_at AS createdAt, w.updated_at AS contentUpdatedAt,
          p.review_count AS reviewCount, p.level, p.learned_on AS learnedOn,
          p.next_review_on AS nextReviewOn, p.completed AS completed,
          p.last_reviewed_on AS lastReviewedOn, p.frozen AS frozen,
          p.sync_updated_at AS progressUpdatedAt
        FROM words w JOIN word_progress p ON p.word_id = w.id
        ORDER BY w.sync_id
      `),
      db.getAllAsync<SyncDeletedWord>(`
        SELECT sync_id AS syncId, deleted_at AS deletedAt
        FROM sync_word_tombstones ORDER BY sync_id
      `),
      db.getAllAsync<SyncReviewStat>(`
        SELECT device_id AS deviceId, review_day AS day, reviewed_count AS reviewedCount,
          correct_count AS correctCount, session_count AS sessionCount, updated_at AS updatedAt
        FROM device_review_day_statistics ORDER BY review_day, device_id
      `),
      db.getAllAsync<SyncReviewSession>(`
        SELECT session_id AS sessionId, device_id AS deviceId, review_day AS day,
          reviewed_count AS reviewedCount, correct_count AS correctCount, grade,
          active_duration_ms AS activeDurationMs, max_combo AS maxCombo,
          completed, created_at AS createdAt
        FROM review_session_results ORDER BY review_day, session_id
      `),
      db.getAllAsync<SyncReviewComboReward>(`
        SELECT session_id AS sessionId, device_id AS deviceId,
          review_day AS day, combo_index AS comboIndex,
          combo_length AS comboLength, created_at AS createdAt
        FROM review_combo_rewards ORDER BY review_day, session_id, combo_index
      `),
      db.getAllAsync<SyncMissionAward>(`
        SELECT mission_day AS day, mission_id AS missionId, stone,
          completed_at AS completedAt
        FROM daily_mission_awards ORDER BY mission_day, mission_id
      `),
      db.getAllAsync<
        Omit<SyncMissionChest, "opened" | "superUpgrade" | "ruleSet"> & {
          opened: number;
          superUpgrade: number;
          ruleSet: number;
        }
      >(`
        SELECT chest_id AS chestId, mission_day AS day, mission_id AS missionId,
          base_stone AS baseStone, upgrade_attempts AS upgradeAttempts, rarity,
          rule_set AS ruleSet, super_upgrade AS superUpgrade,
          opened, final_stone AS finalStone, created_at AS createdAt, updated_at AS updatedAt
        FROM mission_chests ORDER BY mission_day, mission_id
      `),
      db.getAllAsync<SyncCollectionCraft>(`
        SELECT craft_id AS craftId, rarity, craft_index AS craftIndex,
          artwork_id AS artworkId, crafted_at AS craftedAt, piece_cost AS pieceCost
        FROM collection_crafts ORDER BY rarity, craft_index
      `),
      getSyncQueueStateFromDatabase(db),
    ]);
    return {
      payload: {
        revision: state.revision,
        words: words
          .filter((word) => !word.note.includes(COURSE_SOURCE_MARKER))
          .map((word) => ({
            ...word,
            completed: Boolean(word.completed),
            frozen: Boolean(word.frozen),
          })),
        deletedWords,
        courseProgress: [],
        courseSelections: [],
        reviewStats,
        reviewSessions: reviewSessions.map((session) => ({
          ...session,
          completed: Boolean(session.completed),
        })),
        reviewComboRewards,
        missionAwards,
        missionChests: missionChests.map((chest) => ({
          ...chest,
          ruleSet:
            chest.ruleSet === 5
              ? 5
              : chest.ruleSet === 4
                ? 4
                : chest.ruleSet === 3
                  ? 3
                  : chest.ruleSet === 2
                    ? 2
                    : 1,
          superUpgrade: Boolean(chest.superUpgrade),
          opened: Boolean(chest.opened),
        })),
        collectionCrafts: collectionCrafts.filter((craft) =>
          isCollectionArtwork(craft.rarity, craft.artworkId),
        ),
        collectionPieceSpends: (
          await db.getAllAsync<{
            spendId: string;
            rarity: MissionChest["rarity"];
            pieceCost: number;
            spentAt: string;
          }>(`
          SELECT spend_id AS spendId, rarity, piece_cost AS pieceCost,
            spent_at AS spentAt
          FROM collection_piece_spends ORDER BY spent_at, spend_id
        `)
        ).map((spend) => ({
          ...spend,
          pieceCost: spend.pieceCost === 100 ? 100 : 20,
        })),
      },
      generation: state.generation,
      pending: state.pending,
    };
  });
}

async function getSyncQueueStateFromDatabase(
  db: SQLiteDatabase,
): Promise<{ generation: number; pending: boolean; revision: number }> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM sync_state WHERE key IN ('generation', 'pending', 'account_revision')",
  );
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return {
    generation: Number(values.get("generation") ?? 0),
    pending: values.get("pending") === "1",
    revision: Number(values.get("account_revision") ?? 0),
  };
}

export async function mergeSyncSnapshot(payload: SyncPayload): Promise<void> {
  const safePayload = discardRemovedCourseData(payload);
  await withSyncDatabase(async (db) => {
    const state = await getSyncQueueStateFromDatabase(db);
    if (safePayload.revision > state.revision) {
      await db.withTransactionAsync(async () => {
        await replacePayloadData(db, safePayload);
        await db.runAsync(
          `
          INSERT INTO sync_state (key, value) VALUES ('account_revision', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `,
          String(safePayload.revision),
        );
        await db.runAsync(`
          INSERT INTO sync_state (key, value) VALUES ('replace_pending', '0')
          ON CONFLICT(key) DO UPDATE SET value = '0'
        `);
      });
      return;
    }
    if (safePayload.revision < state.revision) return;
    await mergeSnapshotIntoDatabase(db, safePayload);
  });
  notifySyncApplied();
}

/**
 * Restore an account backup as a full replacement. The replacement flag is
 * persisted with the new local snapshot so an offline restore replaces the
 * signed-in account on the next successful sync instead of merging old data.
 */
export async function replaceAccountSyncSnapshot(
  payload: SyncPayload,
): Promise<void> {
  await withSyncDatabase(async (db) => {
    await db.withTransactionAsync(async () => {
      await replacePayloadData(db, discardRemovedCourseData(payload));
      await db.runAsync(`
        INSERT INTO sync_state (key, value) VALUES ('replace_pending', '1')
        ON CONFLICT(key) DO UPDATE SET value = '1'
      `);
      await db.runAsync(`
        INSERT INTO sync_state (key, value) VALUES ('generation', '1')
        ON CONFLICT(key) DO UPDATE SET value = CAST(sync_state.value AS INTEGER) + 1
      `);
      await db.runAsync(`
        INSERT INTO sync_state (key, value) VALUES ('pending', '1')
        ON CONFLICT(key) DO UPDATE SET value = '1'
      `);
    });
  });
  await markSyncPending();
  notifySyncApplied();
}

export async function clearLocalAccountAfterCloudReset(
  revision: number,
): Promise<void> {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("Phiên bản dữ liệu tài khoản không hợp lệ.");
  }
  await withSyncDatabase(async (db) => {
    await db.withTransactionAsync(async () => {
      const state = await getSyncQueueStateFromDatabase(db);
      const emptyPayload: SyncPayload = {
        revision,
        words: [],
        deletedWords: [],
        courseProgress: [],
        courseSelections: [],
        reviewStats: [],
        reviewSessions: [],
        reviewComboRewards: [],
        missionAwards: [],
        missionChests: [],
        collectionCrafts: [],
        collectionPieceSpends: [],
      };
      await replacePayloadData(db, emptyPayload);
      for (const [key, value] of [
        ["account_revision", String(revision)],
        ["generation", String(state.generation + 1)],
        ["pending", "0"],
        ["replace_pending", "0"],
      ]) {
        await db.runAsync(
          `INSERT INTO sync_state (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          key,
          value,
        );
      }
    });
  });
  notifySyncApplied();
}

async function replacePayloadData(
  db: SQLiteDatabase,
  payload: SyncPayload,
): Promise<void> {
  payload = discardRemovedCourseData(payload);
  await db.execAsync(`
    DELETE FROM word_progress;
    DELETE FROM words;
    DELETE FROM sync_word_tombstones;
    DELETE FROM course_lesson_progress;
    DELETE FROM course_word_selection;
    DELETE FROM review_day_statistics;
    DELETE FROM device_review_day_statistics;
    DELETE FROM review_session_results;
    DELETE FROM review_combo_rewards;
    DELETE FROM daily_mission_awards;
    DELETE FROM mission_chests;
    DELETE FROM collection_crafts;
    DELETE FROM collection_piece_spends;
  `);

  for (const word of payload.words) {
    const result = await db.runAsync(
      `
      INSERT INTO words
        (sync_id, term, normalized_term, meaning, normalized_meaning, ipa, example, note,
          created_at, updated_at, dictionary_entry_id, dictionary_sense_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      word.syncId,
      word.term,
      normalize(word.term),
      word.meaning,
      normalize(word.meaning),
      word.ipa,
      word.example,
      word.note,
      word.createdAt,
      word.contentUpdatedAt,
      word.dictionaryEntryId,
      word.dictionarySenseId,
    );
    await db.runAsync(
      `
      INSERT INTO word_progress
        (word_id, review_count, level, learned_on, next_review_on, completed,
          last_reviewed_on, frozen, sync_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      result.lastInsertRowId,
      word.reviewCount,
      word.level,
      word.learnedOn,
      word.nextReviewOn,
      word.completed ? 1 : 0,
      word.lastReviewedOn,
      word.frozen ? 1 : 0,
      word.progressUpdatedAt,
    );
  }

  for (const word of payload.deletedWords) {
    await db.runAsync(
      "INSERT INTO sync_word_tombstones (sync_id, deleted_at) VALUES (?, ?)",
      word.syncId,
      word.deletedAt,
    );
  }
  for (const progress of payload.courseProgress) {
    await db.runAsync(
      `
      INSERT INTO course_lesson_progress
        (lesson_id, current_index, stage, completed_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
      progress.lessonId,
      progress.currentIndex,
      progress.stage,
      progress.completedAt,
      progress.updatedAt,
    );
  }
  for (const selection of payload.courseSelections) {
    await db.runAsync(
      `
      INSERT INTO course_word_selection (lesson_id, word_id, selected, updated_at)
      VALUES (?, ?, ?, ?)
    `,
      selection.lessonId,
      selection.wordId,
      selection.selected ? 1 : 0,
      selection.updatedAt,
    );
  }
  for (const stat of payload.reviewStats) {
    await db.runAsync(
      `
      INSERT INTO device_review_day_statistics
        (review_day, device_id, reviewed_count, correct_count, session_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      stat.day,
      stat.deviceId,
      stat.reviewedCount,
      stat.correctCount,
      stat.sessionCount ?? 0,
      stat.updatedAt,
    );
  }
  for (const session of payload.reviewSessions ?? []) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO review_session_results
        (session_id, device_id, review_day, reviewed_count, correct_count, grade, completed, created_at, active_duration_ms, max_combo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      session.sessionId,
      session.deviceId,
      session.day,
      session.reviewedCount,
      session.correctCount,
      session.grade,
      session.completed ? 1 : 0,
      session.createdAt,
      session.activeDurationMs ?? 0,
      session.maxCombo ?? 0,
    );
  }
  for (const reward of payload.reviewComboRewards ?? []) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO review_combo_rewards
        (session_id, device_id, review_day, combo_index, combo_length, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      reward.sessionId,
      reward.deviceId,
      reward.day,
      reward.comboIndex,
      reward.comboLength,
      reward.createdAt,
    );
  }
  for (const award of payload.missionAwards ?? []) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO daily_mission_awards (mission_day, mission_id, stone, completed_at)
      VALUES (?, ?, ?, ?)
    `,
      award.day,
      award.missionId,
      award.stone,
      award.completedAt,
    );
  }
  for (const chest of payload.missionChests ?? []) {
    await db.runAsync(
      `INSERT INTO mission_chests
        (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity, rule_set, super_upgrade,
          opened, final_stone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      chest.chestId,
      chest.day,
      chest.missionId,
      chest.baseStone,
      chest.upgradeAttempts,
      chest.rarity,
      chest.ruleSet ?? 1,
      chest.superUpgrade ? 1 : 0,
      chest.opened ? 1 : 0,
      chest.finalStone,
      chest.createdAt,
      chest.updatedAt,
    );
  }
  for (const craft of payload.collectionCrafts ?? []) {
    await db.runAsync(
      `INSERT INTO collection_crafts
        (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
       VALUES (?, ?, ?, ?, ?, ?)`,
      craft.craftId,
      craft.rarity,
      craft.craftIndex,
      craft.artworkId,
      craft.craftedAt,
      craft.pieceCost ?? 20,
    );
  }
  for (const spend of payload.collectionPieceSpends ?? []) {
    await db.runAsync(
      `INSERT INTO collection_piece_spends
        (spend_id, rarity, piece_cost, spent_at)
       VALUES (?, ?, ?, ?)`,
      spend.spendId,
      spend.rarity,
      spend.pieceCost,
      spend.spentAt,
    );
  }
  await db.runAsync(`
    INSERT INTO review_day_statistics (review_day, reviewed_count, correct_count, session_count)
    SELECT review_day, SUM(reviewed_count), SUM(correct_count), SUM(session_count)
    FROM device_review_day_statistics GROUP BY review_day
  `);
}

export function hasPendingAccountReplacement(): Promise<boolean> {
  return withSyncDatabase(async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM sync_state WHERE key = 'replace_pending'",
    );
    return row?.value === "1";
  });
}

export function clearPendingAccountReplacement(
  expectedGeneration: number,
): Promise<boolean> {
  return withSyncDatabase(async (db) => {
    const state = await getSyncQueueStateFromDatabase(db);
    if (state.generation !== expectedGeneration) return false;
    await db.runAsync(`
      INSERT INTO sync_state (key, value) VALUES ('replace_pending', '0')
      ON CONFLICT(key) DO UPDATE SET value = '0'
    `);
    return true;
  });
}

async function mergeSnapshotIntoDatabase(
  db: SQLiteDatabase,
  payload: SyncPayload,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const incoming of payload.words) {
      const tombstone = await db.getFirstAsync<{ deletedAt: string }>(
        "SELECT deleted_at AS deletedAt FROM sync_word_tombstones WHERE sync_id = ?",
        incoming.syncId,
      );
      const incomingLatest = maxDate(
        incoming.contentUpdatedAt,
        incoming.progressUpdatedAt,
      );
      if (tombstone && tombstone.deletedAt >= incomingLatest) continue;

      if (tombstone) {
        await db.runAsync(
          "DELETE FROM sync_word_tombstones WHERE sync_id = ?",
          incoming.syncId,
        );
      }

      const current = await db.getFirstAsync<{
        id: number;
        contentUpdatedAt: string;
        progressUpdatedAt: string;
      }>(
        `
        SELECT w.id, w.updated_at AS contentUpdatedAt, p.sync_updated_at AS progressUpdatedAt
        FROM words w JOIN word_progress p ON p.word_id = w.id
        WHERE w.sync_id = ?
      `,
        incoming.syncId,
      );

      if (!current) {
        const result = await db.runAsync(
          `
          INSERT INTO words
            (sync_id, term, normalized_term, meaning, normalized_meaning, ipa, example, note,
              created_at, updated_at, dictionary_entry_id, dictionary_sense_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          incoming.syncId,
          incoming.term,
          normalize(incoming.term),
          incoming.meaning,
          normalize(incoming.meaning),
          incoming.ipa,
          incoming.example,
          incoming.note,
          incoming.createdAt,
          incoming.contentUpdatedAt,
          incoming.dictionaryEntryId,
          incoming.dictionarySenseId,
        );
        await db.runAsync(
          `
          INSERT INTO word_progress
            (word_id, review_count, level, learned_on, next_review_on, completed,
              last_reviewed_on, frozen, sync_updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          result.lastInsertRowId,
          incoming.reviewCount,
          incoming.level,
          incoming.learnedOn,
          incoming.nextReviewOn,
          incoming.completed ? 1 : 0,
          incoming.lastReviewedOn,
          incoming.frozen ? 1 : 0,
          incoming.progressUpdatedAt,
        );
        continue;
      }

      if (incoming.contentUpdatedAt >= current.contentUpdatedAt) {
        await db.runAsync(
          `
          UPDATE words SET term = ?, normalized_term = ?, meaning = ?, normalized_meaning = ?,
            ipa = ?, example = ?, note = ?, created_at = MIN(created_at, ?), updated_at = ?,
            dictionary_entry_id = ?, dictionary_sense_id = ?
          WHERE id = ?
        `,
          incoming.term,
          normalize(incoming.term),
          incoming.meaning,
          normalize(incoming.meaning),
          incoming.ipa,
          incoming.example,
          incoming.note,
          incoming.createdAt,
          incoming.contentUpdatedAt,
          incoming.dictionaryEntryId,
          incoming.dictionarySenseId,
          current.id,
        );
      }
      if (incoming.progressUpdatedAt >= current.progressUpdatedAt) {
        await db.runAsync(
          `
          UPDATE word_progress SET review_count = ?, level = ?, learned_on = ?, next_review_on = ?,
            completed = ?, last_reviewed_on = ?, frozen = ?, sync_updated_at = ?
          WHERE word_id = ?
        `,
          incoming.reviewCount,
          incoming.level,
          incoming.learnedOn,
          incoming.nextReviewOn,
          incoming.completed ? 1 : 0,
          incoming.lastReviewedOn,
          incoming.frozen ? 1 : 0,
          incoming.progressUpdatedAt,
          current.id,
        );
      }
    }

    for (const incoming of payload.deletedWords) {
      const current = await db.getFirstAsync<{
        id: number;
        contentUpdatedAt: string;
        progressUpdatedAt: string;
      }>(
        `
        SELECT w.id, w.updated_at AS contentUpdatedAt, p.sync_updated_at AS progressUpdatedAt
        FROM words w JOIN word_progress p ON p.word_id = w.id
        WHERE w.sync_id = ?
      `,
        incoming.syncId,
      );
      const localTombstone = await db.getFirstAsync<{ deletedAt: string }>(
        "SELECT deleted_at AS deletedAt FROM sync_word_tombstones WHERE sync_id = ?",
        incoming.syncId,
      );
      const currentLatest = current
        ? maxDate(current.contentUpdatedAt, current.progressUpdatedAt)
        : "";
      if (current && currentLatest > incoming.deletedAt) continue;
      if (localTombstone && localTombstone.deletedAt > incoming.deletedAt)
        continue;
      if (current)
        await db.runAsync("DELETE FROM words WHERE id = ?", current.id);
      await db.runAsync(
        `
        INSERT INTO sync_word_tombstones (sync_id, deleted_at) VALUES (?, ?)
        ON CONFLICT(sync_id) DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at)
      `,
        incoming.syncId,
        incoming.deletedAt,
      );
    }

    for (const incoming of payload.courseProgress) {
      const current = await db.getFirstAsync<SyncCourseProgress>(
        `
        SELECT lesson_id AS lessonId, current_index AS currentIndex, stage,
          completed_at AS completedAt, updated_at AS updatedAt
        FROM course_lesson_progress WHERE lesson_id = ?
      `,
        incoming.lessonId,
      );
      const completed =
        current?.stage === "completed" || incoming.stage === "completed";
      const currentIndex = Math.max(
        current?.currentIndex ?? 0,
        incoming.currentIndex,
      );
      const selectedState =
        !current ||
        incoming.currentIndex > current.currentIndex ||
        (incoming.currentIndex === current.currentIndex &&
          incoming.updatedAt >= current.updatedAt)
          ? incoming
          : current;
      const updatedAt = maxDate(current?.updatedAt ?? "", incoming.updatedAt);
      const completedAt = current?.completedAt ?? incoming.completedAt;
      await db.runAsync(
        `
        INSERT INTO course_lesson_progress
          (lesson_id, current_index, stage, completed_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(lesson_id) DO UPDATE SET
          current_index = excluded.current_index, stage = excluded.stage,
          completed_at = excluded.completed_at, updated_at = excluded.updated_at
      `,
        incoming.lessonId,
        currentIndex,
        completed ? "completed" : selectedState.stage,
        completedAt,
        updatedAt,
      );
    }

    for (const incoming of payload.courseSelections) {
      const current = await db.getFirstAsync<{
        selected: number;
        updatedAt: string;
      }>(
        `
        SELECT selected, updated_at AS updatedAt FROM course_word_selection
        WHERE lesson_id = ? AND word_id = ?
      `,
        incoming.lessonId,
        incoming.wordId,
      );
      if (current && current.updatedAt > incoming.updatedAt) continue;
      await db.runAsync(
        `
        INSERT INTO course_word_selection (lesson_id, word_id, selected, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(lesson_id, word_id) DO UPDATE SET
          selected = excluded.selected, updated_at = excluded.updated_at
      `,
        incoming.lessonId,
        incoming.wordId,
        incoming.selected ? 1 : 0,
        incoming.updatedAt,
      );
    }

    for (const incoming of payload.reviewStats) {
      await db.runAsync(
        `
        INSERT INTO device_review_day_statistics
          (review_day, device_id, reviewed_count, correct_count, session_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(review_day, device_id) DO UPDATE SET
          reviewed_count = MAX(reviewed_count, excluded.reviewed_count),
          correct_count = MAX(correct_count, excluded.correct_count),
          session_count = MAX(session_count, excluded.session_count),
          updated_at = MAX(updated_at, excluded.updated_at)
      `,
        incoming.day,
        incoming.deviceId,
        incoming.reviewedCount,
        incoming.correctCount,
        incoming.sessionCount ?? 0,
        incoming.updatedAt,
      );
    }
    for (const session of payload.reviewSessions ?? []) {
      await db.runAsync(
        `
        INSERT OR IGNORE INTO review_session_results
          (session_id, device_id, review_day, reviewed_count, correct_count, grade, completed, created_at, active_duration_ms, max_combo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        session.sessionId,
        session.deviceId,
        session.day,
        session.reviewedCount,
        session.correctCount,
        session.grade,
        session.completed ? 1 : 0,
        session.createdAt,
        session.activeDurationMs ?? 0,
        session.maxCombo ?? 0,
      );
    }
    for (const reward of payload.reviewComboRewards ?? []) {
      await db.runAsync(
        `
        INSERT OR IGNORE INTO review_combo_rewards
          (session_id, device_id, review_day, combo_index, combo_length, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        reward.sessionId,
        reward.deviceId,
        reward.day,
        reward.comboIndex,
        reward.comboLength,
        reward.createdAt,
      );
    }
    for (const award of payload.missionAwards ?? []) {
      await db.runAsync(
        `
        INSERT OR IGNORE INTO daily_mission_awards (mission_day, mission_id, stone, completed_at)
        VALUES (?, ?, ?, ?)
      `,
        award.day,
        award.missionId,
        award.stone,
        award.completedAt,
      );
    }
    for (const incoming of payload.missionChests ?? []) {
      const currentRow = await db.getFirstAsync<
        Omit<SyncMissionChest, "opened" | "superUpgrade" | "ruleSet"> & {
          opened: number;
          superUpgrade: number;
          ruleSet: number;
        }
      >(
        `SELECT chest_id AS chestId, mission_day AS day, mission_id AS missionId,
          base_stone AS baseStone, upgrade_attempts AS upgradeAttempts, rarity,
          rule_set AS ruleSet, super_upgrade AS superUpgrade,
          opened, final_stone AS finalStone, created_at AS createdAt, updated_at AS updatedAt
         FROM mission_chests WHERE chest_id = ?`,
        incoming.chestId,
      );
      const normalizedIncoming = reopenPrematureMissionChest({
        ...incoming,
        ruleSet: incoming.ruleSet ?? 1,
        superUpgrade: incoming.superUpgrade ?? false,
      });
      const incomingRuleSet = normalizedIncoming.ruleSet ?? 1;
      const current = currentRow
        ? {
            ...currentRow,
            ruleSet:
              currentRow.ruleSet === 5
                ? (5 as const)
                : currentRow.ruleSet === 4
                  ? (4 as const)
                  : currentRow.ruleSet === 3
                    ? (3 as const)
                    : currentRow.ruleSet === 2
                      ? (2 as const)
                      : (1 as const),
            superUpgrade: Boolean(currentRow.superUpgrade),
            opened: Boolean(currentRow.opened),
          }
        : null;
      const selected = !current
        ? normalizedIncoming
        : incomingRuleSet < (current.ruleSet ?? 1)
          ? current
          : incomingRuleSet > (current.ruleSet ?? 1)
            ? current.upgradeAttempts === 0 ||
              ((current.ruleSet ?? 1) === 4 && incomingRuleSet === 5)
              ? normalizedIncoming
              : current
            : normalizedIncoming.upgradeAttempts > current.upgradeAttempts
              ? normalizedIncoming
              : normalizedIncoming.upgradeAttempts < current.upgradeAttempts
                ? current
                : Date.parse(normalizedIncoming.updatedAt) >
                    Date.parse(current.updatedAt)
                  ? normalizedIncoming
                  : Date.parse(normalizedIncoming.updatedAt) <
                      Date.parse(current.updatedAt)
                    ? current
                    : normalizedIncoming.opened && !current.opened
                      ? normalizedIncoming
                      : current;
      await db.runAsync(
        `INSERT INTO mission_chests
          (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity, rule_set, super_upgrade,
            opened, final_stone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(chest_id) DO UPDATE SET
          upgrade_attempts = excluded.upgrade_attempts, rarity = excluded.rarity,
          rule_set = excluded.rule_set, super_upgrade = excluded.super_upgrade,
          opened = excluded.opened, final_stone = excluded.final_stone,
          updated_at = excluded.updated_at`,
        selected.chestId,
        selected.day,
        selected.missionId,
        selected.baseStone,
        selected.upgradeAttempts,
        selected.rarity,
        selected.ruleSet ?? 1,
        selected.superUpgrade ? 1 : 0,
        selected.opened ? 1 : 0,
        selected.finalStone,
        selected.createdAt,
        selected.updatedAt,
      );
    }
    for (const craft of payload.collectionCrafts ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO collection_crafts
          (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
         VALUES (?, ?, ?, ?, ?, ?)`,
        craft.craftId,
        craft.rarity,
        craft.craftIndex,
        craft.artworkId,
        craft.craftedAt,
        craft.pieceCost ?? 20,
      );
    }
    for (const spend of payload.collectionPieceSpends ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO collection_piece_spends
          (spend_id, rarity, piece_cost, spent_at)
         VALUES (?, ?, ?, ?)`,
        spend.spendId,
        spend.rarity,
        spend.pieceCost,
        spend.spentAt,
      );
    }

    await db.runAsync("DELETE FROM review_day_statistics");
    await db.runAsync(`
      INSERT INTO review_day_statistics (review_day, reviewed_count, correct_count, session_count)
      SELECT review_day, SUM(reviewed_count), SUM(correct_count), SUM(session_count)
      FROM device_review_day_statistics GROUP BY review_day
    `);
  });
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function maxDate(left: string, right: string): string {
  return left >= right ? left : right;
}

export async function initializeAccountDatabase(
  accountId: string,
): Promise<void> {
  const currentScope = getDatabaseScope();
  if (currentScope === accountId) return;
  const importedFor = await AsyncStorage.getItem(LEGACY_IMPORT_KEY);

  if (currentScope === null && importedFor === null) {
    const guestSnapshot = await exportSyncSnapshot();
    await switchDatabaseScope(accountId);
    try {
      await mergeSyncSnapshot(guestSnapshot.payload);
      const hasLocalData = Object.values(guestSnapshot.payload).some(
        (items) => items.length > 0,
      );
      if (hasLocalData) await markSyncPending();
      await AsyncStorage.setItem(LEGACY_IMPORT_KEY, accountId);
    } catch (error) {
      await switchDatabaseScope(null);
      throw error;
    }
    return;
  }

  await switchDatabaseScope(accountId);
}

export function activateGuestDatabase(): Promise<void> {
  return switchDatabaseScope(null);
}
