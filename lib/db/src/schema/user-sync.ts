import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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
    sessionCount: integer("session_count").notNull().default(0),
    updatedAt: timestampColumn("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.deviceId, table.day] }),
  ],
);

export const userReviewSessionResults = pgTable(
  "user_review_session_results",
  {
    userId: text("user_id").notNull(),
    sessionId: text("session_id").notNull(),
    deviceId: text("device_id").notNull(),
    day: date("review_day", { mode: "string" }).notNull(),
    reviewedCount: integer("reviewed_count").notNull(),
    correctCount: integer("correct_count").notNull(),
    activeDurationMs: integer("active_duration_ms").notNull().default(0),
    maxCombo: integer("max_combo").notNull().default(0),
    grade: text("grade").notNull(),
    completed: boolean("completed").notNull(),
    createdAt: timestampColumn("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.sessionId] })],
);

export const userReviewComboRewards = pgTable(
  "user_review_combo_rewards",
  {
    userId: text("user_id").notNull(),
    sessionId: text("session_id").notNull(),
    deviceId: text("device_id").notNull(),
    day: date("review_day", { mode: "string" }).notNull(),
    comboIndex: integer("combo_index").notNull(),
    comboLength: integer("combo_length").notNull(),
    createdAt: timestampColumn("created_at").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.sessionId, table.comboIndex],
    }),
  ],
);

export const userDailyMissionAwards = pgTable(
  "user_daily_mission_awards",
  {
    userId: text("user_id").notNull(),
    day: date("mission_day", { mode: "string" }).notNull(),
    missionId: text("mission_id").notNull(),
    stone: integer("stone").notNull(),
    completedAt: timestampColumn("completed_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day, table.missionId] }),
  ],
);

export const userMissionChests = pgTable(
  "user_mission_chests",
  {
    userId: text("user_id").notNull(),
    chestId: text("chest_id").notNull(),
    day: date("mission_day", { mode: "string" }).notNull(),
    missionId: text("mission_id").notNull(),
    baseStone: integer("base_stone").notNull(),
    upgradeAttempts: integer("upgrade_attempts").notNull(),
    rarity: text("rarity").notNull(),
    ruleSet: integer("rule_set").notNull().default(1),
    superUpgrade: boolean("super_upgrade").notNull().default(false),
    opened: boolean("opened").notNull(),
    finalStone: integer("final_stone"),
    createdAt: timestampColumn("created_at").notNull(),
    updatedAt: timestampColumn("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.chestId] }),
    uniqueIndex("user_mission_chests_mission_idx").on(
      table.userId,
      table.day,
      table.missionId,
    ),
  ],
);

export const userCollectionCrafts = pgTable(
  "user_collection_crafts",
  {
    userId: text("user_id").notNull(),
    craftId: text("craft_id").notNull(),
    rarity: text("rarity").notNull(),
    craftIndex: integer("craft_index").notNull(),
    artworkId: text("artwork_id").notNull(),
    craftedAt: timestampColumn("crafted_at").notNull(),
    pieceCost: integer("piece_cost").notNull().default(20),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.craftId] }),
    uniqueIndex("user_collection_crafts_rarity_idx").on(
      table.userId,
      table.rarity,
      table.craftIndex,
    ),
  ],
);

export const userCollectionPieceSpends = pgTable(
  "user_collection_piece_spends",
  {
    userId: text("user_id").notNull(),
    spendId: text("spend_id").notNull(),
    rarity: text("rarity").notNull(),
    pieceCost: integer("piece_cost").notNull(),
    spentAt: timestampColumn("spent_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.spendId] })],
);

export const userMissionShopPurchases = pgTable(
  "user_mission_shop_purchases",
  {
    userId: text("user_id").notNull(),
    purchaseId: text("purchase_id").notNull(),
    day: date("shop_day", { mode: "string" }).notNull(),
    slot: integer("slot").notNull(),
    rarity: text("rarity").notNull(),
    stoneCost: integer("stone_cost").notNull(),
    discountPercent: integer("discount_percent").notNull(),
    purchasedAt: timestampColumn("purchased_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.purchaseId] })],
);

export const userStoneInvestments = pgTable(
  "user_stone_investments",
  {
    userId: text("user_id").notNull(),
    investmentId: text("investment_id").notNull(),
    plan: text("plan").notNull(),
    principal: integer("principal").notNull(),
    durationDays: integer("duration_days").notNull(),
    startDay: date("start_day", { mode: "string" }).notNull(),
    endDay: date("end_day", { mode: "string" }).notNull(),
    status: text("status").notNull(),
    settlementAmount: integer("settlement_amount"),
    lowInsuranceUsed: boolean("low_insurance_used").notNull().default(false),
    capitalInvite: text("capital_invite"),
    collateralUsed: boolean("collateral_used").notNull().default(false),
    createdAt: timestampColumn("created_at").notNull(),
    settledAt: timestampColumn("settled_at"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.investmentId] }),
  ],
);

export const userInvestmentStudyDays = pgTable(
  "user_investment_study_days",
  {
    userId: text("user_id").notNull(),
    day: date("study_day", { mode: "string" }).notNull(),
    reviewed: boolean("reviewed").notNull(),
    studiedCourse: boolean("studied_course").notNull(),
    updatedAt: timestampColumn("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);

export const userSyncRevisions = pgTable("user_sync_revisions", {
  userId: text("user_id").primaryKey(),
  revision: integer("revision").notNull().default(0),
});
