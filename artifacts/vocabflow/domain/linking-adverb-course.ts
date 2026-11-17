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
  accordingly: {
    definition:
      "Theo đó; điều chỉnh hành động cho phù hợp với tình huống. Ghi chú: Khác therefore/consequently, vốn chỉ kết quả hoặc kết luận; accordingly nhấn mạnh cách ta thay đổi cho thích hợp.",
    example:
      "The opening hours changed, so we adjusted our schedule accordingly.",
    exampleTranslation:
      "Giờ mở cửa đã thay đổi, vì vậy chúng tôi điều chỉnh lịch trình cho phù hợp.",
  },
  consequently: {
    definition:
      "Do đó; nêu kết quả trực tiếp của sự việc trước. Ghi chú: Gần nghĩa với therefore/hence; consequently thường nhấn mạnh hệ quả trực tiếp, còn therefore thường trình bày kết luận.",
    example:
      "Leo left his passport at home; consequently, he could not board the flight.",
    exampleTranslation:
      "Leo để quên hộ chiếu ở nhà; vì vậy, cậu ấy không thể lên máy bay.",
  },
  hence: {
    definition:
      "Vì vậy; nối một lý do với kết luận hoặc kết quả. Ghi chú: Gần nghĩa với therefore/consequently; hence thường ngắn gọn, hơi trang trọng. Khác instead, vốn chỉ phương án thay thế.",
    example:
      "The bridge is closed; hence, we must take another route.",
    exampleTranslation:
      "Cây cầu đã đóng; vì vậy, chúng ta phải đi đường khác.",
  },
  therefore: {
    definition:
      "Do đó; đưa ra kết luận hợp lý từ thông tin trước. Ghi chú: Gần nghĩa với hence/consequently; therefore thường nhấn mạnh suy luận hoặc kết luận, còn accordingly nhấn mạnh hành động được điều chỉnh.",
    example:
      "Every safety test passed; therefore, the device is ready to ship.",
    exampleTranslation:
      "Mọi bài kiểm tra an toàn đều đạt; vì vậy, thiết bị đã sẵn sàng để giao.",
  },
  then: {
    definition:
      "Sau đó; chỉ bước tiếp theo trong một trình tự. Ghi chú: Khác meanwhile, chỉ hai việc diễn ra đồng thời; khác finally, nhấn mạnh bước cuối của cả chuỗi.",
    example: "Label each jar; then, place it on the correct shelf.",
    exampleTranslation:
      "Hãy dán nhãn từng lọ; sau đó, đặt lọ lên đúng kệ.",
  },
  finally: {
    definition:
      "Cuối cùng; chỉ bước cuối hoặc kết quả ở cuối một chuỗi. Ghi chú: Then chỉ bước tiếp theo, không nhất thiết là bước cuối.",
    example:
      "We checked every page and finally found the missing signature.",
    exampleTranslation:
      "Chúng tôi kiểm tra từng trang và cuối cùng tìm thấy chữ ký còn thiếu.",
  },
  furthermore: {
    definition:
      "Hơn nữa; bổ sung một lý do hoặc thông tin hỗ trợ. Ghi chú: Gần như đồng nghĩa với moreover; hai từ thường thay được. Cả hai thêm ý hỗ trợ, không nêu kết quả như therefore.",
    example:
      "The bike is affordable; furthermore, its battery lasts all day.",
    exampleTranslation:
      "Chiếc xe đạp có giá phải chăng; hơn nữa, pin dùng được cả ngày.",
  },
  moreover: {
    definition:
      "Hơn nữa; thêm một ý hỗ trợ cho nhận định trước. Ghi chú: Gần như đồng nghĩa với furthermore; moreover đôi khi nhấn mạnh ý bổ sung hơn, nhưng khác biệt này không cố định.",
    example:
      "The museum is free; moreover, it is open every Sunday.",
    exampleTranslation:
      "Bảo tàng miễn phí; hơn nữa, nơi này mở cửa vào mỗi Chủ nhật.",
  },
  meanwhile: {
    definition:
      "Trong lúc đó; hai việc diễn ra đồng thời. Ghi chú: Khác then, vốn nêu việc xảy ra tiếp theo; meanwhile thường mang nghĩa “trong cùng khoảng thời gian”.",
    example:
      "The rice is cooking; meanwhile, chop the vegetables.",
    exampleTranslation:
      "Cơm đang nấu; trong lúc đó, hãy cắt rau củ.",
  },
  however: {
    definition:
      "Tuy nhiên; nêu một ý trái với điều người đọc có thể mong đợi. Ghi chú: Gần nghĩa với nevertheless/nonetheless; however thường báo hiệu sự tương phản, còn hai từ kia nhấn mạnh kết quả vẫn xảy ra bất chấp trở ngại.",
    example:
      "The forecast promised sunshine; however, it rained all afternoon.",
    exampleTranslation:
      "Dự báo nói trời sẽ nắng; tuy nhiên, trời mưa suốt buổi chiều.",
  },
  nevertheless: {
    definition:
      "Dù vậy; nhấn mạnh kết quả vẫn xảy ra bất chấp trở ngại. Ghi chú: Gần như đồng nghĩa với nonetheless; cả hai cũng gần nghĩa với however, nhưng thường nhấn mạnh sự việc vẫn tiếp diễn dù có trở ngại.",
    example:
      "The path was steep; nevertheless, the hikers continued to the summit.",
    exampleTranslation:
      "Con đường dốc; dù vậy, nhóm đi bộ vẫn tiếp tục lên đỉnh.",
  },
  nonetheless: {
    definition:
      "Mặc dù thế; cho biết sự việc vẫn xảy ra dù có trở ngại. Ghi chú: Gần như đồng nghĩa với nevertheless; khác however ở sắc thái nhấn mạnh kết quả bất chấp trở ngại, dù trong nhiều câu có thể thay nhau.",
    example:
      "The instructions looked complicated; nonetheless, Ava built the desk.",
    exampleTranslation:
      "Hướng dẫn trông có vẻ phức tạp; mặc dù thế, Ava vẫn lắp được chiếc bàn.",
  },
  instead: {
    definition:
      "Thay vào đó; chọn một hành động khác để thay thế. Ghi chú: Khác rather trong câu sửa lại nhận định (“không phải X, mà đúng hơn là Y”); instead nêu phương án thay thế.",
    example:
      "The café had no tables, so we ordered takeaway instead.",
    exampleTranslation:
      "Quán cà phê không còn bàn, vì vậy chúng tôi gọi đồ mang đi thay vào đó.",
  },
  rather: {
    definition:
      "Đúng hơn là; sửa lại hoặc nói chính xác hơn ý vừa nêu. Ghi chú: Khác instead, vốn thay một lựa chọn/hành động bằng lựa chọn khác; rather thường hiệu chỉnh cách diễn đạt hoặc nhận định trước.",
    example:
      "The problem was not the price; rather, the delivery was too slow.",
    exampleTranslation:
      "Vấn đề không nằm ở giá; đúng hơn là khâu giao hàng quá chậm.",
  },
  indeed: {
    definition:
      "Quả thật; nhấn mạnh hoặc củng cố ý vừa nêu, thường đưa bằng chứng cụ thể. Ghi chú: Khác moreover/furthermore, vốn thêm một ý mới thay vì xác nhận hoặc củng cố ý trước.",
    example:
      "The hike was demanding; indeed, we climbed for six hours.",
    exampleTranslation:
      "Chuyến đi bộ thật vất vả; quả thật, chúng tôi đã leo suốt sáu tiếng.",
  },
  likewise: {
    definition:
      "Tương tự như vậy; nối một trường hợp có cách làm giống trường hợp trước. Ghi chú: Gần nghĩa với similarly; likewise thường nhấn mạnh hành động tương ứng hoặc “cũng vậy”, nhưng nhiều ngữ cảnh có thể thay nhau.",
    example:
      "Mai volunteered at the shelter; likewise, her brother gave up weekends to help.",
    exampleTranslation:
      "Mai tình nguyện ở mái ấm; tương tự, anh trai cô cũng dành cuối tuần để giúp đỡ.",
  },
  similarly: {
    definition:
      "Tương tự; chỉ ra rằng trường hợp tiếp theo có điểm giống trường hợp trước. Ghi chú: Gần nghĩa với likewise; similarly thường giới thiệu phép so sánh giữa hai trường hợp, còn likewise hay nhấn mạnh hành động tương ứng.",
    example:
      "The first class improved its scores. Similarly, the second class made progress.",
    exampleTranslation:
      "Lớp đầu tiên cải thiện điểm số. Tương tự, lớp thứ hai cũng tiến bộ.",
  },
};

export const LINKING_ADVERB_COURSE_LESSONS: readonly LinkingAdverbCourseLesson[] =
  [
    {
      id: `${LINKING_ADVERB_COURSE_ID}-contrast`,
      title: "Nguyên nhân, kết quả và trình tự",
      focus:
        "Nhận ra cách điều chỉnh theo tình huống, kết quả của một nguyên nhân và bước tiếp theo.",
      questions: [
        {
          term: "accordingly",
          prompt:
            "The opening hours changed, so we adjusted our schedule _____.",
          choices: ["accordingly", "however", "meanwhile", "instead"],
        },
        {
          term: "consequently",
          prompt:
            "Leo left his passport at home; _____, he could not board the flight.",
          choices: ["consequently", "meanwhile", "nonetheless", "rather"],
        },
        {
          term: "hence",
          prompt:
            "The bridge is closed; _____, we must take another route.",
          choices: ["hence", "indeed", "similarly", "meanwhile"],
        },
        {
          term: "therefore",
          prompt:
            "Every safety test passed; _____, the device is ready to ship.",
          choices: ["therefore", "however", "likewise", "rather"],
        },
        {
          term: "then",
          prompt:
            "Finish labeling each jar first; _____, place it on the correct shelf.",
          choices: ["then", "however", "indeed", "meanwhile"],
        },
        {
          term: "finally",
          prompt:
            "The signature was hidden on the final page; after an hour of checking every sheet, we _____ found it at last.",
          choices: ["finally", "meanwhile", "similarly", "instead"],
        },
      ],
    },
    {
      id: `${LINKING_ADVERB_COURSE_ID}-addition-time`,
      title: "Bổ sung và so sánh",
      focus:
        "Phân biệt ý bổ sung, sự nhấn mạnh và hai trường hợp có điểm tương đồng.",
      questions: [
        {
          term: "furthermore",
          prompt:
            "The bike is affordable; _____, its battery lasts all day.",
          choices: ["furthermore", "instead", "then", "hence"],
        },
        {
          term: "moreover",
          prompt:
            "The museum is free; _____, it is open every Sunday.",
          choices: ["moreover", "meanwhile", "rather", "therefore"],
        },
        {
          term: "meanwhile",
          prompt:
            "The rice is cooking; _____, chop the vegetables while it simmers.",
          choices: ["meanwhile", "rather", "however", "indeed"],
        },
        {
          term: "indeed",
          prompt:
            "The hike was demanding; _____, we climbed for six hours without a break, confirming how strenuous it was.",
          choices: ["indeed", "instead", "accordingly", "similarly"],
        },
        {
          term: "likewise",
          prompt:
            "Mai volunteered at the shelter; _____, her brother gave up weekends to help.",
          choices: ["likewise", "then", "however", "consequently"],
        },
        {
          term: "similarly",
          prompt:
            "The first class improved its scores. _____, the second class made progress.",
          choices: ["similarly", "meanwhile", "instead", "therefore"],
        },
      ],
    },
    {
      id: `${LINKING_ADVERB_COURSE_ID}-result-action`,
      title: "Đối lập, nhượng bộ và thay thế",
      focus:
        "Phân biệt ý trái với dự đoán, kết quả bất chấp trở ngại, và cách sửa hoặc thay thế ý.",
      questions: [
        {
          term: "however",
          prompt:
            "The forecast promised sunshine; _____, it rained all afternoon.",
          choices: ["however", "accordingly", "likewise", "indeed"],
        },
        {
          term: "nevertheless",
          prompt:
            "The path was steep; _____, the hikers continued to the summit.",
          choices: ["nevertheless", "hence", "meanwhile", "therefore"],
        },
        {
          term: "nonetheless",
          prompt:
            "The instructions looked complicated; _____, Ava built the desk.",
          choices: ["nonetheless", "moreover", "then", "accordingly"],
        },
        {
          term: "instead",
          prompt:
            "The café had no tables, so we ordered takeaway _____ of waiting for a seat.",
          choices: ["instead", "meanwhile", "consequently", "indeed"],
        },
        {
          term: "rather",
          prompt:
            "The problem was not the price; _____, the delivery was too slow.",
          choices: ["rather", "accordingly", "finally", "likewise"],
        },
      ],
    },
  ];
