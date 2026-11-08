import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const timestampColumn = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" });

export const userVocabulary = pgTable(
  "user_vocabulary",
  {
    userId: text("user_id").notNull(),
    syncId: text("sync_id").notNull(),
    term: text("term").notNull(),
    meaning: text("meaning").notNull(),
    ipa: text("ipa").notNull(),
    example: text("example").notNull(),
    note: text("note").notNull(),
    dictionaryEntryId: integer("dictionary_entry_id"),
    dictionarySenseId: integer("dictionary_sense_id"),
    createdAt: timestampColumn("created_at").notNull(),
    contentUpdatedAt: timestampColumn("content_updated_at").notNull(),
    reviewCount: integer("review_count").notNull(),
    level: integer("level").notNull(),
    learnedOn: date("learned_on", { mode: "string" }).notNull(),
    nextReviewOn: date("next_review_on", { mode: "string" }),
    completed: boolean("completed").notNull(),
    lastReviewedOn: date("last_reviewed_on", { mode: "string" }),
    frozen: boolean("frozen").notNull(),
    progressUpdatedAt: timestampColumn("progress_updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.syncId] })],
);

export const userWordTombstones = pgTable(
  "user_word_tombstones",
  {
    userId: text("user_id").notNull(),
    syncId: text("sync_id").notNull(),
    deletedAt: timestampColumn("deleted_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.syncId] })],
);

export const userCourseProgress = pgTable(
  "user_course_progress",
  {
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    currentIndex: integer("current_index").notNull(),
    stage: text("stage").notNull(),
    completedAt: timestampColumn("completed_at"),
    updatedAt: timestampColumn("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonId] })],
);

export const userCourseSelections = pgTable(
  "user_course_selections",
  {
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    wordId: text("word_id").notNull(),
    selected: boolean("selected").notNull(),
    updatedAt: timestampColumn("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.lessonId, table.wordId] }),
  ],
);

export const userReviewStatistics = pgTable(
  "user_review_statistics",
  {
    userId: text("user_id").notNull(),
    deviceId: text("device_id").notNull(),
    day: date("review_day", { mode: "string" }).notNull(),
    reviewedCount: integer("reviewed_count").notNull(),
    correctCount: integer("correct_count").notNull(),
    updatedAt: timestampColumn("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.deviceId, table.day] }),
  ],
);

export const userSyncRevisions = pgTable("user_sync_revisions", {
  userId: text("user_id").primaryKey(),
  revision: integer("revision").notNull().default(0),
});
