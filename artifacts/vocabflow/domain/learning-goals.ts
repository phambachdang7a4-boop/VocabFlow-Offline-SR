import { CONJUNCTION_COURSE_ID } from "./conjunction-course";
import { IDIOM_COURSE_ID } from "./idiom-course";
import { IELTS_TOPIC_COURSE_ID } from "./ielts-topic-course";
import { OFFICE_APPS_COURSE_ID } from "./office-apps-course";
import { PHRASAL_VERB_COURSE_ID } from "./phrasal-verb-course";
import { TOEIC_TOPIC_COURSE_ID } from "./toeic-topic-course";

export type LearningGoalId =
  | "ielts-reading"
  | "toeic"
  | "phrasal-verbs"
  | "idioms"
  | "sentence-structures"
  | "office-english";

export type LearningGoalOption = {
  id: LearningGoalId;
  title: string;
  description: string;
  courseId: string;
  icon: "globe" | "briefcase" | "message-circle" | "book-open" | "git-merge" | "monitor";
};

export const LEARNING_GOAL_OPTIONS: readonly LearningGoalOption[] = [
  {
    id: "ielts-reading",
    title: "IELTS Reading",
    description: "Từ vựng theo chủ đề và ngữ cảnh đọc",
    courseId: IELTS_TOPIC_COURSE_ID,
    icon: "globe",
  },
  {
    id: "toeic",
    title: "TOEIC",
    description: "Cụm từ thường gặp trong công việc",
    courseId: TOEIC_TOPIC_COURSE_ID,
    icon: "briefcase",
  },
  {
    id: "phrasal-verbs",
    title: "Cụm động từ",
    description: "Cụm từ thực tế theo nhóm chủ đề",
    courseId: PHRASAL_VERB_COURSE_ID,
    icon: "message-circle",
  },
  {
    id: "idioms",
    title: "Idioms",
    description: "Thành ngữ qua câu ví dụ và hội thoại",
    courseId: IDIOM_COURSE_ID,
    icon: "book-open",
  },
  {
    id: "sentence-structures",
    title: "Cấu trúc câu",
    description: "Liên từ, giới từ và mẫu câu ít gặp",
    courseId: CONJUNCTION_COURSE_ID,
    icon: "git-merge",
  },
  {
    id: "office-english",
    title: "Tiếng Anh văn phòng",
    description: "Từ và cụm từ trong Excel, Word, PowerPoint",
    courseId: OFFICE_APPS_COURSE_ID,
    icon: "monitor",
  },
];

export function isLearningGoalId(value: unknown): value is LearningGoalId {
  return LEARNING_GOAL_OPTIONS.some((option) => option.id === value);
}

export function getLearningGoalOption(
  value: unknown,
): LearningGoalOption | null {
  return LEARNING_GOAL_OPTIONS.find((option) => option.id === value) ?? null;
}
