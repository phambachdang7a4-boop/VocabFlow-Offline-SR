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

export const SENTENCE_STRUCTURE_PATTERN_DISTRACTOR_EXPLANATIONS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "either … or": {
    "neither … nor": "The sentence requires one of two options, not neither option.",
    "not only … but also": "This asserts both options, which conflicts with “not both.”",
    "whether … or": "This introduces alternatives for consideration but does not express the required choice.",
  },
  "neither … nor": {
    "both … and": "The prompt says the plan lacked both listed features.",
    "either … or": "This presents a choice instead of denying both features.",
    "not only … but also": "This asserts that both features were present, the opposite of the prompt.",
  },
  "not only … but also": {
    "either … or": "The prompt explicitly says both advantages apply.",
    "neither … nor": "This denies both advantages instead of emphasizing them.",
    "whether … or": "This frames alternatives rather than asserting both advantages.",
  },
  "no matter how": {
    "as long as": "This sets a condition and cannot form “as long as carefully the team checked.”",
    "provided that": "This sets a condition and cannot precede the adverb “carefully” in this structure.",
    "even though": "This cannot form the required “even though carefully” clause.",
  },
  "so … that": {
    "such … that": "“Such” needs a noun phrase here, as in “such a vast archive.”",
    "too … to": "This cannot connect the adjective “vast” to the finite clause after the second blank.",
    "as … as": "This requires a comparison, not the result clause “the researchers needed several weeks.”",
  },
  "the more … the more": {
    "as … as": "This comparison does not form the paired-correlative structure in the sentence.",
    "so … that": "This requires a result clause rather than two changing quantities.",
    "not only … but also": "This requires two parallel features, not a comparative relationship.",
  },
  "not only did": {
    "not only does": "The sentence locates the result in last year's pilot, so present-tense “does” conflicts with the time frame.",
    "not only has": "“Has the revised schedule reduce” is not grammatical; perfect inversion needs “reduced.”",
    "not only was": "“Was the revised schedule reduce” is not grammatical; “was” cannot support this base-form verb.",
  },
  "no sooner … than": {
    "hardly … than": "The standard paired form is “hardly … when/before,” not “hardly … than.”",
    "not until … than": "“Not until” does not pair with “than” to express this immediate sequence.",
    "as soon as … than": "“As soon as” does not take “than” as its paired connector.",
  },
  "it was … that": {
    "there was … which": "This existential construction does not cleft the object as required by “a simple water filter.”",
    "it had … when": "This does not form an object-focused cleft and “when” cannot introduce the object.",
    "there were … where": "This does not form an object-focused cleft and “where” cannot introduce the object.",
  },
  "having completed": {
    "completed having": "The auxiliary and participle are in the wrong order.",
    "to have complete": "The perfect infinitive requires the past participle “completed,” not “complete.”",
    "having been complete": "“Complete” is an adjective here; this form does not express the engineer finishing the inspection.",
  },
  "so do I": {
    "neither do I": "This disagrees with the positive statement “I enjoy reading.”",
    "so have I": "The original uses present simple “enjoy,” not the present perfect.",
    "neither I do": "This has incorrect word order for an agreeing response.",
  },
  "neither have I": {
    "so have I": "This agrees with a positive statement, but the speaker says “haven't.”",
    "neither I have": "This has incorrect word order for the agreeing negative response.",
    "I haven't neither": "This uses a nonstandard double negative rather than the required response pattern.",
  },
  "one / ones": {
    "it / them": "These pronouns refer to specific objects and do not replace the repeated count nouns in the adjective phrases.",
    "this / those": "These demonstratives do not serve as the stated singular/plural noun substitutes.",
    "some / any": "These are quantifiers and do not complete “the smaller” and “the cheaper” as noun substitutes.",
  },
  "in advance": {
    "at advance": "The time expression takes “in,” not “at.”",
    "on advance": "The time expression takes “in,” not “on.”",
    "by advance": "“By advance” is not the standard expression for registering ahead of time.",
  },
  "at risk of": {
    "in risk of": "The fixed expression is “at risk,” not “in risk.”",
    "on risk of": "The fixed expression is “at risk,” not “on risk.”",
    "at risk to": "The risk is followed by “of” before the potential event.",
  },
  "on behalf of": {
    "at behalf of": "The fixed expression is “on behalf of,” not “at behalf of.”",
    "by behalf of": "The fixed expression is “on behalf of,” not “by behalf of.”",
    "on behalf to": "The represented group is introduced by “of,” not “to.”",
  },
  "rely on": {
    "rely to": "The verb “rely” takes “on,” not “to,” for the source of support.",
    "rely for": "“For” does not introduce the people providing the directions after “rely.”",
    "rely with": "The verb “rely” takes “on” before the guides being trusted.",
  },
  "apologize for": {
    "apologize of": "The thing being apologized for is introduced by “for.”",
    "apologize with": "“With” does not introduce the delay as the reason for the apology.",
    "apologize from": "“From” does not introduce the event being apologized for.",
  },
  "be responsible for": {
    "be responsible of": "The adjective takes “for” before a duty or action.",
    "be responsible with": "“With” does not introduce the project lead's assigned duty.",
    "be responsible from": "“From” does not introduce a responsibility.",
  },
  "be familiar with": {
    "be familiar on": "The adjective takes “with” before a process someone knows.",
    "be familiar from": "“From” does not introduce the subject someone knows.",
    "be familiar over": "“Over” does not introduce the subject someone knows.",
  },
  "access to": {
    "access for": "The noun “access” takes “to” before the resource available.",
    "access with": "“With” does not introduce the resource available to students.",
    "access on": "The noun “access” takes “to,” not “on,” before the resource.",
  },
  "prevent someone from": {
    "prevent someone to": "The verb pattern is “prevent someone from doing,” not an infinitive with “to.”",
    "prevent someone of": "The verb pattern requires “from” before the action.",
    "prevent someone with": "“With” does not introduce the action being prevented.",
  },
  "take part in": {
    "take part at": "The fixed expression is “take part in” an event.",
    "take part of": "“Part of” means a portion of something and does not mean participate in it.",
    "take part by": "“By” does not introduce the event someone participates in.",
  },
  "in September": {
    "on September": "A month without a specific date takes “in.”",
    "at September": "A month without a specific date takes “in.”",
    "in the September": "Month names used this way do not take “the.”",
  },
  "on 2 June": {
    "in 2 June": "A specific calendar date takes “on,” not “in.”",
    "at 2 June": "A specific calendar date takes “on,” not “at.”",
    "on the 2 June": "The date is conventionally written “on 2 June” without “the.”",
  },
  "at 8:30 a.m.": {
    "in 8:30 a.m.": "A specific clock time takes “at.”",
    "on 8:30 a.m.": "A specific clock time takes “at,” not “on.”",
    "on the 8:30 a.m.": "A clock time takes “at”; “on the 8:30 a.m.” is not a grammatical time phrase.",
  },
  "in the morning": {
    "on the morning": "The general period of a day takes “in” in this expression.",
    "at the morning": "The general period of a day takes “in” in this expression.",
    "in morning": "This general time expression requires the article “the.”",
  },
  "at night": {
    "in night": "The standard general time expression is “at night.”",
    "on night": "The standard general time expression is “at night.”",
    "at the night": "The general time expression normally omits “the.”",
  },
  "in a small drawer": {
    "on a small drawer": "The key is inside the drawer, not on its surface.",
    "at a small drawer": "“At” identifies a point or location, not containment inside a drawer.",
    "over a small drawer": "“Over” places the key above the drawer rather than inside it.",
  },
  "on the desk": {
    "in the desk": "The prompt specifies the top surface, not inside the desk.",
    "at the desk": "This means at the desk location, not resting on its top surface.",
    "under the desk": "This places the form below the desk, contrary to the prompt.",
  },
  "at the main entrance": {
    "in the main entrance": "The speaker waits outside the building, not inside an entrance area.",
    "on the main entrance": "“On” would place the person on the entrance structure, not at the location.",
    "through the main entrance": "“Through” describes movement via the entrance, not waiting outside it.",
  },
  "in Singapore": {
    "on Singapore": "A city or country is expressed with “in.”",
    "at Singapore": "A city or country is expressed with “in,” not “at.”",
    "through Singapore": "“Through” describes movement across a place, not living there.",
  },
  "believe in": {
    "believe on": "The fixed expression meaning have faith in a principle is “believe in.”",
    "believe at": "“At” does not introduce the principle someone accepts as valuable.",
    "believe for": "“For” does not introduce the object of belief in this meaning.",
  },
  "focus on": {
    "focus in": "The verb takes “on” before the subject receiving attention.",
    "focus at": "“At” does not introduce the topic receiving attention.",
    "focus for": "“For” does not introduce the topic receiving attention.",
  },
  "good at": {
    "good in": "The usual pattern for ability at an activity is “good at.”",
    "good on": "“On” does not introduce an activity someone performs well.",
    "good for": "“Good for” means beneficial or suitable, not skilled at an activity.",
  },
  "interested in": {
    "interested on": "The adjective takes “in” before a subject of interest.",
    "interested at": "“At” does not introduce the subject someone wants to learn about.",
    "interested for": "The adjective takes “in” before the subject of interest.",
  },
};

export const SENTENCE_STRUCTURE_PATTERN_ENTRIES: Readonly<
  Record<string, SentenceStructurePatternEntry>
> = {
  "either … or": {
    definition:
      "Cặp liên từ nối hai phương án để chọn một trong hai theo ngữ cảnh. Hai vế sau either và or nên cùng dạng ngữ pháp; nếu muốn nói cả hai đều không đúng, dùng neither … nor.",
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
      "Cặp liên từ nhấn mạnh rằng cả hai đặc điểm hoặc hành động đều đúng. Giữ hai vế nối với not only và but also cùng dạng; nếu Not only đứng đầu một mệnh đề, đảo trợ động từ lên trước chủ ngữ.",
    example:
      "The reading app is not only easy to use but also available offline.",
    exampleTranslation:
      "Ứng dụng đọc này không chỉ dễ sử dụng mà còn dùng được khi ngoại tuyến.",
  },
  "no matter how": {
    definition:
      "Nghĩa là “dù… đến mức nào”. Dùng no matter how + tính từ/trạng từ + chủ ngữ + động từ; kết quả ở mệnh đề chính vẫn không thay đổi dù mức độ ra sao.",
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
      "Cấu trúc so sánh kép diễn tả hai yếu tố thay đổi cùng chiều: “càng… thì càng…”. Mỗi vế bắt đầu bằng the more; sau đó có thể là danh từ rồi đến chủ ngữ và động từ, hoặc tính từ/trạng từ trong một mệnh đề.",
    example:
      "The more evidence the team examined, the more confident its conclusion became.",
    exampleTranslation:
      "Nhóm càng xem xét nhiều bằng chứng thì càng tự tin vào kết luận của mình.",
  },
  "not only did": {
    definition:
      "Khi Not only đứng đầu mệnh đề quá khứ đơn để nhấn mạnh, dùng Not only + did + chủ ngữ + động từ nguyên mẫu; không dùng động từ quá khứ sau did. Mệnh đề song hành thường tiếp tục bằng but (also).",
    example:
      "Not only did the revised schedule reduce delays, but it also lowered operating costs.",
    exampleTranslation:
      "Lịch trình sửa đổi không chỉ giảm chậm trễ mà còn hạ chi phí vận hành.",
  },
  "no sooner … than": {
    definition:
      "Diễn tả việc thứ hai xảy ra ngay sau việc thứ nhất. Khi No sooner đứng đầu câu, dùng No sooner + had + chủ ngữ + quá khứ phân từ, rồi than + chủ ngữ + động từ quá khứ đơn.",
    example:
      "No sooner had the train left than the storm reached the station.",
    exampleTranslation:
      "Tàu vừa rời đi thì cơn bão đã tới nhà ga.",
  },
  "it was … that": {
    definition:
      "Câu chẻ It was + thành phần cần nhấn mạnh + that + phần còn lại của câu. Ở ví dụ này, that nối phần được nhấn mạnh (vật được thiết kế) với mệnh đề còn lại; với người, đôi khi có thể dùng who thay that.",
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
      "Dùng So + trợ động từ + chủ ngữ để đồng tình với câu khẳng định. Lấy trợ động từ phù hợp với động từ và thì của câu trước; ở đây do thay cho enjoy reading. Trật tự là trợ động từ rồi đến chủ ngữ.",
    example:
      "“I enjoy reading historical biographies.” “So do I,” Minh replied.",
    exampleTranslation:
      "“Tôi thích đọc tiểu sử lịch sử.” “Tôi cũng vậy,” Minh đáp.",
  },
  "neither have I": {
    definition:
      "Dùng Neither + trợ động từ + chủ ngữ để đồng tình với câu phủ định. Lấy trợ động từ phù hợp với động từ và thì của câu trước; hiện tại hoàn thành dùng have/has. Trật tự là trợ động từ rồi đến chủ ngữ.",
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
      "Cụm giới từ nghĩa là “thay mặt cho” hoặc “vì lợi ích của”, dùng khi nói hay hành động đại diện cho một người hoặc nhóm.",
    example:
      "I am writing on behalf of the residents' committee to thank the volunteers.",
    exampleTranslation:
      "Tôi viết thư thay mặt ban đại diện cư dân để cảm ơn các tình nguyện viên.",
  },
  "rely on": {
    definition:
      "Rely on + người/vật nghĩa là dựa vào hoặc tin cậy người hay điều đó để được hỗ trợ; giới từ on đi với động từ rely trong nghĩa này.",
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
      "Be responsible for + danh từ hoặc V-ing nghĩa là chịu trách nhiệm hoặc phụ trách việc đó; trong ngữ cảnh khác, responsible for cũng có thể chỉ nguyên nhân gây ra điều gì.",
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
      "Believe in + người, ý tưởng hoặc giá trị nghĩa là tin tưởng người đó, hoặc tin điều/ý tưởng đó có thật hay đáng tin; in đi với believe trong các nghĩa này. Không nhầm với believe someone (tin lời ai nói).",
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
      "Good at + danh từ hoặc V-ing diễn tả giỏi hoặc có năng khiếu trong lĩnh vực/hoạt động đó; khác good for, nghĩa là có ích hoặc phù hợp.",
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
