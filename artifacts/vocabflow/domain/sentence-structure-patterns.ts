export interface SentenceStructurePatternQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface SentenceStructurePatternLesson {
  id: string;
  title: string;
  focus: string;
  questions: readonly SentenceStructurePatternQuestion[];
}

export interface SentenceStructurePatternEntry {
  definition: string;
  example: string;
  exampleTranslation: string;
}

export const SENTENCE_STRUCTURE_PATTERN_COURSE_ID =
  "sentence-structure-patterns-v1";

export const SENTENCE_STRUCTURE_PATTERN_LESSONS: readonly SentenceStructurePatternLesson[] =
  [
    {
      id: `${SENTENCE_STRUCTURE_PATTERN_COURSE_ID}-paired-conjunctions`,
      title: "Cặp liên từ và cấu trúc song hành",
      focus:
        "Chọn đúng cặp liên từ và giữ hai vế song song về ngữ pháp, ý nghĩa.",
      questions: [
        {
          term: "either … or",
          prompt:
            "For this assignment, each student must _____ write an individual reflection _____ submit one joint report—not both.",
          choices: [
            "either … or",
            "neither … nor",
            "not only … but also",
            "whether … or",
          ],
        },
        {
          term: "neither … nor",
          prompt:
            "The old plan provided _____ enough time to inspect the site _____ a safe route to the entrance, so the team rejected it.",
          choices: [
            "neither … nor",
            "both … and",
            "either … or",
            "not only … but also",
          ],
        },
        {
          term: "not only … but also",
          prompt:
            "To emphasize both advantages, complete: “The reading app is _____ easy to use _____ available offline.”",
          choices: [
            "not only … but also",
            "either … or",
            "neither … nor",
            "whether … or",
          ],
        },
      ],
    },
    {
      id: `${SENTENCE_STRUCTURE_PATTERN_COURSE_ID}-condition-result`,
      title: "Điều kiện, nhượng bộ và kết quả",
      focus:
        "Phân biệt nhượng bộ bất kể mức độ, kết quả so sánh và mức độ dẫn đến kết quả.",
      questions: [
        {
          term: "no matter how",
          prompt:
            "_____ carefully the team checked the measurements, the old scale still produced inconsistent results.",
          choices: [
            "no matter how",
            "as long as",
            "provided that",
            "even though",
          ],
        },
        {
          term: "so … that",
          prompt:
            "The archive was _____ vast _____ the researchers needed several weeks to catalogue its contents.",
          choices: ["so … that", "such … that", "too … to", "as … as"],
        },
        {
          term: "the more … the more",
          prompt:
            "_____ evidence the team examined, _____ confident its conclusion became.",
          choices: [
            "the more … the more",
            "as … as",
            "so … that",
            "not only … but also",
          ],
        },
      ],
    },
    {
      id: `${SENTENCE_STRUCTURE_PATTERN_COURSE_ID}-inversion-emphasis`,
      title: "Đảo ngữ và câu nhấn mạnh",
      focus:
        "Nhận diện đảo trợ động từ sau cụm nhấn mạnh và câu chẻ làm nổi bật thông tin.",
      questions: [
        {
          term: "not only did",
          prompt:
            "_____ the revised schedule reduce delays, but it also lowered operating costs.",
          choices: [
            "not only did",
            "not only does",
            "not only has",
            "not only was",
          ],
        },
        {
          term: "no sooner … than",
          prompt:
            "_____ had the train left _____ the storm reached the station.",
          choices: [
            "no sooner … than",
            "hardly … than",
            "not until … than",
            "as soon as … than",
          ],
        },
        {
          term: "it was … that",
          prompt:
            "_____ a simple water filter _____ the research team designed, not a costly pump.",
          choices: [
            "it was … that",
            "there was … which",
            "it had … when",
            "there were … where",
          ],
        },
      ],
    },
    {
      id: `${SENTENCE_STRUCTURE_PATTERN_COURSE_ID}-reduction-substitution`,
      title: "Mệnh đề rút gọn, thay thế và lược bỏ",
      focus:
        "Dùng phân từ hoàn thành, câu đáp đồng tình và one/ones để tránh lặp.",
      questions: [
        {
          term: "having completed",
          prompt:
            "_____ the final inspection, the engineer signed the safety certificate.",
          choices: [
            "having completed",
            "completed having",
            "to have complete",
            "having been complete",
          ],
        },
        {
          term: "so do I",
          prompt:
            "“I enjoy reading historical biographies.” “_____,” Minh replied.",
          choices: ["so do I", "neither do I", "so I do", "neither I do"],
        },
        {
          term: "neither have I",
          prompt:
            "“I haven't visited the new gallery yet.” “_____,” Lan replied.",
          choices: [
            "neither have I",
            "so have I",
            "neither I have",
            "I haven't neither",
          ],
        },
        {
          term: "one / ones",
          prompt:
            "Choose the pair that replaces repeated count nouns: “the smaller _____” (one item) and “the cheaper _____” (several items).",
          choices: ["one / ones", "it / them", "this / those", "some / any"],
        },
      ],
    },
  ];

export const SENTENCE_STRUCTURE_PATTERN_ENTRIES: Readonly<
  Record<string, SentenceStructurePatternEntry>
> = {
  "either … or": {
    definition:
      "Cặp liên từ chỉ lựa chọn giữa hai khả năng. Hai vế sau either và or nên cùng dạng ngữ pháp; dùng khi chọn một phương án, không chọn cả hai.",
    example:
      "For this assignment, each student must either write an individual reflection or submit one joint report.",
    exampleTranslation:
      "Với bài tập này, mỗi học viên phải chọn viết bài cảm nhận cá nhân hoặc nộp một báo cáo chung.",
  },
  "neither … nor": {
    definition:
      "Cặp liên từ phủ định cả hai khả năng, nghĩa là “không… cũng không…”. Hai thành phần nối với nhau cần song song; động từ thường hòa hợp với chủ ngữ đứng gần nor.",
    example:
      "The old plan provided neither enough time to inspect the site nor a safe route to the entrance.",
    exampleTranslation:
      "Kế hoạch cũ không dành đủ thời gian để kiểm tra địa điểm, cũng không có lối đi an toàn tới lối vào.",
  },
  "not only … but also": {
    definition:
      "Cặp liên từ nhấn mạnh rằng cả hai đặc điểm hoặc hành động đều đúng. Giữ hai vế sau not only và but also cùng dạng; khi mở đầu mệnh đề bằng Not only, thường phải đảo trợ động từ lên trước chủ ngữ.",
    example:
      "The reading app is not only easy to use but also available offline.",
    exampleTranslation:
      "Ứng dụng đọc này không chỉ dễ sử dụng mà còn dùng được khi ngoại tuyến.",
  },
  "no matter how": {
    definition:
      "Nghĩa là “dù… đến mức nào”. Theo sau how là tính từ hoặc trạng từ rồi đến chủ ngữ và động từ; kết quả ở mệnh đề chính không đổi.",
    example:
      "No matter how carefully the team checked the measurements, the old scale produced inconsistent results.",
    exampleTranslation:
      "Dù nhóm kiểm tra các số đo cẩn thận đến đâu, chiếc cân cũ vẫn cho kết quả không nhất quán.",
  },
  "so … that": {
    definition:
      "Cấu trúc chỉ mức độ dẫn đến kết quả: so + tính từ/trạng từ + that + mệnh đề. Khác such … that, vốn thường đi với cụm danh từ.",
    example:
      "The archive was so vast that the researchers needed several weeks to catalogue its contents.",
    exampleTranslation:
      "Kho lưu trữ rộng lớn đến mức các nhà nghiên cứu cần vài tuần để lập danh mục nội dung.",
  },
  "the more … the more": {
    definition:
      "Cấu trúc so sánh kép diễn tả hai sự việc thay đổi cùng chiều: “càng… thì càng…”. Mỗi vế có the more, theo sau là danh từ, tính từ hoặc trạng từ phù hợp.",
    example:
      "The more evidence the team examined, the more confident its conclusion became.",
    exampleTranslation:
      "Nhóm càng xem xét nhiều bằng chứng thì càng tự tin vào kết luận của mình.",
  },
  "not only did": {
    definition:
      "Khi Not only đứng đầu mệnh đề ở thì quá khứ đơn, đảo did lên trước chủ ngữ và dùng động từ nguyên mẫu. Mệnh đề song hành thường tiếp tục bằng but (also).",
    example:
      "Not only did the revised schedule reduce delays, but it also lowered operating costs.",
    exampleTranslation:
      "Lịch trình sửa đổi không chỉ giảm chậm trễ mà còn hạ chi phí vận hành.",
  },
  "no sooner … than": {
    definition:
      "Cấu trúc đảo ngữ diễn tả việc thứ hai xảy ra ngay sau việc thứ nhất. Khi No sooner đứng đầu câu, dùng had + chủ ngữ + quá khứ phân từ, rồi nối mệnh đề sau bằng than.",
    example:
      "No sooner had the train left than the storm reached the station.",
    exampleTranslation:
      "Tàu vừa rời đi thì cơn bão đã tới nhà ga.",
  },
  "it was … that": {
    definition:
      "Câu chẻ It was … that nhấn mạnh một thành phần trong câu, chẳng hạn người thực hiện hoặc vật được tác động. Chọn that hoặc who phù hợp với thành phần được nhấn mạnh.",
    example:
      "It was a simple water filter that the research team designed, not a costly pump.",
    exampleTranslation:
      "Thứ nhóm nghiên cứu thiết kế là một bộ lọc nước đơn giản, chứ không phải máy bơm đắt tiền.",
  },
  "having completed": {
    definition:
      "Cụm phân từ hoàn thành having + quá khứ phân từ cho biết hành động ở mệnh đề rút gọn đã xong trước hành động ở mệnh đề chính. Chủ thể ngầm của hai mệnh đề phải giống nhau.",
    example:
      "Having completed the final inspection, the engineer signed the safety certificate.",
    exampleTranslation:
      "Sau khi hoàn tất đợt kiểm tra cuối cùng, kỹ sư đã ký giấy chứng nhận an toàn.",
  },
  "so do I": {
    definition:
      "Dùng so + trợ động từ + chủ ngữ để đồng tình với một câu khẳng định. Chọn trợ động từ theo thì và động từ của câu trước; ở đây do thay cho enjoy reading.",
    example:
      "“I enjoy reading historical biographies.” “So do I,” Minh replied.",
    exampleTranslation:
      "“Tôi thích đọc tiểu sử lịch sử.” “Tôi cũng vậy,” Minh đáp.",
  },
  "neither have I": {
    definition:
      "Dùng neither + trợ động từ + chủ ngữ để đồng tình với một câu phủ định. Trợ động từ phải khớp với thì của câu trước; hiện tại hoàn thành dùng have/has.",
    example:
      "“I haven't visited the new gallery yet.” “Neither have I,” Lan replied.",
    exampleTranslation:
      "“Tôi vẫn chưa đến phòng trưng bày mới.” “Tôi cũng chưa,” Lan đáp.",
  },
  "one / ones": {
    definition:
      "One thay cho danh từ đếm được số ít đã nhắc; ones thay cho danh từ đếm được số nhiều. Dùng chúng để tránh lặp danh từ, thường sau mạo từ hoặc tính từ.",
    example:
      "I prefer the blue one to the red ones because the blue jacket is in better condition.",
    exampleTranslation:
      "Tôi thích chiếc màu xanh hơn những chiếc màu đỏ vì chiếc áo khoác xanh còn tốt hơn.",
  },
};
