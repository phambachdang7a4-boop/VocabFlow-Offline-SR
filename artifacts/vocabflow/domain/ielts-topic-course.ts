export interface IeltsTopicCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface IeltsTopicCourseLesson {
  id: string;
  title: string;
  focus: string;
  questions: readonly IeltsTopicCourseQuestion[];
}

export interface IeltsTopicCourseEntry {
  definition: string;
  example: string;
  exampleTranslation: string;
  dictionarySource: "offline" | "authored";
  exampleSource: "offline" | "authored";
}

export const IELTS_TOPIC_COURSE_ID = "ielts-topic-vocabulary-v1";
export const IELTS_TOPIC_COURSE_TITLE = "Từ vựng IELTS theo chủ đề";

// Curated first, then checked against the bundled offline dictionary.
export const IELTS_TOPIC_WORD_LIST = [
  {
    id: "education",
    title: "Giáo dục",
    terms: ["curriculum", "literacy", "tuition", "compulsory", "assessment"],
  },
  {
    id: "environment",
    title: "Môi trường",
    terms: [
      "biodiversity",
      "emissions",
      "conservation",
      "sustainable",
      "habitat",
    ],
  },
  {
    id: "technology",
    title: "Công nghệ",
    terms: ["automation", "innovation", "privacy", "access", "digital"],
  },
  {
    id: "health",
    title: "Sức khỏe",
    terms: ["nutrition", "prevention", "sedentary", "obesity", "wellbeing"],
  },
  {
    id: "society-work",
    title: "Xã hội và việc làm",
    terms: [
      "employment",
      "inequality",
      "urbanization",
      "infrastructure",
      "unemployment",
    ],
  },
] as const;

export const IELTS_TOPIC_COURSE_ENTRIES: Readonly<
  Record<string, IeltsTopicCourseEntry>
> = {
  curriculum: {
    definition: "Chương trình giảng dạy.",
    example: "The new curriculum includes more writing practice.",
    exampleTranslation:
      "Chương trình giảng dạy mới có thêm phần luyện viết.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  literacy: {
    definition: "Khả năng đọc và viết.",
    example: "Reading practice can improve literacy quickly.",
    exampleTranslation:
      "Việc luyện đọc có thể nhanh chóng cải thiện khả năng đọc viết.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  tuition: {
    definition: "Học phí; tiền phải trả cho việc học.",
    example: "The tuition was lower than expected.",
    exampleTranslation: "Học phí thấp hơn dự kiến.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  compulsory: {
    definition: "Bắt buộc; phải thực hiện theo quy định.",
    example: "Wearing a uniform is compulsory for all students.",
    exampleTranslation: "Tất cả học sinh đều bắt buộc phải mặc đồng phục.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  assessment: {
    definition: "Sự đánh giá; quá trình xem xét mức độ hoặc kết quả.",
    example: "Her assessment of the problem was very accurate.",
    exampleTranslation: "Đánh giá của cô ấy về vấn đề rất chính xác.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  biodiversity: {
    definition: "Đa dạng sinh học; sự phong phú về các loài sinh vật.",
    example: "The biodiversity of tropical rain forests is high.",
    exampleTranslation:
      "Rừng mưa nhiệt đới có mức độ đa dạng sinh học cao.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  emissions: {
    definition: "Khí thải hoặc lượng chất thải được thải ra môi trường.",
    example:
      "Strict limits on vehicle emissions can improve urban air quality.",
    exampleTranslation:
      "Giới hạn nghiêm ngặt khí thải xe cộ có thể cải thiện chất lượng không khí đô thị.",
    dictionarySource: "authored",
    exampleSource: "authored",
  },
  conservation: {
    definition: "Sự bảo tồn hoặc gìn giữ tài nguyên và thiên nhiên.",
    example: "We must focus on the conservation of water.",
    exampleTranslation: "Chúng ta cần chú trọng việc bảo tồn nguồn nước.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  sustainable: {
    definition: "Bền vững; có thể duy trì lâu dài mà không gây cạn kiệt.",
    example: "This plan is sustainable for a long time.",
    exampleTranslation: "Kế hoạch này có thể được duy trì lâu dài.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  habitat: {
    definition: "Môi trường sống tự nhiên của một loài động vật hoặc thực vật.",
    example: "This lake is the bird's habitat.",
    exampleTranslation: "Hồ này là môi trường sống của loài chim đó.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  automation: {
    definition: "Sự tự động hóa; việc dùng máy móc để thực hiện công việc.",
    example: "Automation saved time in the factory.",
    exampleTranslation: "Tự động hóa giúp nhà máy tiết kiệm thời gian.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  innovation: {
    definition: "Sự đổi mới; ý tưởng hoặc phương pháp mới.",
    example: "The company grew through constant innovation.",
    exampleTranslation: "Công ty phát triển nhờ liên tục đổi mới.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  privacy: {
    definition: "Sự riêng tư; quyền giữ kín thông tin cá nhân.",
    example: "She asked for privacy while making the call.",
    exampleTranslation: "Cô ấy muốn có sự riêng tư khi gọi điện.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  access: {
    definition: "Quyền hoặc khả năng tiếp cận, sử dụng một nguồn lực.",
    example: "The building provides easy access for all guests.",
    exampleTranslation:
      "Tòa nhà giúp mọi khách tham quan dễ dàng tiếp cận.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  digital: {
    definition: "Thuộc công nghệ điện tử dùng dữ liệu dạng số.",
    example: "The watch shows the time in digital numbers.",
    exampleTranslation: "Đồng hồ hiển thị thời gian bằng chữ số điện tử.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  nutrition: {
    definition: "Dinh dưỡng; quá trình cơ thể nhận và sử dụng thức ăn.",
    example: "Good nutrition helps children grow strong.",
    exampleTranslation: "Dinh dưỡng tốt giúp trẻ em phát triển khỏe mạnh.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  prevention: {
    definition: "Sự phòng ngừa; hành động ngăn điều xấu xảy ra.",
    example: "Early prevention is better than late cure.",
    exampleTranslation:
      "Phòng ngừa sớm tốt hơn chữa trị khi đã muộn.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  sedentary: {
    definition: "Ít vận động; thường ngồi hoặc ở yên một chỗ.",
    example: "A sedentary lifestyle can lead to health problems.",
    exampleTranslation:
      "Lối sống ít vận động có thể dẫn đến các vấn đề sức khỏe.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  obesity: {
    definition: "Béo phì; tình trạng tích tụ mỡ thừa có thể ảnh hưởng sức khỏe.",
    example:
      "Regular exercise and healthy meals can reduce the risk of obesity.",
    exampleTranslation:
      "Tập thể dục thường xuyên và ăn uống lành mạnh có thể giảm nguy cơ béo phì.",
    dictionarySource: "offline",
    exampleSource: "authored",
  },
  wellbeing: {
    definition: "Sức khỏe và trạng thái an lành về thể chất lẫn tinh thần.",
    example:
      "Work-life balance is crucial for maintaining physical and mental wellbeing.",
    exampleTranslation:
      "Cân bằng công việc và cuộc sống rất quan trọng để duy trì sức khỏe thể chất và tinh thần.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  employment: {
    definition: "Việc làm; tình trạng có công việc được trả lương.",
    example: "She is currently looking for full-time employment.",
    exampleTranslation: "Cô ấy hiện đang tìm việc làm toàn thời gian.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  inequality: {
    definition: "Sự bất bình đẳng; tình trạng thiếu công bằng hoặc ngang bằng.",
    example:
      "The report examines income inequality between rural and urban households.",
    exampleTranslation:
      "Báo cáo xem xét bất bình đẳng thu nhập giữa các hộ gia đình nông thôn và thành thị.",
    dictionarySource: "offline",
    exampleSource: "authored",
  },
  urbanization: {
    definition: "Đô thị hóa; quá trình dân cư và hoạt động tập trung vào thành phố.",
    example:
      "Rapid urbanization can increase the demand for city housing.",
    exampleTranslation:
      "Đô thị hóa nhanh có thể làm tăng nhu cầu nhà ở trong thành phố.",
    dictionarySource: "offline",
    exampleSource: "authored",
  },
  infrastructure: {
    definition: "Cơ sở hạ tầng như đường sá, cầu cống, điện và nước.",
    example: "Good infrastructure supports daily life.",
    exampleTranslation: "Cơ sở hạ tầng tốt hỗ trợ đời sống hằng ngày.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  unemployment: {
    definition: "Tình trạng thất nghiệp; không có việc làm dù đang tìm việc.",
    example: "Unemployment rose after the factory closed.",
    exampleTranslation: "Tỷ lệ thất nghiệp tăng sau khi nhà máy đóng cửa.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
};

export const IELTS_TOPIC_COURSE_LESSONS: readonly IeltsTopicCourseLesson[] = [
  {
    id: `${IELTS_TOPIC_COURSE_ID}-education`,
    title: "Giáo dục",
    focus:
      "Từ vựng về chương trình học, học phí, kỹ năng đọc viết và đánh giá.",
    questions: [
      {
        term: "curriculum",
        prompt:
          "The school revised its _____ to include more environmental science.",
        choices: ["curriculum", "literacy", "tuition", "assessment"],
      },
      {
        term: "literacy",
        prompt:
          "A strong _____ helps students understand written instructions.",
        choices: ["literacy", "assessment", "compulsory", "curriculum"],
      },
      {
        term: "tuition",
        prompt: "Many families struggle to pay university _____.",
        choices: ["tuition", "curriculum", "literacy", "compulsory"],
      },
      {
        term: "compulsory",
        prompt:
          "In this country, education is _____ until the age of sixteen.",
        choices: ["compulsory", "assessment", "tuition", "literacy"],
      },
      {
        term: "assessment",
        prompt:
          "The teacher used a short quiz as an _____ of students' progress.",
        choices: ["assessment", "curriculum", "compulsory", "tuition"],
      },
    ],
  },
  {
    id: `${IELTS_TOPIC_COURSE_ID}-environment`,
    title: "Môi trường",
    focus:
      "Nói về sự đa dạng sinh học, bảo tồn, khí thải và môi trường sống.",
    questions: [
      {
        term: "biodiversity",
        prompt:
          "The rainforest contains many different species, so its _____ is high.",
        choices: ["biodiversity", "emissions", "conservation", "sustainable"],
      },
      {
        term: "emissions",
        prompt:
          "New buses produce fewer harmful _____ than old diesel buses.",
        choices: ["emissions", "habitat", "biodiversity", "conservation"],
      },
      {
        term: "conservation",
        prompt:
          "Water _____ means protecting supplies and avoiding waste.",
        choices: ["conservation", "sustainable", "emissions", "habitat"],
      },
      {
        term: "sustainable",
        prompt:
          "Solar power is a more _____ energy source than coal.",
        choices: ["sustainable", "biodiversity", "habitat", "emissions"],
      },
      {
        term: "habitat",
        prompt:
          "Wetlands provide a natural _____ for frogs and migratory birds.",
        choices: ["habitat", "conservation", "sustainable", "biodiversity"],
      },
    ],
  },
  {
    id: `${IELTS_TOPIC_COURSE_ID}-technology`,
    title: "Công nghệ",
    focus:
      "Từ vựng về tự động hóa, đổi mới, quyền riêng tư và tiếp cận số.",
    questions: [
      {
        term: "automation",
        prompt:
          "Factory _____ can complete repetitive tasks quickly.",
        choices: ["automation", "privacy", "innovation", "access"],
      },
      {
        term: "innovation",
        prompt:
          "The company introduced an _____ that makes online payments safer.",
        choices: ["innovation", "digital", "automation", "privacy"],
      },
      {
        term: "privacy",
        prompt:
          "Users should review app settings to protect their online _____.",
        choices: ["privacy", "access", "innovation", "automation"],
      },
      {
        term: "access",
        prompt:
          "Students need reliable internet _____ to use online learning resources.",
        choices: ["access", "digital", "privacy", "innovation"],
      },
      {
        term: "digital",
        prompt:
          "The library offers _____ books that can be read on a phone.",
        choices: ["digital", "automation", "access", "privacy"],
      },
    ],
  },
  {
    id: `${IELTS_TOPIC_COURSE_ID}-health`,
    title: "Sức khỏe",
    focus:
      "Thảo luận về dinh dưỡng, phòng bệnh, vận động và sức khỏe tinh thần.",
    questions: [
      {
        term: "nutrition",
        prompt:
          "Good _____ is essential for healthy growth.",
        choices: ["nutrition", "prevention", "obesity", "wellbeing"],
      },
      {
        term: "prevention",
        prompt:
          "Vaccination is an important form of disease _____.",
        choices: ["prevention", "sedentary", "nutrition", "obesity"],
      },
      {
        term: "sedentary",
        prompt:
          "Spending most of the day sitting is a _____ lifestyle.",
        choices: ["sedentary", "wellbeing", "prevention", "nutrition"],
      },
      {
        term: "obesity",
        prompt:
          "Health campaigns encourage exercise to reduce _____ among children.",
        choices: ["obesity", "nutrition", "sedentary", "prevention"],
      },
      {
        term: "wellbeing",
        prompt:
          "Regular sleep and social support can improve mental _____.",
        choices: ["wellbeing", "obesity", "prevention", "sedentary"],
      },
    ],
  },
  {
    id: `${IELTS_TOPIC_COURSE_ID}-society-work`,
    title: "Xã hội và việc làm",
    focus:
      "Từ vựng về cơ hội việc làm, bất bình đẳng, đô thị hóa và hạ tầng.",
    questions: [
      {
        term: "employment",
        prompt:
          "The company created two hundred new _____ opportunities.",
        choices: ["employment", "inequality", "infrastructure", "urbanization"],
      },
      {
        term: "inequality",
        prompt:
          "The report examines income _____ between rural and urban households.",
        choices: ["inequality", "unemployment", "employment", "infrastructure"],
      },
      {
        term: "urbanization",
        prompt:
          "Rapid _____ can increase the demand for housing in cities.",
        choices: ["urbanization", "employment", "unemployment", "inequality"],
      },
      {
        term: "infrastructure",
        prompt:
          "Roads, bridges, and water systems are part of public _____.",
        choices: ["infrastructure", "urbanization", "employment", "unemployment"],
      },
      {
        term: "unemployment",
        prompt:
          "When the factory closed, local _____ increased.",
        choices: ["unemployment", "infrastructure", "inequality", "urbanization"],
      },
    ],
  },
];
