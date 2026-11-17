export interface BasicVocabularyCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface BasicVocabularyCourseLesson {
  id: string;
  title: string;
  focus: string;
  topicId: string;
  topicTitle: string;
  questions: readonly BasicVocabularyCourseQuestion[];
}

export interface BasicVocabularyCourseEntry {
  definition: string;
  example: string;
}

type Word = readonly [term: string, meaning: string];
type LessonSeed = {
  title: string;
  words: readonly Word[];
};
type TopicSeed = {
  id: string;
  title: string;
  focus: string;
  lessons: readonly LessonSeed[];
};

export const BASIC_VOCABULARY_COURSE_ID = "basic-vocabulary-a1-a2-v1";
export const BASIC_VOCABULARY_COURSE_TITLE = "Từ vựng tiếng Anh cơ bản";

const TOPICS: readonly TopicSeed[] = [
  {
    id: "people-family",
    title: "Con người và gia đình",
    focus: "Những từ thường dùng khi nói về con người, người thân và thông tin cá nhân.",
    lessons: [
      {
        title: "Người và gia đình",
        words: [
          ["person", "người"],
          ["people", "mọi người"],
          ["man", "đàn ông"],
          ["woman", "phụ nữ"],
          ["child", "trẻ em"],
          ["boy", "cậu bé"],
          ["girl", "cô bé"],
          ["family", "gia đình"],
          ["mother", "mẹ"],
          ["father", "bố"],
          ["parent", "cha hoặc mẹ"],
          ["friend", "bạn"],
        ],
      },
      {
        title: "Người thân",
        words: [
          ["sister", "chị hoặc em gái"],
          ["brother", "anh hoặc em trai"],
          ["son", "con trai"],
          ["daughter", "con gái"],
          ["husband", "chồng"],
          ["wife", "vợ"],
          ["baby", "em bé"],
          ["aunt", "cô, dì hoặc bác gái"],
          ["uncle", "chú, cậu hoặc bác trai"],
          ["cousin", "anh, chị hoặc em họ"],
          ["grandmother", "bà"],
          ["grandfather", "ông"],
        ],
      },
      {
        title: "Thông tin cá nhân",
        words: [
          ["guest", "khách"],
          ["customer", "khách hàng"],
          ["partner", "bạn đời hoặc đối tác"],
          ["colleague", "đồng nghiệp"],
          ["adult", "người trưởng thành"],
          ["teenager", "thiếu niên"],
          ["couple", "cặp đôi"],
          ["marriage", "hôn nhân"],
          ["surname", "họ"],
          ["address", "địa chỉ"],
          ["age", "tuổi"],
          ["birthday", "sinh nhật"],
        ],
      },
    ],
  },
  {
    id: "home",
    title: "Nhà cửa và đồ dùng",
    focus: "Từ gọi tên các phòng, vật dụng và đồ dùng quen thuộc trong nhà.",
    lessons: [
      {
        title: "Phòng trong nhà",
        words: [
          ["house", "ngôi nhà"],
          ["home", "nhà, nơi ở"],
          ["apartment", "căn hộ"],
          ["room", "phòng"],
          ["kitchen", "nhà bếp"],
          ["bedroom", "phòng ngủ"],
          ["bathroom", "phòng tắm"],
          ["door", "cửa ra vào"],
          ["window", "cửa sổ"],
          ["wall", "bức tường"],
          ["floor", "sàn nhà"],
          ["garden", "khu vườn"],
        ],
      },
      {
        title: "Đồ dùng quen thuộc",
        words: [
          ["table", "cái bàn"],
          ["chair", "cái ghế"],
          ["bed", "cái giường"],
          ["sofa", "ghế sô-pha"],
          ["desk", "bàn làm việc hoặc bàn học"],
          ["lamp", "đèn"],
          ["mirror", "gương"],
          ["key", "chìa khóa"],
          ["cup", "cái cốc"],
          ["plate", "cái đĩa"],
          ["spoon", "cái thìa"],
          ["fork", "cái nĩa"],
        ],
      },
      {
        title: "Đồ dùng sinh hoạt",
        words: [
          ["fridge", "tủ lạnh"],
          ["oven", "lò nướng"],
          ["sink", "bồn rửa"],
          ["shower", "vòi sen"],
          ["toilet", "nhà vệ sinh hoặc bồn cầu"],
          ["towel", "khăn tắm"],
          ["soap", "xà phòng"],
          ["blanket", "chăn"],
          ["pillow", "gối"],
          ["shelf", "kệ"],
          ["fan", "quạt"],
          ["drawer", "ngăn kéo"],
        ],
      },
    ],
  },
  {
    id: "food-shopping",
    title: "Đồ ăn và mua sắm",
    focus: "Từ vựng cơ bản về thực phẩm, bữa ăn và mua bán hằng ngày.",
    lessons: [
      {
        title: "Thức ăn cơ bản",
        words: [
          ["bread", "bánh mì"],
          ["rice", "cơm hoặc gạo"],
          ["egg", "trứng"],
          ["milk", "sữa"],
          ["water", "nước"],
          ["tea", "trà"],
          ["coffee", "cà phê"],
          ["fruit", "trái cây"],
          ["apple", "quả táo"],
          ["banana", "quả chuối"],
          ["orange", "quả cam"],
          ["vegetable", "rau củ"],
        ],
      },
      {
        title: "Bữa ăn và nấu nướng",
        words: [
          ["chicken", "thịt gà"],
          ["fish", "cá"],
          ["meat", "thịt"],
          ["soup", "canh hoặc súp"],
          ["salad", "món rau trộn"],
          ["cheese", "phô mai"],
          ["sugar", "đường"],
          ["salt", "muối"],
          ["oil", "dầu ăn"],
          ["cook", "nấu ăn"],
          ["eat", "ăn"],
          ["drink", "uống"],
        ],
      },
      {
        title: "Mua hàng và giá cả",
        words: [
          ["buy", "mua"],
          ["sell", "bán"],
          ["price", "giá"],
          ["money", "tiền"],
          ["cash", "tiền mặt"],
          ["card", "thẻ"],
          ["shop", "cửa hàng"],
          ["market", "chợ"],
          ["store", "cửa hàng"],
          ["cheap", "rẻ"],
          ["expensive", "đắt"],
          ["change", "tiền thừa được trả lại"],
        ],
      },
    ],
  },
  {
    id: "body-health",
    title: "Cơ thể và sức khỏe",
    focus: "Tên các bộ phận cơ thể và những từ thường gặp khi nói về sức khỏe.",
    lessons: [
      {
        title: "Đầu và cơ thể",
        words: [
          ["body", "cơ thể"],
          ["head", "đầu"],
          ["face", "khuôn mặt"],
          ["hair", "tóc"],
          ["eye", "mắt"],
          ["ear", "tai"],
          ["nose", "mũi"],
          ["mouth", "miệng"],
          ["tooth", "răng"],
          ["hand", "bàn tay"],
          ["arm", "cánh tay"],
          ["leg", "chân"],
        ],
      },
      {
        title: "Bộ phận và cảm giác",
        words: [
          ["foot", "bàn chân"],
          ["back", "lưng"],
          ["heart", "tim"],
          ["stomach", "dạ dày hoặc bụng"],
          ["finger", "ngón tay"],
          ["shoulder", "vai"],
          ["neck", "cổ"],
          ["skin", "da"],
          ["blood", "máu"],
          ["pain", "cơn đau"],
          ["sick", "ốm"],
          ["healthy", "khỏe mạnh"],
        ],
      },
      {
        title: "Khi đi khám bệnh",
        words: [
          ["patient", "bệnh nhân"],
          ["nurse", "y tá"],
          ["clinic", "phòng khám"],
          ["hospital", "bệnh viện"],
          ["medicine", "thuốc"],
          ["rest", "nghỉ ngơi"],
          ["sleep", "ngủ"],
          ["exercise", "tập thể dục"],
          ["breathe", "thở"],
          ["cough", "ho"],
          ["fever", "cơn sốt"],
          ["headache", "đau đầu"],
        ],
      },
    ],
  },
  {
    id: "school-work",
    title: "Học tập và công việc",
    focus: "Những từ thường dùng ở trường học, trong lớp và tại nơi làm việc.",
    lessons: [
      {
        title: "Trong lớp học",
        words: [
          ["school", "trường học"],
          ["classroom", "phòng học"],
          ["class", "lớp học"],
          ["lesson", "bài học"],
          ["question", "câu hỏi"],
          ["answer", "câu trả lời"],
          ["test", "bài kiểm tra"],
          ["exam", "kỳ thi"],
          ["homework", "bài tập về nhà"],
          ["learn", "học"],
          ["study", "học tập hoặc nghiên cứu"],
          ["write", "viết"],
        ],
      },
      {
        title: "Học liệu và môn học",
        words: [
          ["read", "đọc"],
          ["listen", "nghe"],
          ["speak", "nói"],
          ["teacher", "giáo viên"],
          ["student", "học sinh hoặc sinh viên"],
          ["classmate", "bạn cùng lớp"],
          ["notebook", "vở ghi"],
          ["pencil", "bút chì"],
          ["ruler", "thước kẻ"],
          ["course", "khóa học"],
          ["subject", "môn học"],
          ["grade", "điểm số"],
        ],
      },
      {
        title: "Ở nơi làm việc",
        words: [
          ["work", "làm việc"],
          ["job", "công việc hoặc nghề nghiệp"],
          ["office", "văn phòng"],
          ["meeting", "cuộc họp"],
          ["email", "thư điện tử"],
          ["computer", "máy tính"],
          ["file", "tệp"],
          ["task", "nhiệm vụ"],
          ["team", "nhóm"],
          ["manager", "quản lý"],
          ["worker", "người lao động"],
          ["company", "công ty"],
        ],
      },
    ],
  },
  {
    id: "time-seasons",
    title: "Thời gian và mùa",
    focus: "Từ chỉ ngày tháng, thời điểm trong ngày và các mùa trong năm.",
    lessons: [
      {
        title: "Ngày và thời điểm",
        words: [
          ["time", "thời gian"],
          ["day", "ngày"],
          ["week", "tuần"],
          ["month", "tháng"],
          ["year", "năm"],
          ["today", "hôm nay"],
          ["tomorrow", "ngày mai"],
          ["yesterday", "hôm qua"],
          ["morning", "buổi sáng"],
          ["afternoon", "buổi chiều"],
          ["evening", "buổi tối"],
          ["night", "ban đêm"],
        ],
      },
      {
        title: "Lịch và giờ giấc",
        words: [
          ["Monday", "thứ Hai"],
          ["Tuesday", "thứ Ba"],
          ["Wednesday", "thứ Tư"],
          ["Thursday", "thứ Năm"],
          ["Friday", "thứ Sáu"],
          ["Saturday", "thứ Bảy"],
          ["Sunday", "Chủ nhật"],
          ["hour", "giờ"],
          ["minute", "phút"],
          ["early", "sớm"],
          ["late", "muộn"],
          ["weekend", "cuối tuần"],
        ],
      },
      {
        title: "Thời tiết và mùa",
        words: [
          ["spring", "mùa xuân"],
          ["summer", "mùa hè"],
          ["autumn", "mùa thu"],
          ["winter", "mùa đông"],
          ["weather", "thời tiết"],
          ["rain", "mưa"],
          ["snow", "tuyết"],
          ["wind", "gió"],
          ["sun", "mặt trời"],
          ["sky", "bầu trời"],
          ["cloud", "đám mây"],
          ["season", "mùa"],
        ],
      },
    ],
  },
  {
    id: "city-travel",
    title: "Thành phố và du lịch",
    focus: "Từ chỉ địa điểm, phương tiện và hướng đi thường gặp khi di chuyển.",
    lessons: [
      {
        title: "Đường phố và phương tiện",
        words: [
          ["street", "đường phố"],
          ["road", "con đường"],
          ["bridge", "cây cầu"],
          ["station", "nhà ga"],
          ["airport", "sân bay"],
          ["bus", "xe buýt"],
          ["train", "tàu hỏa"],
          ["taxi", "xe taxi"],
          ["bicycle", "xe đạp"],
          ["car", "ô tô"],
          ["ticket", "vé"],
          ["map", "bản đồ"],
        ],
      },
      {
        title: "Địa điểm trong thành phố",
        words: [
          ["hotel", "khách sạn"],
          ["restaurant", "nhà hàng"],
          ["cafe", "quán cà phê"],
          ["bank", "ngân hàng"],
          ["post office", "bưu điện"],
          ["park", "công viên"],
          ["supermarket", "siêu thị"],
          ["museum", "bảo tàng"],
          ["library", "thư viện"],
          ["beach", "bãi biển"],
          ["village", "ngôi làng"],
          ["town", "thị trấn"],
        ],
      },
      {
        title: "Hướng và chỉ đường",
        words: [
          ["left", "bên trái"],
          ["right", "bên phải"],
          ["north", "phía bắc"],
          ["south", "phía nam"],
          ["near", "gần"],
          ["far", "xa"],
          ["here", "ở đây"],
          ["there", "ở đó"],
          ["enter", "đi vào"],
          ["exit", "lối ra"],
          ["turn", "rẽ"],
          ["cross", "băng qua"],
        ],
      },
    ],
  },
  {
    id: "daily-actions",
    title: "Hoạt động hằng ngày",
    focus: "Động từ và từ mô tả giúp người học nói về sinh hoạt thường ngày.",
    lessons: [
      {
        title: "Động từ thông dụng",
        words: [
          ["go", "đi"],
          ["come", "đến"],
          ["get", "nhận hoặc lấy"],
          ["make", "làm hoặc tạo ra"],
          ["take", "lấy hoặc mang theo"],
          ["give", "đưa hoặc cho"],
          ["want", "muốn"],
          ["need", "cần"],
          ["use", "sử dụng"],
          ["live", "sống"],
          ["like", "thích"],
          ["love", "yêu hoặc rất thích"],
        ],
      },
      {
        title: "Việc làm mỗi ngày",
        words: [
          ["get up", "thức dậy"],
          ["wash", "rửa"],
          ["clean", "dọn dẹp hoặc làm sạch"],
          ["open", "mở"],
          ["close", "đóng"],
          ["start", "bắt đầu"],
          ["finish", "hoàn thành hoặc kết thúc"],
          ["help", "giúp đỡ"],
          ["call", "gọi điện"],
          ["ask", "hỏi"],
          ["tell", "nói hoặc kể cho ai"],
          ["show", "cho xem hoặc chỉ ra"],
        ],
      },
      {
        title: "Tính chất và cảm xúc",
        words: [
          ["good", "tốt"],
          ["bad", "xấu hoặc tệ"],
          ["big", "to"],
          ["small", "nhỏ"],
          ["new", "mới"],
          ["old", "cũ hoặc già"],
          ["easy", "dễ"],
          ["difficult", "khó"],
          ["happy", "vui"],
          ["sad", "buồn"],
          ["tired", "mệt"],
          ["busy", "bận"],
        ],
      },
      {
        title: "Từ hỏi và từ nối",
        words: [
          ["who", "ai"],
          ["what", "cái gì"],
          ["where", "ở đâu"],
          ["when", "khi nào"],
          ["why", "tại sao"],
          ["how", "như thế nào"],
          ["this", "cái này"],
          ["that", "cái kia"],
          ["these", "những cái này"],
          ["those", "những cái kia"],
          ["and", "và"],
          ["but", "nhưng"],
        ],
      },
    ],
  },
];

const allWords = TOPICS.flatMap((topic) =>
  topic.lessons.flatMap((lesson) => lesson.words),
);
const duplicateTerms = allWords
  .map(([term]) => term.toLocaleLowerCase("en"))
  .filter((term, index, terms) => terms.indexOf(term) !== index);
if (duplicateTerms.length) {
  throw new Error(`Từ bị lặp trong khóa cơ bản: ${[...new Set(duplicateTerms)].join(", ")}`);
}

export const BASIC_VOCABULARY_COURSE_WORD_COUNT = allWords.length;
export const BASIC_VOCABULARY_COURSE_TOPIC_COUNT = TOPICS.length;

const entries: Record<string, BasicVocabularyCourseEntry> = {};
for (const [term, definition] of allWords) {
  entries[term] = { definition, example: "" };
}

export const BASIC_VOCABULARY_COURSE_ENTRIES: Readonly<
  Record<string, BasicVocabularyCourseEntry>
> = entries;

export const BASIC_VOCABULARY_COURSE_TOPICS = TOPICS.map((topic) => ({
  id: topic.id,
  title: topic.title,
  terms: topic.lessons.flatMap((lesson) => lesson.words.map(([term]) => term)),
}));

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function choicesFor(term: string, lessonTerms: readonly string[]): string[] {
  const pool = lessonTerms.filter((candidate) => candidate !== term);
  const start = stableHash(term) % pool.length;
  const choices = [term];
  for (let offset = 0; offset < pool.length && choices.length < 4; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    if (!choices.includes(candidate)) choices.push(candidate);
  }
  return choices;
}

function buildLessons(): BasicVocabularyCourseLesson[] {
  return TOPICS.flatMap((topic) =>
    topic.lessons.map((lesson, index) => ({
      id: `${BASIC_VOCABULARY_COURSE_ID}-${topic.id}-lesson-${index + 1}`,
      title: `${topic.title} · ${lesson.title}`,
      focus: topic.focus,
      topicId: topic.id,
      topicTitle: topic.title,
      questions: lesson.words.map(([term, definition]) => ({
        term,
        prompt: `Từ tiếng Anh nào có nghĩa “${definition}”?`,
        choices: choicesFor(
          term,
          lesson.words.map(([lessonTerm]) => lessonTerm),
        ),
      })),
    })),
  );
}

export const BASIC_VOCABULARY_COURSE_LESSONS = buildLessons();
