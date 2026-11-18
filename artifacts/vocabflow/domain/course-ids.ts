export const BASIC_VOCABULARY_COURSE_ID = "basic-vocabulary-a1-a2-v1";
export const IDIOM_COURSE_ID = "idioms-v1";
export const PHRASAL_VERB_COURSE_ID = "phrasal-verbs-v1";
export const CONJUNCTION_COURSE_ID = "subordinating-conjunctions-v1";
export const LINKING_ADVERB_COURSE_ID = "linking-adverbs-v1";
export const SENTENCE_STRUCTURE_PATTERN_COURSE_ID =
  "sentence-structure-patterns-v1";
export const IELTS_TOPIC_COURSE_ID = "ielts-topic-vocabulary-v1";
export const IELTS_ADVANCED_COURSE_ID = "ielts-advanced-vocabulary-v1";
export const TOEIC_TOPIC_COURSE_ID = "toeic-topic-collocations-v2";
export const OFFICE_APPS_COURSE_ID = "office-apps-vocabulary-v1";

export const COURSE_DICTIONARY_COURSES = [
  {
    id: BASIC_VOCABULARY_COURSE_ID,
    title: "Từ vựng tiếng Anh cơ bản",
  },
  { id: IDIOM_COURSE_ID, title: "Idioms" },
  { id: PHRASAL_VERB_COURSE_ID, title: "Cụm động từ thông dụng" },
  { id: CONJUNCTION_COURSE_ID, title: "Cấu trúc câu & từ nối" },
  { id: IELTS_TOPIC_COURSE_ID, title: "IELTS" },
  { id: IELTS_ADVANCED_COURSE_ID, title: "IELTS Nâng cao" },
  { id: TOEIC_TOPIC_COURSE_ID, title: "Cụm từ TOEIC theo chủ đề" },
  {
    id: OFFICE_APPS_COURSE_ID,
    title: "Tiếng Anh văn phòng: Excel, Word, PowerPoint",
  },
] as const;
