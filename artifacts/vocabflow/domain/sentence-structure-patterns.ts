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
            "The old plan provided _____ enough time to inspect the site _____ a safe route to the entrance; it lacked both, so the team rejected it.",
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
            "In last year's pilot, _____ the revised schedule reduce delays, but it also lowered operating costs.",
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
            "“I enjoy reading historical biographies.” “_____,” Minh replied, agreeing that he enjoyed them too.",
          choices: ["so do I", "neither do I", "so have I", "neither I do"],
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
    {
      id: `${SENTENCE_STRUCTURE_PATTERN_COURSE_ID}-preposition-patterns`,
      title: "Giới từ trong cụm thường gặp",
      focus:
        "Nhận diện cụm giới từ thông dụng và giới từ đi kèm động từ, tính từ, danh từ.",
      questions: [
        {
          term: "in advance",
          prompt:
            "To secure a seat, please register _____ rather than waiting until the day of the event.",
          choices: ["in advance", "at advance", "on advance", "by advance"],
        },
        {
          term: "at risk of",
          prompt:
            "Without urgent repairs, the old bridge will be _____ collapse.",
          choices: ["at risk of", "in risk of", "on risk of", "at risk to"],
        },
        {
          term: "on behalf of",
          prompt:
            "I am writing _____ the residents' committee to thank the volunteers.",
          choices: [
            "on behalf of",
            "at behalf of",
            "by behalf of",
            "on behalf to",
          ],
        },
        {
          term: "rely on",
          prompt:
            "During the field study, the researchers had to _____ local guides for accurate directions.",
          choices: ["rely on", "rely to", "rely for", "rely with"],
        },
        {
          term: "apologize for",
          prompt:
            "The supplier chose to _____ the delay and offer a full refund.",
          choices: [
            "apologize for",
            "apologize of",
            "apologize with",
            "apologize from",
          ],
        },
        {
          term: "be responsible for",
          prompt:
            "As project lead, Mai will _____ checking each citation before publication.",
          choices: [
            "be responsible for",
            "be responsible of",
            "be responsible with",
            "be responsible from",
          ],
        },
        {
          term: "be familiar with",
          prompt:
            "Please read the guide so you can _____ the new application process.",
          choices: [
            "be familiar with",
            "be familiar on",
            "be familiar from",
            "be familiar over",
          ],
        },
        {
          term: "access to",
          prompt:
            "Every student should have _____ reliable internet during the course.",
          choices: ["access to", "access for", "access with", "access on"],
        },
        {
          term: "prevent someone from",
          prompt:
            "A clear warning can _____ using the equipment incorrectly.",
          choices: [
            "prevent someone from",
            "prevent someone to",
            "prevent someone of",
            "prevent someone with",
          ],
        },
        {
          term: "take part in",
          prompt:
            "Several local schools will _____ the regional science fair.",
          choices: [
            "take part in",
            "take part at",
            "take part of",
            "take part by",
          ],
        },
      ],
    },
    {
      id: `${SENTENCE_STRUCTURE_PATTERN_COURSE_ID}-in-on-at`,
      title: "Phân biệt in, on và at",
      focus:
        "Chọn in, on hoặc at theo khoảng thời gian, ngày cụ thể, không gian, bề mặt, địa điểm và cụm cố định.",
      questions: [
        {
          term: "in September",
          prompt:
            "The new term begins _____, at the start of the autumn semester.",
          choices: [
            "in September",
            "on September",
            "at September",
            "in the September",
          ],
        },
        {
          term: "on 2 June",
          prompt:
            "The conference opens _____, the second day of the month.",
          choices: [
            "on 2 June",
            "in 2 June",
            "at 2 June",
            "on the 2 June",
          ],
        },
        {
          term: "at 8:30 a.m.",
          prompt:
            "The guided tour starts _____, so please arrive ten minutes early.",
          choices: [
            "at 8:30 a.m.",
            "in 8:30 a.m.",
            "on 8:30 a.m.",
            "on the 8:30 a.m.",
          ],
        },
        {
          term: "in the morning",
          prompt:
            "The bakery is open _____, from sunrise until just before noon.",
          choices: [
            "in the morning",
            "on the morning",
            "at the morning",
            "in morning",
          ],
        },
        {
          term: "at night",
          prompt:
            "Unlike during the day, the park closes to visitors _____.",
          choices: ["at night", "in night", "on night", "at the night"],
        },
        {
          term: "in a small drawer",
          prompt:
            "The spare key is kept _____ in the kitchen, not left out in the open.",
          choices: [
            "in a small drawer",
            "on a small drawer",
            "at a small drawer",
            "over a small drawer",
          ],
        },
        {
          term: "on the desk",
          prompt:
            "Leave the signed form _____, resting on the desk's top surface rather than inside a drawer.",
          choices: [
            "on the desk",
            "in the desk",
            "at the desk",
            "under the desk",
          ],
        },
        {
          term: "at the main entrance",
          prompt:
            "I'll wait for you _____, outside the building; then we can go inside together.",
          choices: [
            "at the main entrance",
            "in the main entrance",
            "on the main entrance",
            "through the main entrance",
          ],
        },
        {
          term: "in Singapore",
          prompt:
            "They have lived _____ since 2020, though they grew up in Canada.",
          choices: [
            "in Singapore",
            "on Singapore",
            "at Singapore",
            "through Singapore",
          ],
        },
        {
          term: "believe in",
          prompt:
            "Many people _____ the value of learning a little every day.",
          choices: ["believe in", "believe on", "believe at", "believe for"],
        },
        {
          term: "focus on",
          prompt:
            "The report should _____ the causes of the delay, not assign blame.",
          choices: ["focus on", "focus in", "focus at", "focus for"],
        },
        {
          term: "good at",
          prompt:
            "My sister is _____ solving logic puzzles, even under pressure.",
          choices: ["good at", "good in", "good on", "good for"],
        },
        {
          term: "interested in",
          prompt:
            "Tariq is _____ marine biology and reads about it every evening.",
          choices: [
            "interested in",
            "interested on",
            "interested at",
            "interested for",
          ],
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
  "in advance": {
    definition:
      "Cụm trạng ngữ nghĩa là “trước” hoặc “trước thời điểm cần thiết”, thường dùng khi chuẩn bị, đặt chỗ hoặc thông báo sớm.",
    example:
      "To secure a seat, please register in advance rather than waiting until the day of the event.",
    exampleTranslation:
      "Để giữ chỗ, vui lòng đăng ký trước thay vì chờ đến ngày diễn ra sự kiện.",
  },
  "at risk of": {
    definition:
      "Cụm at risk of + danh từ hoặc V-ing diễn tả nguy cơ gặp phải điều không mong muốn.",
    example:
      "Without urgent repairs, the old bridge is at risk of collapse.",
    exampleTranslation:
      "Nếu không được sửa chữa khẩn cấp, cây cầu cũ có nguy cơ sập.",
  },
  "on behalf of": {
    definition:
      "Cụm giới từ nghĩa là “thay mặt cho”, dùng khi phát biểu hoặc hành động đại diện cho một người hay nhóm.",
    example:
      "I am writing on behalf of the residents' committee to thank the volunteers.",
    exampleTranslation:
      "Tôi viết thư thay mặt ban đại diện cư dân để cảm ơn các tình nguyện viên.",
  },
  "rely on": {
    definition:
      "Rely on + người/vật nghĩa là dựa vào hoặc tin cậy ai, điều gì; giới từ on đi cùng động từ rely.",
    example:
      "During the field study, the researchers had to rely on local guides for accurate directions.",
    exampleTranslation:
      "Trong chuyến khảo sát thực địa, các nhà nghiên cứu phải dựa vào hướng dẫn viên địa phương để có chỉ đường chính xác.",
  },
  "apologize for": {
    definition:
      "Apologize for + danh từ hoặc V-ing dùng để xin lỗi về điều gì hay hành động nào; apologize to + người nhận lời xin lỗi.",
    example:
      "The supplier chose to apologize for the delay and offer a full refund.",
    exampleTranslation:
      "Nhà cung cấp quyết định xin lỗi vì sự chậm trễ và đề nghị hoàn tiền đầy đủ.",
  },
  "be responsible for": {
    definition:
      "Be responsible for + danh từ hoặc V-ing nghĩa là chịu trách nhiệm về việc gì hoặc phụ trách làm việc đó.",
    example:
      "As project lead, Mai is responsible for checking each citation before publication.",
    exampleTranslation:
      "Với vai trò trưởng dự án, Mai chịu trách nhiệm kiểm tra từng trích dẫn trước khi xuất bản.",
  },
  "be familiar with": {
    definition:
      "Be familiar with + người/vật/quy trình nghĩa là quen thuộc hoặc hiểu biết về đối tượng đó.",
    example:
      "Please read the guide so you can become familiar with the new application process.",
    exampleTranslation:
      "Vui lòng đọc hướng dẫn để làm quen với quy trình nộp đơn mới.",
  },
  "access to": {
    definition:
      "Access to + danh từ nghĩa là quyền hoặc khả năng tiếp cận, sử dụng thứ gì; danh từ access thường đi với giới từ to.",
    example:
      "Every student should have access to reliable internet during the course.",
    exampleTranslation:
      "Mọi học viên đều nên có quyền tiếp cận Internet ổn định trong suốt khóa học.",
  },
  "prevent someone from": {
    definition:
      "Prevent someone from + V-ing nghĩa là ngăn ai làm việc gì; sau from dùng danh động từ, không dùng to + động từ.",
    example:
      "A clear warning can prevent someone from using the equipment incorrectly.",
    exampleTranslation:
      "Một cảnh báo rõ ràng có thể ngăn ai đó sử dụng thiết bị sai cách.",
  },
  "take part in": {
    definition:
      "Take part in + hoạt động/sự kiện nghĩa là tham gia; giới từ in đi cùng cụm động từ take part.",
    example:
      "Several local schools will take part in the regional science fair.",
    exampleTranslation:
      "Một số trường địa phương sẽ tham gia hội chợ khoa học cấp vùng.",
  },
  "in September": {
    definition:
      "Dùng in với tháng, năm, mùa và những khoảng thời gian dài hơn một ngày: in September, in 2026, in winter. Hãy nghĩ đến một khoảng thời gian bao quanh sự việc.",
    example: "The new term begins in September.",
    exampleTranslation:
      "Học kỳ mới bắt đầu vào tháng Chín.",
  },
  "on 2 June": {
    definition:
      "Dùng on với ngày trong tuần và ngày tháng cụ thể: on Monday, on 2 June. Ngày cụ thể được xem như một mốc trên lịch.",
    example: "The conference opens on 2 June.",
    exampleTranslation:
      "Hội nghị khai mạc vào ngày 2 tháng Sáu.",
  },
  "at 8:30 a.m.": {
    definition:
      "Dùng at với giờ cụ thể và một số mốc thời gian chính xác: at 8:30 a.m., at noon, at midnight. Tuy nhiên, cách nói thông dụng là at night.",
    example: "The guided tour starts at 8:30 a.m.",
    exampleTranslation:
      "Chuyến tham quan có hướng dẫn bắt đầu lúc 8 giờ 30 sáng.",
  },
  "in the morning": {
    definition:
      "Dùng in the với các khoảng trong ngày: in the morning, in the afternoon, in the evening. Đây là các khoảng thời gian, khác với at night.",
    example: "The bakery is open in the morning.",
    exampleTranslation:
      "Tiệm bánh mở cửa vào buổi sáng.",
  },
  "at night": {
    definition:
      "Dùng at night để nói chung về ban đêm; đây là cách dùng cố định khác với in the morning, in the afternoon và in the evening.",
    example: "The park closes to visitors at night.",
    exampleTranslation:
      "Công viên đóng cửa với khách tham quan vào ban đêm.",
  },
  "in a small drawer": {
    definition:
      "Dùng in khi vật nằm bên trong một không gian có ranh giới, như phòng, hộp hoặc ngăn kéo. Với địa điểm rộng như thành phố và quốc gia, in cũng là lựa chọn phổ biến.",
    example: "The spare key is kept in a small drawer in the kitchen.",
    exampleTranslation:
      "Chìa khóa dự phòng được cất trong một ngăn kéo nhỏ ở nhà bếp.",
  },
  "on the desk": {
    definition:
      "Dùng on khi vật tiếp xúc hoặc được đặt trên một bề mặt; bề mặt có thể nằm ngang như bàn hoặc thẳng đứng như tường.",
    example: "Leave the signed form on the desk.",
    exampleTranslation:
      "Hãy để tờ đơn đã ký trên bàn.",
  },
  "at the main entrance": {
    definition:
      "Dùng at để xem một nơi như điểm đến hoặc điểm hẹn cụ thể, chẳng hạn at the entrance, at the bus stop. Khác với in (bên trong không gian) và on (trên bề mặt).",
    example: "I'll wait for you at the main entrance.",
    exampleTranslation:
      "Tôi sẽ đợi bạn ở lối vào.",
  },
  "in Singapore": {
    definition:
      "Dùng in với thành phố, quốc gia và khu vực rộng để nói một việc xảy ra trong phạm vi địa lý đó.",
    example: "They have lived in Singapore since 2020.",
    exampleTranslation:
      "Họ đã sống ở Singapore từ năm 2020.",
  },
  "believe in": {
    definition:
      "Believe in + người, ý tưởng hoặc giá trị nghĩa là tin vào hoặc tin rằng điều đó có giá trị; in là giới từ cố định của cụm này.",
    example: "Many people believe in the value of learning a little every day.",
    exampleTranslation:
      "Nhiều người tin vào giá trị của việc học một chút mỗi ngày.",
  },
  "focus on": {
    definition:
      "Focus on + chủ đề hoặc việc cần làm nghĩa là tập trung vào điều đó; on là giới từ đi với focus trong nghĩa này.",
    example: "The report should focus on the causes of the delay.",
    exampleTranslation:
      "Bản báo cáo nên tập trung vào những nguyên nhân gây chậm trễ.",
  },
  "good at": {
    definition:
      "Good at + danh từ hoặc V-ing diễn tả làm tốt hoặc có năng khiếu ở lĩnh vực, hoạt động đó.",
    example: "My sister is good at solving logic puzzles.",
    exampleTranslation:
      "Chị tôi giỏi giải các câu đố logic.",
  },
  "interested in": {
    definition:
      "Interested in + danh từ hoặc V-ing nghĩa là quan tâm hoặc hứng thú với điều gì; tính từ interested thường đi với in.",
    example: "Tariq is interested in marine biology.",
    exampleTranslation:
      "Tariq quan tâm đến ngành sinh học biển.",
  },
};
