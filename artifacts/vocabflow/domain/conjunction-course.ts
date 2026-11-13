import { LOCAL_DICTIONARY_ADDITIONS } from "./dictionary-local-additions";

export interface ConjunctionCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface ConjunctionCourseLesson {
  id: string;
  title: string;
  focus: string;
  questions: readonly ConjunctionCourseQuestion[];
}

export const CONJUNCTION_COURSE_ID = "subordinating-conjunctions-v1";
export const CONJUNCTION_COURSE_TITLE = "Liên từ trong câu";

export const CONJUNCTION_COURSE_LESSONS: readonly ConjunctionCourseLesson[] = [
  {
    id: `${CONJUNCTION_COURSE_ID}-time`,
    title: "Thời điểm và mốc thời gian",
    focus: "Phân biệt việc xảy ra ngay khi, đúng lúc, hoặc đã hoàn tất trước một mốc.",
    questions: [
      {
        term: "as soon as",
        prompt: "Text me _____ the plane lands; I will be waiting at the gate.",
        choices: ["as soon as", "by the time", "in case", "even though"],
      },
      {
        term: "by the time",
        prompt: "_____ the ambulance reached the village, the hiker was already safe.",
        choices: ["by the time", "as soon as", "provided that", "as if"],
      },
      {
        term: "just as",
        prompt: "_____ the referee blew the whistle, the striker kicked the ball.",
        choices: ["just as", "even if", "in order that", "provided that"],
      },
      {
        term: "now when",
        prompt: "_____ I hear the old school bell, I remember my first day.",
        choices: ["now when", "now that", "as though", "in case"],
      },
      {
        term: "now that",
        prompt: "_____ the repair is finished, the library can reopen.",
        choices: ["now that", "now when", "even though", "so that"],
      },
      {
        term: "as long as",
        prompt: "You may borrow my compass _____ you return it before sunset.",
        choices: ["as long as", "in case", "even though", "just as"],
      },
    ],
  },
  {
    id: `${CONJUNCTION_COURSE_ID}-conditions`,
    title: "Điều kiện và nhượng bộ",
    focus: "Nhận ra điều kiện, sự đề phòng, giả định và sự thật trái ngược.",
    questions: [
      {
        term: "in case",
        prompt: "Save the emergency number in your phone _____ you need help.",
        choices: ["in case", "if only", "even if", "so that"],
      },
      {
        term: "even if",
        prompt: "_____ it snows tonight, the airport will remain open.",
        choices: ["even if", "even though", "in case", "by the time"],
      },
      {
        term: "even though",
        prompt: "_____ the road was icy, the bus arrived on time.",
        choices: ["even though", "even if", "in case", "as if"],
      },
      {
        term: "provided that",
        prompt: "The lab will accept your sample _____ it is sealed before noon.",
        choices: ["provided that", "even though", "if only", "in case"],
      },
      {
        term: "if only",
        prompt: "_____ I had kept the receipt, I could return the headphones.",
        choices: ["if only", "even if", "as though", "by the time"],
      },
      {
        term: "as much as",
        prompt: "_____ I like the idea, I cannot approve the budget without figures.",
        choices: ["as much as", "provided that", "in case", "just as"],
      },
    ],
  },
  {
    id: `${CONJUNCTION_COURSE_ID}-meaning`,
    title: "Cách thức, lý do và mục đích",
    focus: "Dựa vào ý nghĩa của mệnh đề sau để chọn cụm chỉ so sánh, lý do hoặc mục đích.",
    questions: [
      {
        term: "as if",
        prompt: "The child spoke _____ she had met the author.",
        choices: ["as if", "so that", "in case", "provided that"],
      },
      {
        term: "as though",
        prompt: "The dog stared at the empty bowl _____ it expected another meal.",
        choices: ["as though", "as long as", "so that", "just as"],
      },
      {
        term: "as far as",
        prompt: "_____ the map shows, the footpath ends at the river.",
        choices: ["as far as", "inasmuch as", "just as", "so that"],
      },
      {
        term: "inasmuch as",
        prompt: "_____ two signatures are missing, we cannot approve the form.",
        choices: ["inasmuch as", "as though", "provided that", "by the time"],
      },
      {
        term: "in order that",
        prompt: "The guide repeated each step slowly _____ every visitor could follow.",
        choices: ["in order that", "even if", "as if", "in case"],
      },
      {
        term: "so that",
        prompt: "Nora labeled every jar _____ nobody would confuse the spices.",
        choices: ["so that", "inasmuch as", "as far as", "even though"],
      },
    ],
  },
];

export const CONJUNCTION_COURSE_ENTRY_BY_TERM = new Map(
  LOCAL_DICTIONARY_ADDITIONS.map((entry) => [entry.term, entry]),
);
