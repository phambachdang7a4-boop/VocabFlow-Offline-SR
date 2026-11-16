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
export const CONJUNCTION_COURSE_TITLE = "Cấu trúc câu & từ nối";

export const CONJUNCTION_COURSE_LESSONS: readonly ConjunctionCourseLesson[] = [
  {
    id: `${CONJUNCTION_COURSE_ID}-time`,
    title: "Thời điểm và mốc thời gian",
    focus: "Phân biệt việc xảy ra ngay khi, đúng lúc, hoặc đã hoàn tất trước một mốc.",
    questions: [
      {
        term: "as soon as",
        prompt:
          "Don't wait for the plane to reach the gate; text me immediately _____ you see its landing lights turn on.",
        choices: ["as soon as", "even though", "provided that", "in order that"],
      },
      {
        term: "by the time",
        prompt:
          "The hiker had been safe for two hours _____ the ambulance finally reached the village.",
        choices: ["by the time", "in case", "even if", "so that"],
      },
      {
        term: "just as",
        prompt:
          "The striker kicked the ball _____ the referee blew the whistle—at exactly the same moment.",
        choices: ["just as", "even if", "in order that", "provided that"],
      },
      {
        term: "now when",
        prompt:
          "_____ I hear the old school bell now, it takes me straight back to my first day.",
        choices: ["now when", "in case", "provided that", "so that"],
      },
      {
        term: "now that",
        prompt:
          "_____ the final repair is complete, the library can reopen; the safety issue that forced it to close is gone.",
        choices: ["now that", "in case", "as if", "even if"],
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
        prompt:
          "The snow forecast is uncertain. _____ it snows tonight, the airport will remain open.",
        choices: ["even if", "even though", "in case", "by the time"],
      },
      {
        term: "even though",
        prompt:
          "_____ the road was in fact icy, the bus still arrived on time.",
        choices: ["even though", "even if", "in case", "as if"],
      },
      {
        term: "provided that",
        prompt: "The lab will accept your sample _____ it is sealed before noon.",
        choices: ["provided that", "even though", "if only", "in case"],
      },
      {
        term: "if only",
        prompt:
          "_____ I had kept the receipt! I could have returned these headphones yesterday.",
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
        prompt:
          "Although the child had just met the author, she spoke _____ she had known her for years.",
        choices: ["as if", "so that", "in case", "provided that"],
      },
      {
        term: "as though",
        prompt: "The dog stared at the empty bowl _____ it were still full.",
        choices: ["as though", "as long as", "so that", "provided that"],
      },
      {
        term: "as far as",
        prompt:
          "_____ I can tell from the map, the footpath ends at the river; I have not checked beyond it.",
        choices: ["as far as", "provided that", "in order that", "even though"],
      },
      {
        term: "inasmuch as",
        prompt:
          "The form cannot be approved _____ it lacks two required signatures; that is the reason it must be returned.",
        choices: ["inasmuch as", "as though", "by the time", "so that"],
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

const CONJUNCTION_COMPARISON_NOTES: Readonly<Record<string, string>> = {
  "as if":
    "Gần nghĩa với as though; thường thay được khi nói về vẻ ngoài hoặc tình huống tưởng tượng. As if thông dụng hơn; cả hai không mang nghĩa điều kiện.",
  "as long as":
    "Gần nghĩa với provided that khi nêu điều kiện; provided that trang trọng hơn. As long as còn có thể chỉ khoảng thời gian kéo dài.",
  "as much as":
    "Ở đầu mệnh đề, cụm này nhượng bộ và gần nghĩa với although. Trong cấu trúc chỉ số lượng, as much as lại có nghĩa “nhiều bằng”.",
  "as soon as":
    "Nhấn mạnh việc sau xảy ra ngay khi mốc vừa đến. Khác by the time (đến mốc thì việc khác đã xảy ra/hoàn tất) và just as (hai việc đồng thời).",
  "as far as":
    "Trong as far as I know/can tell, cụm này giới hạn thông tin. Khác just as (“đúng như/đúng lúc”) và as long as (“miễn là”).",
  "as though":
    "Gần nghĩa với as if; thường thay được khi nói “như thể”. As though đôi khi trang trọng hoặc văn viết hơn; không mang nghĩa điều kiện.",
  "by the time":
    "Nêu mốc mà khi tới đó việc khác đã xảy ra hoặc hoàn tất; thường đi với thì hoàn thành. Khác as soon as (“ngay khi”).",
  "inasmuch as":
    "Gần nghĩa với because/since khi nêu lý do, nhưng trang trọng hơn; đôi khi có nghĩa “trong phạm vi mà”. Không đồng nghĩa provided that (điều kiện).",
  "in order that":
    "Gần nghĩa với so that khi nêu mục đích; in order that trang trọng và nhấn mạnh mục đích hơn, thường đi với can/could/may/might.",
  "in case":
    "Nêu việc chuẩn bị trước để phòng một khả năng xảy ra; khác if, vốn nêu điều kiện để hành động xảy ra.",
  "now that":
    "Gần nghĩa với since/because khi tình huống mới tạo ra lý do. Khác now when (nêu thời điểm hoặc việc lặp lại).",
  "now when":
    "Nêu thời điểm hoặc việc lặp lại “giờ đây, mỗi khi”; khác now that (“vì giờ đây ...”). Cách dùng này ít phổ biến hơn when/whenever.",
  "even if":
    "Nêu điều kiện giả định mà kết quả vẫn giữ nguyên; khác even though, dùng khi sự việc được xem là có thật.",
  "even though":
    "Nhượng bộ một sự việc có thật; khác even if, thường nói về khả năng hoặc điều kiện giả định.",
  "provided that":
    "Gần nghĩa với as long as khi nêu điều kiện; provided that thường trang trọng và nhấn mạnh điều kiện rõ ràng.",
  "if only":
    "Mở đầu lời ước hoặc tiếc nuối; khác only if (“chỉ nếu”), vốn nêu điều kiện.",
  "just as":
    "Trong ví dụ này, just as chỉ thời điểm trùng nhau; khác as soon as (ngay sau mốc) và as if/as though (“như thể”).",
  "so that":
    "Gần nghĩa với in order that khi nêu mục đích; so that thông dụng hơn. Ở ngữ cảnh khác, cụm này cũng có thể nêu kết quả.",
};

const CONJUNCTION_COURSE_EXAMPLE_OVERRIDES: Readonly<
  Record<string, { example: string; exampleTranslation: string }>
> = {
  "as if": {
    example:
      "Although the child had just met the author, she spoke as if she had known her for years.",
    exampleTranslation:
      "Dù chỉ vừa gặp tác giả, đứa trẻ vẫn nói như thể đã quen bà ấy nhiều năm.",
  },
  "as though": {
    example: "The dog stared at the empty bowl as though it were still full.",
    exampleTranslation:
      "Con chó nhìn chằm chằm vào chiếc bát trống như thể bát vẫn còn đầy.",
  },
  "as far as": {
    example:
      "As far as I can tell from the map, the footpath ends at the river.",
    exampleTranslation:
      "Theo như tôi có thể nhận định từ bản đồ, lối mòn kết thúc ở con sông.",
  },
  "as soon as": {
    example:
      "Text me as soon as you see the plane's landing lights; do not wait for it to reach the gate.",
    exampleTranslation:
      "Hãy nhắn cho tôi ngay khi thấy đèn hạ cánh của máy bay; đừng đợi máy bay tới cổng.",
  },
  "by the time": {
    example:
      "The hiker had been safe for two hours by the time the ambulance reached the village.",
    exampleTranslation:
      "Người đi bộ đường dài đã an toàn được hai tiếng khi xe cứu thương tới làng.",
  },
  "even if": {
    example:
      "The forecast is uncertain. Even if it snows tonight, the airport will remain open.",
    exampleTranslation:
      "Dự báo chưa chắc chắn. Ngay cả khi tối nay có tuyết, sân bay vẫn mở cửa.",
  },
  "even though": {
    example:
      "Even though the road was in fact icy, the bus still arrived on time.",
    exampleTranslation:
      "Mặc dù đường thực sự đóng băng, xe buýt vẫn đến đúng giờ.",
  },
  "if only": {
    example:
      "If only I had kept the receipt! I could have returned these headphones yesterday.",
    exampleTranslation:
      "Giá mà tôi đã giữ hóa đơn! Hôm qua tôi đã có thể trả lại chiếc tai nghe này.",
  },
  "just as": {
    example:
      "The striker kicked the ball just as the referee blew the whistle—at precisely the same moment.",
    exampleTranslation:
      "Tiền đạo sút bóng đúng lúc trọng tài thổi còi—chính xác cùng một thời điểm.",
  },
  "now that": {
    example:
      "Now that the final repair is complete, the library can reopen; the safety issue that forced it to close is gone.",
    exampleTranslation:
      "Giờ việc sửa chữa cuối cùng đã xong, thư viện có thể mở cửa lại vì vấn đề an toàn khiến nơi này phải đóng cửa đã được xử lý.",
  },
  "now when": {
    example:
      "I used to ignore the old school bell, but now when I hear it, I remember my first day.",
    exampleTranslation:
      "Trước đây tôi thường bỏ qua tiếng chuông trường cũ, nhưng giờ mỗi khi nghe thấy, tôi lại nhớ ngày đầu tiên đi học.",
  },
};

export const CONJUNCTION_COURSE_ENTRY_BY_TERM = new Map(
  LOCAL_DICTIONARY_ADDITIONS.map((entry) => {
    const comparisonNote = CONJUNCTION_COMPARISON_NOTES[entry.term];
    if (!comparisonNote) {
      throw new Error(`Thiếu ghi chú so sánh cho liên từ "${entry.term}".`);
    }
    return [
      entry.term,
      {
        ...entry,
        ...(CONJUNCTION_COURSE_EXAMPLE_OVERRIDES[entry.term] ?? {}),
        definition: `${entry.definition} Ghi chú: ${comparisonNote}`,
      },
    ];
  }),
);
