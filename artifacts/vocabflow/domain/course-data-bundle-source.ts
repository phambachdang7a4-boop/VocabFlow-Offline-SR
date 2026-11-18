import courseDictionaryIndex from "./course-dictionary-index.json";
import {
  BASIC_VOCABULARY_COURSE_ENTRIES,
  BASIC_VOCABULARY_COURSE_ID,
  BASIC_VOCABULARY_COURSE_LESSONS,
  BASIC_VOCABULARY_COURSE_TITLE,
  BASIC_VOCABULARY_COURSE_TOPIC_COUNT,
  BASIC_VOCABULARY_COURSE_WORD_COUNT,
} from "./basic-vocabulary-course";
import {
  CONJUNCTION_COURSE_ENTRY_BY_TERM,
  CONJUNCTION_COURSE_ID,
  CONJUNCTION_COURSE_LESSONS,
  CONJUNCTION_COURSE_TITLE,
} from "./conjunction-course";
import {
  IDIOM_COURSE_ENTRIES,
  IDIOM_COURSE_ID,
  IDIOM_COURSE_LESSONS,
  IDIOM_COURSE_TITLE,
  IDIOM_COURSE_WORD_COUNT,
} from "./idiom-course";
import {
  IELTS_ADVANCED_COURSE_ENTRIES,
  IELTS_ADVANCED_COURSE_ID,
  IELTS_ADVANCED_COURSE_LESSONS,
  IELTS_ADVANCED_COURSE_TITLE,
  IELTS_ADVANCED_COURSE_WORD_COUNT,
  IELTS_ADVANCED_SOURCE_LESSON_IDS_BY_LESSON,
  IELTS_ADVANCED_TOPIC_WORD_LIST,
  IELTS_PRE_SPLIT_LESSON_QUESTION_TERMS,
  IELTS_TOPIC_COURSE_ENTRIES,
  IELTS_TOPIC_COURSE_ID,
  IELTS_TOPIC_COURSE_LESSONS,
  IELTS_TOPIC_COURSE_SPELLING_CONVENTION,
  IELTS_TOPIC_COURSE_TITLE,
  IELTS_TOPIC_COURSE_WORD_COUNT,
  IELTS_TOPIC_WORD_LIST,
} from "./ielts-topic-course";
import {
  LINKING_ADVERB_COURSE_ID,
  LINKING_ADVERB_COURSE_ENTRIES,
  LINKING_ADVERB_COURSE_LESSONS,
} from "./linking-adverb-course";
import {
  OFFICE_APPS_COURSE_ENTRIES,
  OFFICE_APPS_COURSE_ID,
  OFFICE_APPS_COURSE_LESSONS,
  OFFICE_APPS_COURSE_TITLE,
  OFFICE_APPS_COURSE_TOPIC_COUNT,
  OFFICE_APPS_COURSE_WORD_COUNT,
} from "./office-apps-course";
import {
  PHRASAL_VERB_COURSE_ENTRIES,
  PHRASAL_VERB_COURSE_ID,
  PHRASAL_VERB_COURSE_LESSONS,
  PHRASAL_VERB_COURSE_TOPIC_COUNT,
  PHRASAL_VERB_COURSE_TITLE,
  PHRASAL_VERB_COURSE_WORD_COUNT,
} from "./phrasal-verb-course";
import {
  SENTENCE_STRUCTURE_PATTERN_COURSE_ID,
  SENTENCE_STRUCTURE_PATTERN_DISTRACTOR_EXPLANATIONS,
  SENTENCE_STRUCTURE_PATTERN_ENTRIES,
  SENTENCE_STRUCTURE_PATTERN_LESSONS,
} from "./sentence-structure-patterns";
import {
  TOEIC_TOPIC_COURSE_ENTRIES,
  TOEIC_TOPIC_COURSE_ID,
  TOEIC_TOPIC_COURSE_LESSONS,
  TOEIC_TOPIC_COURSE_SPELLING_CONVENTION,
  TOEIC_TOPIC_COURSE_TITLE,
  TOEIC_TOPIC_COURSE_WORD_COUNT,
  TOEIC_TOPIC_WORD_LIST,
} from "./toeic-topic-course";

const entries = <T>(value: ReadonlyMap<string, T> | Record<string, T>) =>
  value instanceof Map ? Object.fromEntries(value) : value;

export const COURSE_DATA_BUNDLE = {
  formatVersion: 1,
  dictionaryIndex: courseDictionaryIndex,
  ieltsAttemptMigration: {
    originalLessonTerms: IELTS_PRE_SPLIT_LESSON_QUESTION_TERMS,
    standardTerms: IELTS_TOPIC_COURSE_LESSONS.flatMap((lesson) =>
      lesson.questions.map((question) => question.term),
    ),
    advancedSourceLessonIds: IELTS_ADVANCED_SOURCE_LESSON_IDS_BY_LESSON,
  },
  sentenceStructureDistractorExplanations:
    SENTENCE_STRUCTURE_PATTERN_DISTRACTOR_EXPLANATIONS,
  courses: [
    {
      id: BASIC_VOCABULARY_COURSE_ID,
      title: BASIC_VOCABULARY_COURSE_TITLE,
      description: `Học ${BASIC_VOCABULARY_COURSE_WORD_COUNT} từ A1–A2 qua ${BASIC_VOCABULARY_COURSE_LESSONS.length} bài ngắn, luyện chọn từ theo nghĩa tiếng Việt.`,
      lessons: BASIC_VOCABULARY_COURSE_LESSONS,
      entriesByTerm: BASIC_VOCABULARY_COURSE_ENTRIES,
      wordCount: BASIC_VOCABULARY_COURSE_WORD_COUNT,
      topicCount: BASIC_VOCABULARY_COURSE_TOPIC_COUNT,
    },
    {
      id: IDIOM_COURSE_ID,
      title: IDIOM_COURSE_TITLE,
      description: `Học ${IDIOM_COURSE_WORD_COUNT.toLocaleString("vi-VN")} thành ngữ có nghĩa tiếng Việt từ từ điển offline, qua câu ví dụ và bài chọn cụm phù hợp.`,
      lessons: IDIOM_COURSE_LESSONS,
      entriesByTerm: Object.fromEntries(
        Object.entries(IDIOM_COURSE_ENTRIES).map(([term, entry]) => [
          term,
          { ...entry, partOfSpeech: "idiom" },
        ]),
      ),
      wordCount: IDIOM_COURSE_WORD_COUNT,
    },
    {
      id: PHRASAL_VERB_COURSE_ID,
      title: PHRASAL_VERB_COURSE_TITLE,
      description: `Học ${PHRASAL_VERB_COURSE_WORD_COUNT.toLocaleString("vi-VN")} cụm động từ đã lọc từ từ điển offline, có nghĩa và câu ví dụ; sắp xếp theo ${PHRASAL_VERB_COURSE_TOPIC_COUNT} nhóm chủ đề và động từ gốc.`,
      lessons: PHRASAL_VERB_COURSE_LESSONS,
      entriesByTerm: PHRASAL_VERB_COURSE_ENTRIES,
      wordCount: PHRASAL_VERB_COURSE_WORD_COUNT,
      topicCount: PHRASAL_VERB_COURSE_TOPIC_COUNT,
    },
    {
      id: CONJUNCTION_COURSE_ID,
      title: CONJUNCTION_COURSE_TITLE,
      description: `Tổng hợp ${CONJUNCTION_COURSE_ENTRY_BY_TERM.size + Object.keys(LINKING_ADVERB_COURSE_ENTRIES).length + Object.keys(SENTENCE_STRUCTURE_PATTERN_ENTRIES).length} mục gồm liên từ, trạng từ liên kết, mẫu giới từ và các mẫu cấu trúc câu; học qua ví dụ và bài chọn đáp án.`,
      lessons: [
        ...CONJUNCTION_COURSE_LESSONS,
        ...LINKING_ADVERB_COURSE_LESSONS,
        ...SENTENCE_STRUCTURE_PATTERN_LESSONS,
      ],
      entriesByTerm: {
        ...entries(CONJUNCTION_COURSE_ENTRY_BY_TERM),
        ...LINKING_ADVERB_COURSE_ENTRIES,
        ...SENTENCE_STRUCTURE_PATTERN_ENTRIES,
      },
      progressPrefixes: [
        CONJUNCTION_COURSE_ID,
        LINKING_ADVERB_COURSE_ID,
        SENTENCE_STRUCTURE_PATTERN_COURSE_ID,
      ],
    },
    {
      id: IELTS_TOPIC_COURSE_ID,
      title: IELTS_TOPIC_COURSE_TITLE,
      description: `Học ${IELTS_TOPIC_COURSE_WORD_COUNT.toLocaleString("vi-VN")} từ vựng phổ biến và học thuật qua ${IELTS_TOPIC_WORD_LIST.length} chủ đề IELTS. ${IELTS_TOPIC_COURSE_SPELLING_CONVENTION}`,
      lessons: IELTS_TOPIC_COURSE_LESSONS,
      entriesByTerm: IELTS_TOPIC_COURSE_ENTRIES,
      wordCount: IELTS_TOPIC_COURSE_WORD_COUNT,
      topicCount: IELTS_TOPIC_WORD_LIST.length,
    },
    {
      id: IELTS_ADVANCED_COURSE_ID,
      title: IELTS_ADVANCED_COURSE_TITLE,
      description: `Luyện ${IELTS_ADVANCED_COURSE_WORD_COUNT.toLocaleString("vi-VN")} từ học thuật khó và thuật ngữ chuyên sâu qua ${IELTS_ADVANCED_TOPIC_WORD_LIST.length} chủ đề.`,
      lessons: IELTS_ADVANCED_COURSE_LESSONS,
      entriesByTerm: IELTS_ADVANCED_COURSE_ENTRIES,
      wordCount: IELTS_ADVANCED_COURSE_WORD_COUNT,
      topicCount: IELTS_ADVANCED_TOPIC_WORD_LIST.length,
    },
    {
      id: TOEIC_TOPIC_COURSE_ID,
      title: TOEIC_TOPIC_COURSE_TITLE,
      description: `Học ${TOEIC_TOPIC_COURSE_WORD_COUNT.toLocaleString("vi-VN")} cụm từ thực tế qua ${TOEIC_TOPIC_WORD_LIST.length} chủ đề TOEIC. Mỗi cụm có nghĩa tiếng Việt, câu ví dụ và bản dịch. ${TOEIC_TOPIC_COURSE_SPELLING_CONVENTION}`,
      lessons: TOEIC_TOPIC_COURSE_LESSONS,
      entriesByTerm: TOEIC_TOPIC_COURSE_ENTRIES,
      wordCount: TOEIC_TOPIC_COURSE_WORD_COUNT,
      unitLabel: "cụm từ",
      topicCount: TOEIC_TOPIC_WORD_LIST.length,
    },
    {
      id: OFFICE_APPS_COURSE_ID,
      title: OFFICE_APPS_COURSE_TITLE,
      description: `Học ${OFFICE_APPS_COURSE_WORD_COUNT.toLocaleString("vi-VN")} từ và cụm từ thường gặp trong Excel, Word và PowerPoint, chia theo 3 ứng dụng.`,
      lessons: OFFICE_APPS_COURSE_LESSONS,
      entriesByTerm: OFFICE_APPS_COURSE_ENTRIES,
      wordCount: OFFICE_APPS_COURSE_WORD_COUNT,
      topicCount: OFFICE_APPS_COURSE_TOPIC_COUNT,
    },
  ],
} as const;
