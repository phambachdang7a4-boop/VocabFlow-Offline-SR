export interface LinkingAdverbCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface LinkingAdverbCourseLesson {
  id: string;
  title: string;
  focus: string;
  questions: readonly LinkingAdverbCourseQuestion[];
}

export interface LinkingAdverbCourseEntry {
  definition: string;
  example: string;
  exampleTranslation: string;
}

export const LINKING_ADVERB_COURSE_ID = "linking-adverbs-v1";
export const LINKING_ADVERB_COURSE_TITLE = "Trạng từ liên kết";

export const LINKING_ADVERB_COURSE_ENTRIES: Readonly<
  Record<string, LinkingAdverbCourseEntry>
> = {
  however: {
    definition: "Tuy nhiên; nối hai ý tương phản.",
    example: "The test was difficult; however, Mina finished it on time.",
    exampleTranslation: "Bài kiểm tra khó; tuy nhiên, Mina đã làm xong đúng giờ.",
  },
  conversely: {
    definition: "Ngược lại; giới thiệu một ý đối lập theo chiều ngược.",
    example: "The north side is sunny; conversely, the south side stays cool.",
    exampleTranslation: "Phía bắc có nắng; ngược lại, phía nam vẫn mát.",
  },
  instead: {
    definition: "Thay vào đó; dùng một lựa chọn để thay cho lựa chọn khác.",
    example: "The bus did not arrive, so we walked instead.",
    exampleTranslation: "Xe buýt không đến, vì vậy chúng tôi đi bộ thay vào đó.",
  },
  moreover: {
    definition: "Hơn nữa; bổ sung thêm một ý hỗ trợ.",
    example: "The library is quiet; moreover, it stays open late.",
    exampleTranslation: "Thư viện yên tĩnh; hơn nữa, nơi này còn mở cửa đến muộn.",
  },
  meanwhile: {
    definition: "Trong lúc đó; nối hai việc diễn ra cùng thời điểm.",
    example: "The soup is cooling; meanwhile, set the table.",
    exampleTranslation: "Món súp đang nguội; trong lúc đó, hãy dọn bàn ăn.",
  },
  subsequently: {
    definition: "Sau đó; chỉ một việc xảy ra tiếp theo theo trình tự thời gian.",
    example: "She completed her degree and subsequently joined a research team.",
    exampleTranslation: "Cô ấy hoàn thành bằng cấp rồi sau đó gia nhập một nhóm nghiên cứu.",
  },
  therefore: {
    definition: "Vì vậy; nêu kết quả hợp lý từ ý phía trước.",
    example: "The roads were icy; therefore, school closed for the day.",
    exampleTranslation: "Đường đóng băng; vì vậy, trường học đóng cửa trong ngày.",
  },
  otherwise: {
    definition: "Nếu không thì; nêu kết quả có thể xảy ra nếu không làm việc trước đó.",
    example: "Save your work now; otherwise, you may lose it.",
    exampleTranslation: "Hãy lưu bài ngay; nếu không thì bạn có thể mất bài.",
  },
  accordingly: {
    definition: "Theo đó; chỉ cách điều chỉnh hành động cho phù hợp với tình huống.",
    example: "The opening hours changed, so we adjusted our schedule accordingly.",
    exampleTranslation: "Giờ mở cửa đã thay đổi, vì vậy chúng tôi điều chỉnh lịch trình cho phù hợp.",
  },
};

export const LINKING_ADVERB_COURSE_LESSONS: readonly LinkingAdverbCourseLesson[] =
  [
    {
      id: `${LINKING_ADVERB_COURSE_ID}-contrast`,
      title: "Đối lập và thay thế",
      focus:
        "Phân biệt ý tương phản, ý ngược chiều và một lựa chọn được dùng thay thế.",
      questions: [
        {
          term: "however",
          prompt:
            "The test was difficult; _____, Mina finished it on time.",
          choices: ["however", "instead", "meanwhile", "otherwise"],
        },
        {
          term: "conversely",
          prompt:
            "The north side is sunny; _____, the south side stays cool.",
          choices: ["conversely", "moreover", "subsequently", "therefore"],
        },
        {
          term: "instead",
          prompt: "The bus did not arrive, so we walked _____.",
          choices: ["instead", "however", "meanwhile", "accordingly"],
        },
      ],
    },
    {
      id: `${LINKING_ADVERB_COURSE_ID}-addition-time`,
      title: "Bổ sung và thời gian",
      focus:
        "Nhận ra ý bổ sung, hai việc cùng lúc và sự việc xảy ra tiếp theo.",
      questions: [
        {
          term: "moreover",
          prompt:
            "The library is quiet; _____, it stays open late.",
          choices: ["moreover", "meanwhile", "otherwise", "subsequently"],
        },
        {
          term: "meanwhile",
          prompt:
            "The soup is cooling; _____, set the table.",
          choices: ["meanwhile", "moreover", "therefore", "instead"],
        },
        {
          term: "subsequently",
          prompt:
            "She completed her degree and _____ joined a research team.",
          choices: ["subsequently", "conversely", "otherwise", "moreover"],
        },
      ],
    },
    {
      id: `${LINKING_ADVERB_COURSE_ID}-result-action`,
      title: "Kết quả và cách ứng phó",
      focus:
        "Chọn từ chỉ kết quả, cảnh báo nếu không làm, hoặc hành động cho phù hợp.",
      questions: [
        {
          term: "therefore",
          prompt: "The roads were icy; _____, school closed for the day.",
          choices: ["therefore", "instead", "meanwhile", "conversely"],
        },
        {
          term: "otherwise",
          prompt: "Save your work now; _____, you may lose it.",
          choices: ["otherwise", "moreover", "subsequently", "however"],
        },
        {
          term: "accordingly",
          prompt:
            "The opening hours changed, so we adjusted our schedule _____.",
          choices: ["accordingly", "conversely", "meanwhile", "instead"],
        },
      ],
    },
  ];
