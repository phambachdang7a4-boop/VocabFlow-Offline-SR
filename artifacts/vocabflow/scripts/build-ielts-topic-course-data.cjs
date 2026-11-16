const { DatabaseSync } = require("node:sqlite");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const DATABASE_PATH = join(
  __dirname,
  "../../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const OUTPUT_PATH = join(
  __dirname,
  "../domain/ielts-topic-course-data.json",
);
const REVIEWED_EXAMPLES_PATH = join(
  __dirname,
  "../domain/ielts-reviewed-examples.json",
);
const REVIEWED_EXAMPLES = JSON.parse(
  readFileSync(REVIEWED_EXAMPLES_PATH, "utf8"),
);

const TOPICS = [
  {
    id: "education",
    title: "Giáo dục",
    focus: "Trường học, chương trình, đánh giá, kỹ năng và cơ hội học tập.",
    prefixes:
      "educat learn teach school universit academ literac curricul exam assess student scholar tuition tutor degree enroll graduat classroom lectur pedagog knowledge scholarship",
  },
  {
    id: "environment",
    title: "Môi trường và khí hậu",
    focus: "Khí hậu, ô nhiễm, bảo tồn, đa dạng sinh học và tài nguyên.",
    prefixes:
      "environment pollut ecolog biodivers climat conserv sustain renew deforest habitat emission carbon recycl waste drought flood species extinct ecosystem forest wildlife greenhouse contamin resource erosion desert marine ocean",
  },
  {
    id: "technology",
    title: "Công nghệ và trí tuệ nhân tạo",
    focus: "Công nghệ số, dữ liệu, tự động hóa, trí tuệ nhân tạo và quyền riêng tư.",
    prefixes:
      "technol digital comput internet cyber automat innovat robot artificial data privacy software telecommunicat online virtual algorithm machine device encrypt program network database mobile electronic information",
  },
  {
    id: "health",
    title: "Sức khỏe và y tế",
    focus: "Bệnh tật, dinh dưỡng, chăm sóc sức khỏe và phòng ngừa.",
    prefixes:
      "health medic disease nutrition obes prevent sedent diagnos treat therapy mental hospital vaccin infect symptom fitness exercise wellbe wellness patient clinic surgery pharmaceut psycholog epidemic chronic",
  },
  {
    id: "society-work",
    title: "Xã hội và việc làm",
    focus:
      "Từ vựng về cơ hội việc làm, bất bình đẳng, đô thị hóa và hạ tầng.",
    prefixes: "",
  },
  {
    id: "society",
    title: "Xã hội và cộng đồng",
    focus: "Cộng đồng, dân số, phúc lợi, quan hệ xã hội và thay đổi xã hội.",
    prefixes:
      "societ social inequal equal poverty urban population demograph communit culture ethic welfare migration immigrat divers discriminat gender family child generation youth elder citizen human relationship",
  },
  {
    id: "work",
    title: "Việc làm và nghề nghiệp",
    focus: "Nghề nghiệp, kỹ năng, tuyển dụng, lương và môi trường làm việc.",
    prefixes:
      "employ career occupation profession labor wage salary workplace skill recruit retir unemployment productiv entrepreneur management business intern workforce job union office training employee employer",
  },
  {
    id: "economy",
    title: "Kinh tế và tài chính",
    focus: "Thị trường, tài chính, thu nhập, thuế, đầu tư và tăng trưởng.",
    prefixes:
      "econom financ invest consum market trade industry budget tax inflation recession growth income poverty debt bank commerce product export import capital currency wealth profit",
  },
  {
    id: "transport",
    title: "Giao thông và vận tải",
    focus: "Phương tiện, đi lại, hạ tầng, an toàn và ùn tắc giao thông.",
    prefixes:
      "transport traffic vehicle automob road rail aviation airport commut bicycle pedestrian infrastruc congestion subway bus train ship safety motor cycling public transit fuel accident",
  },
  {
    id: "housing",
    title: "Đô thị và nhà ở",
    focus: "Đô thị hóa, nhà ở, quy hoạch, khu dân cư và hạ tầng thành phố.",
    prefixes:
      "urban city housing resident residential architect building construction infrastruc suburb apartment homeless rent property develop planning public neighbor municip village settlement district accommodation",
  },
  {
    id: "tourism",
    title: "Du lịch và lữ hành",
    focus: "Điểm đến, lưu trú, trải nghiệm, di sản và ngành du lịch.",
    prefixes:
      "travel tour tourist tourism vacat holiday hospitality hotel destination explor excursion leisure heritage backpack accommodat flight airline visitor attraction sightseeing journey adventure culture recreation",
  },
  {
    id: "culture",
    title: "Văn hóa và nghệ thuật",
    focus: "Nghệ thuật, âm nhạc, văn học, lễ hội và bản sắc văn hóa.",
    prefixes:
      "culture cultural art artist music literature literary museum heritage tradition custom festival theater cinema film entertain creative creativity perform dance paint sculpt craft religion belief",
  },
  {
    id: "media",
    title: "Truyền thông và quảng cáo",
    focus: "Tin tức, báo chí, truyền hình, quảng cáo và truyền thông số.",
    prefixes:
      "media communicat journal news newspaper broadcast television radio advert propaganda press internet social message information digital public announce publication editor report marketing publicity campaign",
  },
  {
    id: "government",
    title: "Chính phủ và chính sách",
    focus: "Chính quyền, chính sách công, luật lệ, bầu cử và quyền công dân.",
    prefixes:
      "govern politic policy democrat election elect parliament senat politician public citizen law regulat legislat administrat authority vote president minister state nation council rights constitution",
  },
  {
    id: "crime",
    title: "Tội phạm và pháp luật",
    focus: "Tội phạm, hình phạt, tòa án, công lý và an ninh.",
    prefixes:
      "crime criminal offend offense prison punish penalty law legal illegal justice court judge police theft fraud violence violate victim security corrupt detain arrest murder criminality",
  },
  {
    id: "science",
    title: "Khoa học và nghiên cứu",
    focus: "Phương pháp nghiên cứu, thí nghiệm, bằng chứng và phát minh.",
    prefixes:
      "science scientist research experiment hypothes analys data evidence study discovery discover invent invention innovation laboratory technology biology chemistry physics scientific observation theory researcher method",
  },
  {
    id: "energy",
    title: "Năng lượng và tài nguyên",
    focus: "Nguồn năng lượng, nhiên liệu, khoáng sản và hiệu quả sử dụng.",
    prefixes:
      "energy electric electricity power fuel renewable solar wind hydro nuclear fossil resource natural mineral coal oil gas conservation efficien efficient geothermal consumption generator battery",
  },
  {
    id: "agriculture",
    title: "Nông nghiệp và thực phẩm",
    focus: "Trồng trọt, chăn nuôi, nguồn cung thực phẩm và dinh dưỡng.",
    prefixes:
      "agricultur farm farmer farming crop harvest food nutrition diet organic livestock animal fishing fishery soil pesticide fertiliz irrigation rural cultivat grain cereal plantation horticulture",
  },
  {
    id: "globalization",
    title: "Toàn cầu hóa và thương mại",
    focus: "Thương mại quốc tế, doanh nghiệp, di cư và giao lưu văn hóa.",
    prefixes:
      "global internation nation trade transnation corporation culture migration immigrat export import commerce supply manufactur economy market tourism technology outsourc offshor integration foreign multinational",
  },
  {
    id: "family",
    title: "Gia đình và các thế hệ",
    focus: "Nuôi dạy trẻ, quan hệ gia đình, tuổi tác và thay đổi thế hệ.",
    prefixes:
      "family parent child children childhood adolescen adult upbring education develop nurture care childcare maternal paternal sibling generation youth elder aging marriage birth mother father household",
  },
  {
    id: "language",
    title: "Ngôn ngữ và giao tiếp",
    focus: "Ngôn ngữ, khả năng đọc viết, phát âm, dịch thuật và giao tiếp.",
    prefixes:
      "language linguist communicat bilingual multilingual literacy illiteracy vocabulary grammar pronunciation translation interpret dialect accent verbal nonverbal speech writing reading education expression fluency",
  },
  {
    id: "sports",
    title: "Thể thao và giải trí",
    focus: "Thể thao, luyện tập, thi đấu, sở thích và hoạt động giải trí.",
    prefixes:
      "sport athlete athletic exercise fitness competition competitive compete opponent tournament game leisure recreation hobby entertain play physical activity training coach stadium champion team sporting",
  },
  {
    id: "history",
    title: "Lịch sử và di sản",
    focus: "Lịch sử, nền văn minh, khảo cổ, di tích và bảo tồn di sản.",
    prefixes:
      "history historic historical heritage tradition ancient civilization archaeolog artifact museum monument preserv culture revolution empire coloniz colonial legacy era century historian past archaeological",
  },
  {
    id: "equality",
    title: "Bình đẳng và quyền con người",
    focus: "Bình đẳng giới, phân biệt đối xử, quyền và sự hòa nhập.",
    prefixes:
      "gender female male woman femin equality equal inequality discriminat bias sexism empower rights divers inclusion inclusive sexuality minority racism race justice oppression prejudice stereotype",
  },
  {
    id: "development",
    title: "Phát triển và giảm nghèo",
    focus: "Phát triển con người, nghèo đói, viện trợ và cơ hội tiếp cận dịch vụ.",
    prefixes:
      "poverty poor develop developing aid charity charitable humanitarian welfare income inequal economic opportunity education health sanitation infrastruc urban rural human growth progress underdevelop industrial",
  },
  {
    id: "consumerism",
    title: "Tiêu dùng và quảng bá sản phẩm",
    focus: "Người tiêu dùng, mua sắm, thương hiệu, giá cả và quảng cáo.",
    prefixes:
      "consumer consumption consume consumerism purchase product shopping market advertising advertisement advertise brand commercial commerce retail customer spend expenditure waste packaging sale price afford",
  },
  {
    id: "architecture",
    title: "Kiến trúc và thiết kế",
    focus: "Công trình, quy hoạch, thiết kế, vật liệu và không gian sống.",
    prefixes:
      "architect architecture design construction building structure urban planning plan landscape interior exterior modern traditional aesthetic function infrastructure engineer engineering material housing historic sustainable",
  },
  {
    id: "biodiversity",
    title: "Động vật và đa dạng sinh học",
    focus: "Động vật hoang dã, môi trường sống, loài nguy cấp và bảo tồn.",
    prefixes:
      "animal wildlife wild species biodivers ecosystem ecology ecological conservation habitat extinct endangered organism predator prey marine aquatic migrat nature biological botanical zoolog plant forest ocean",
  },
  {
    id: "water",
    title: "Nước và quản lý chất thải",
    focus: "Nguồn nước, xử lý nước thải, vệ sinh, tái chế và khan hiếm tài nguyên.",
    prefixes:
      "water waste recycl sewage sanitation wastewater pollution contaminat clean hygiene resource scarcity shortage supply treatment purification drainage river ocean freshwater drinking irrigation flood",
  },
];

const IELTS_SPELLING_CONVENTION =
  "Ưu tiên chính tả Anh-Anh; các dạng Anh-Mỹ hữu ích được ghi chú là biến thể.";

const SPELLING_VARIANTS = {
  traveler: { british: "traveller", american: "traveler" },
  traveling: { british: "travelling", american: "traveling" },
  traveled: { british: "travelled", american: "traveled" },
  labor: { british: "labour", american: "labor" },
  neighborhood: { british: "neighbourhood", american: "neighborhood" },
  neighborly: { british: "neighbourly", american: "neighborly" },
  offense: { british: "offence", american: "offense" },
  theater: { british: "theatre", american: "theater" },
  program: { british: "programme", american: "program" },
  aging: { british: "ageing", american: "aging" },
  fertilization: { british: "fertilisation", american: "fertilization" },
  industrialization: {
    british: "industrialisation",
    american: "industrialization",
  },
  industrialisation: {
    british: "industrialisation",
    american: "industrialization",
  },
  urbanization: { british: "urbanisation", american: "urbanization" },
  urbanisation: { british: "urbanisation", american: "urbanization" },
};

const BRITISH_VARIANT_SUFFIXES = [
  { british: "isation", alternate: "ization" },
  { british: "ising", alternate: "izing" },
  { british: "ised", alternate: "ized" },
  { british: "ise", alternate: "ize" },
];

function spellingNoteForTerm(term, availableTerms = new Set()) {
  return spellingNoteForAvailableVariant(term, availableTerms);
}

function spellingNoteForAvailableVariant(term, availableTerms) {
  const explicitVariant = SPELLING_VARIANTS[term];
  if (explicitVariant) {
    return term === explicitVariant.british
      ? `US spelling: ${explicitVariant.american}.`
      : `British spelling: ${explicitVariant.british}.`;
  }

  for (const { british, alternate } of BRITISH_VARIANT_SUFFIXES) {
    if (term.endsWith(british)) {
      const alternateTerm =
        term.slice(0, -british.length) + alternate;
      if (availableTerms.has(alternateTerm)) {
        return `Alternate spelling: ${alternateTerm}.`;
      }
    }
    if (term.endsWith(alternate)) {
      const britishTerm = term.slice(0, -alternate.length) + british;
      if (availableTerms.has(britishTerm)) {
        return `British spelling: ${britishTerm}.`;
      }
    }
  }
  return undefined;
}

function applySpellingVariantNotes(entries) {
  const availableTerms = new Set(Object.keys(entries));
  for (const [term, entry] of Object.entries(entries)) {
    const spellingNote = spellingNoteForAvailableVariant(term, availableTerms);
    if (spellingNote) {
      entry.spellingNote = spellingNote;
    } else {
      delete entry.spellingNote;
    }
  }
}

const COMMON_SUFFIXES = new Set(
  [
    "",
    "s",
    "es",
    "ed",
    "ing",
    "er",
    "ers",
    "or",
    "ors",
    "ist",
    "ists",
    "ism",
    "isms",
    "tion",
    "sion",
    "ation",
    "ment",
    "ments",
    "ness",
    "ity",
    "ties",
    "al",
    "ical",
    "ic",
    "ive",
    "ative",
    "able",
    "ible",
    "ful",
    "less",
    "ly",
    "ize",
    "ise",
    "ized",
    "ised",
    "ance",
    "ence",
    "ant",
    "ent",
    "ory",
    "ary",
    "ship",
    "hood",
    "en",
    "ate",
    "ous",
    "ious",
    "y",
    "ion",
    "ization",
    "isation",
  ],
);

const LEGACY_WORDS = new Set(["curriculum", "literacy", "tuition", "compulsory",
  "assessment", "biodiversity", "emissions", "conservation", "sustainable",
  "habitat", "automation", "innovation", "privacy", "access", "digital",
  "nutrition", "prevention", "sedentary", "obesity", "wellbeing", "employment",
  "inequality", "urbanization", "infrastructure", "unemployment"]);

// These are only third-person-singular or -ing verb forms whose base verb is
// already taught. Keep lexicalized nouns/adjectives such as marketing,
// banking, painting, shopping, and developing in the course.
const REDUNDANT_VERB_INFLECTION_REVIEW = new Set(
  `accenting affording assesses assessing banks biases branding brands budgeting
campaigning championing cleans coaches coaching corrupting courting courts
deforesting deserting dieting diets electing elects empowering encrypting enrolling
equaling equals experimenting farms films floods foresting fueling fuels functioning
games importing imports infecting interning inventing investing judges laboring labors
ministering motors paints plans powers presses preventing profiting progresses
progressing punishes races rails recruiting renewing renews reporting researches
researching sculpting ships soils studying supplying teaming teams tours trades trains
transiting treating treats tutoring tutors unions votes wages wastes winds`
    .trim()
    .split(/\s+/),
);

const LEGACY_SOCIETY_ENTRIES = {
  employment: {
    definition: "Việc làm; tình trạng có công việc được trả lương.",
    example: "She is currently looking for full-time employment.",
    exampleTranslation: "Cô ấy hiện đang tìm việc làm toàn thời gian.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
  inequality: {
    definition:
      "Sự bất bình đẳng; tình trạng thiếu công bằng hoặc ngang bằng.",
    example:
      "The report examines income inequality between rural and urban households.",
    exampleTranslation:
      "Báo cáo xem xét bất bình đẳng thu nhập giữa các hộ gia đình nông thôn và thành thị.",
    dictionarySource: "offline",
    exampleSource: "authored",
  },
  urbanization: {
    definition:
      "Đô thị hóa; quá trình dân cư và hoạt động tập trung vào thành phố.",
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
    definition:
      "Tình trạng thất nghiệp; không có việc làm dù đang tìm việc.",
    example: "Unemployment rose after the factory closed.",
    exampleTranslation: "Tỷ lệ thất nghiệp tăng sau khi nhà máy đóng cửa.",
    dictionarySource: "offline",
    exampleSource: "offline",
  },
};

const LEGACY_SOCIETY_LESSON = {
  id: "ielts-topic-vocabulary-v1-society-work",
  title: "Xã hội và việc làm",
  focus:
    "Từ vựng về cơ hội việc làm, bất bình đẳng, đô thị hóa và hạ tầng.",
  questions: [
    {
      term: "employment",
      prompt: "The company created two hundred new _____ opportunities.",
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
      prompt: "Roads, bridges, and water systems are part of public _____.",
      choices: [
        "infrastructure",
        "urbanization",
        "employment",
        "unemployment",
      ],
    },
    {
      term: "unemployment",
      prompt: "When the factory closed, local _____ increased.",
      choices: ["unemployment", "infrastructure", "inequality", "urbanization"],
    },
  ],
};

// Reviewed IELTS example pairs are pinned here so regeneration cannot restore
// a previously identified English/Vietnamese meaning mismatch.
const COURSE_EXAMPLE_OVERRIDES = {
  graduation: {
    example: "She celebrated her graduation after completing her degree.",
    exampleTranslation: "Cô ấy ăn mừng lễ tốt nghiệp sau khi hoàn thành chương trình học.",
  },
  emission: {
    example: "The factory reduced its carbon emission by switching to renewable energy.",
    exampleTranslation: "Nhà máy đã giảm lượng khí thải carbon bằng cách chuyển sang năng lượng tái tạo.",
  },
  carbon: {
    example: "Reducing carbon emissions is essential to limit climate change.",
    exampleTranslation: "Giảm lượng khí thải carbon là điều cần thiết để hạn chế biến đổi khí hậu.",
  },
  waste: {
    example: "The council converted the waste land into a public park.",
    exampleTranslation: "Hội đồng đã chuyển vùng đất hoang thành công viên công cộng.",
  },
  drought: {
    example: "The region suffered a severe drought after months without rain.",
    exampleTranslation: "Khu vực này đã trải qua một đợt hạn hán nghiêm trọng sau nhiều tháng không có mưa.",
  },
  forests: {
    example: "The city forests its hillsides to reduce soil erosion.",
    exampleTranslation: "Thành phố trồng rừng trên các sườn đồi để giảm xói mòn đất.",
  },
  desert: {
    example: "Farmers in the region must adapt to the harsh desert climate.",
    exampleTranslation: "Nông dân trong khu vực phải thích nghi với khí hậu sa mạc khắc nghiệt.",
  },
  social: {
    example: "Social inequality can limit access to education and healthcare.",
    exampleTranslation: "Bất bình đẳng xã hội có thể hạn chế khả năng tiếp cận giáo dục và chăm sóc sức khỏe.",
  },
  recession: {
    example: "During the recession, many small businesses struggled to stay open.",
    exampleTranslation: "Trong thời kỳ suy thoái, nhiều doanh nghiệp nhỏ chật vật để tiếp tục hoạt động.",
  },
  inflation: {
    example: "Rising inflation has made food and housing less affordable.",
    exampleTranslation: "Lạm phát gia tăng khiến thực phẩm và nhà ở trở nên khó chi trả hơn.",
  },
  bank: {
    example: "The central bank raised interest rates to control inflation.",
    exampleTranslation: "Ngân hàng trung ương đã tăng lãi suất để kiểm soát lạm phát.",
  },
  import: {
    example: "The import of essential medicines increased during the health crisis.",
    exampleTranslation: "Việc nhập khẩu các loại thuốc thiết yếu đã tăng lên trong cuộc khủng hoảng y tế.",
  },
  profit: {
    example: "The company made a modest profit by reducing energy costs.",
    exampleTranslation: "Công ty đã thu được một khoản lợi nhuận vừa phải nhờ giảm chi phí năng lượng.",
  },
  road: {
    example: "The new road connects the village to the nearest city.",
    exampleTranslation: "Con đường mới nối ngôi làng với thành phố gần nhất.",
  },
  arts: {
    example: "Public funding helps local arts programs reach more young people.",
    exampleTranslation: "Nguồn tài trợ công giúp các chương trình nghệ thuật địa phương tiếp cận nhiều bạn trẻ hơn.",
  },
  planning: {
    example: "Careful planning helped the city reduce traffic congestion.",
    exampleTranslation: "Việc quy hoạch cẩn thận đã giúp thành phố giảm ùn tắc giao thông.",
  },
  sculpt: {
    example: "Local artists sculpt figures from clay for the annual festival.",
    exampleTranslation: "Các nghệ sĩ địa phương tạc tượng đất sét cho lễ hội hằng năm.",
  },
  capital: {
    example: "Small businesses often need extra capital to expand.",
    exampleTranslation: "Các doanh nghiệp nhỏ thường cần thêm vốn để mở rộng.",
  },
  religious: {
    example: "Religious traditions can shape how communities celebrate important events.",
    exampleTranslation: "Truyền thống tôn giáo có thể định hình cách cộng đồng kỷ niệm những sự kiện quan trọng.",
  },
  functionality: {
    example: "The new building combines energy efficiency with practical functionality.",
    exampleTranslation: "Tòa nhà mới kết hợp hiệu quả năng lượng với tính ứng dụng thực tế.",
  },
  fossilise: {
    example: "The remains may fossilise in sediment over millions of years.",
    exampleTranslation: "Các di hài có thể hóa thạch trong trầm tích qua hàng triệu năm.",
  },
  coaled: {
    example: "The steam locomotive was coaled before its long journey.",
    exampleTranslation: "Đầu máy hơi nước được tiếp than trước chuyến đi dài.",
  },
  coaling: {
    example: "Coaling the ship took several hours before it left port.",
    exampleTranslation: "Việc tiếp than cho con tàu mất vài giờ trước khi nó rời cảng.",
  },
  coals: {
    example: "The worker coals the furnace before the night shift begins.",
    exampleTranslation: "Người công nhân tiếp than cho lò trước khi ca đêm bắt đầu.",
  },
  naturalise: {
    example: "The local council will naturalise the riverbank by restoring native plants.",
    exampleTranslation: "Hội đồng địa phương sẽ khôi phục vẻ tự nhiên của bờ sông bằng cách trồng lại các loài cây bản địa.",
  },
  crops: {
    example: "The farm crops its fields twice a year.",
    exampleTranslation: "Trang trại gieo trồng trên các cánh đồng của mình hai lần mỗi năm.",
  },
  diet: {
    example: "The Japanese Diet debated a bill on food safety.",
    exampleTranslation: "Quốc hội Nhật Bản đã thảo luận một dự luật về an toàn thực phẩm.",
  },
  dietary: {
    example: "The clinic gave patients dietary advice for managing high blood pressure.",
    exampleTranslation: "Phòng khám đưa ra lời khuyên về chế độ ăn uống cho bệnh nhân để kiểm soát huyết áp cao.",
  },
  corporation: {
    example: "The corporation opened a new office to serve customers in the region.",
    exampleTranslation: "Tập đoàn đã mở một văn phòng mới để phục vụ khách hàng trong khu vực.",
  },
  foreigner: {
    example: "A foreigner living in a new country may need time to learn local customs.",
    exampleTranslation: "Một người nước ngoài sống ở quốc gia mới có thể cần thời gian để tìm hiểu phong tục địa phương.",
  },
  nurture: {
    example: "The child benefited from the love and nurture of a supportive family.",
    exampleTranslation: "Đứa trẻ được hưởng lợi từ tình yêu thương và sự nuôi dưỡng của một gia đình luôn hỗ trợ em.",
  },
  paternally: {
    example: "She answered paternally and smiled.",
    exampleTranslation: "Cô ấy trả lời một cách đầy bao dung như một người cha và mỉm cười.",
  },
  sexuality: {
    example: "The study examines how culture and social expectations shape sexuality.",
    exampleTranslation: "Nghiên cứu xem xét cách văn hóa và kỳ vọng xã hội định hình tính dục.",
  },
  vaccinate: {
    example: "The clinic will vaccinate children against measles before the school year begins.",
    exampleTranslation: "Phòng khám sẽ tiêm vắc-xin phòng bệnh sởi cho trẻ em trước khi năm học bắt đầu.",
  },
  enroll: {
    example: "Students can enroll in the course online before classes begin.",
    exampleTranslation: "Học sinh có thể đăng ký khóa học trực tuyến trước khi lớp bắt đầu.",
  },
  artificially: {
    example: "The lake's water level was artificially maintained during the drought.",
    exampleTranslation: "Mực nước hồ được duy trì nhân tạo trong đợt hạn hán.",
  },
  psychologise: {
    example: "Some researchers psychologise social problems instead of examining their economic causes.",
    exampleTranslation: "Một số nhà nghiên cứu lý giải các vấn đề xã hội bằng tâm lý thay vì xem xét nguyên nhân kinh tế.",
  },
  ethic: {
    example: "A strong ethic of fairness should guide every public decision.",
    exampleTranslation: "Tinh thần đề cao sự công bằng nên định hướng mọi quyết định công.",
  },
  skill: {
    example: "Practical skill can help workers adapt to new technology.",
    exampleTranslation: "Kỹ năng thực tế có thể giúp người lao động thích nghi với công nghệ mới.",
  },
  productivity: {
    example: "Higher productivity helped the factory meet rising demand.",
    exampleTranslation: "Năng suất cao hơn đã giúp nhà máy đáp ứng nhu cầu ngày càng tăng.",
  },
  entrepreneur: {
    example: "The entrepreneur opened a small café that quickly became popular.",
    exampleTranslation: "Nhà khởi nghiệp mở một quán cà phê nhỏ nhanh chóng trở nên nổi tiếng.",
  },
  publicize: {
    example: "The charity used local media to publicize its clean-water campaign.",
    exampleTranslation: "Tổ chức từ thiện đã sử dụng truyền thông địa phương để quảng bá chiến dịch nước sạch.",
  },
  victimise: {
    example: "The policy could victimise low-income families who rely on public transport.",
    exampleTranslation: "Chính sách này có thể khiến các gia đình thu nhập thấp phụ thuộc vào phương tiện công cộng trở thành nạn nhân.",
  },
  victimize: {
    example: "The policy could victimize low-income families who rely on public transport.",
    exampleTranslation: "Chính sách này có thể khiến các gia đình thu nhập thấp phụ thuộc vào phương tiện công cộng trở thành nạn nhân.",
  },
  murdering: {
    example: "He was arrested for murdering a local shopkeeper.",
    exampleTranslation: "Anh ta bị bắt vì sát hại một chủ cửa hàng địa phương.",
  },
  expression: {
    example: "Cold expression is used to extract oil from seeds without heat.",
    exampleTranslation: "Phương pháp ép lạnh được dùng để chiết xuất dầu từ hạt mà không cần nhiệt.",
  },
  hobby: {
    example: "Many people take up a hobby to relax after work.",
    exampleTranslation: "Nhiều người bắt đầu một sở thích để thư giãn sau giờ làm.",
  },
  socially: {
    example: "Volunteering helps people connect socially with their neighbors.",
    exampleTranslation: "Hoạt động tình nguyện giúp mọi người kết nối với hàng xóm.",
  },
  corruptly: {
    example: "The official acted corruptly by accepting payments from a contractor.",
    exampleTranslation: "Viên chức đã hành động tham nhũng khi nhận tiền từ một nhà thầu.",
  },
  historically: {
    example: "Historically, many families relied on farming for their income.",
    exampleTranslation: "Trong lịch sử, nhiều gia đình dựa vào nghề nông để kiếm sống.",
  },
  inclusively: {
    example: "The school designed its lessons inclusively so every student could participate.",
    exampleTranslation: "Nhà trường thiết kế bài học theo hướng hòa nhập để mọi học sinh đều có thể tham gia.",
  },
  commercially: {
    example: "The product was not commercially successful despite its innovative design.",
    exampleTranslation: "Sản phẩm không thành công về mặt thương mại dù có thiết kế sáng tạo.",
  },
  jobs: {
    example: "The company jobs out its customer-support work to a specialist provider.",
    exampleTranslation: "Công ty thuê một đơn vị chuyên môn bên ngoài thực hiện công việc hỗ trợ khách hàng.",
  },
  city: {
    example: "The city invested in reliable public transport to reduce traffic congestion.",
    exampleTranslation: "Thành phố đã đầu tư vào hệ thống giao thông công cộng đáng tin cậy để giảm ùn tắc.",
  },
  punish: {
    example: "Schools should punish serious misconduct fairly and consistently.",
    exampleTranslation: "Nhà trường nên xử phạt hành vi sai trái nghiêm trọng một cách công bằng và nhất quán.",
  },
  engineer: {
    example: "The engineer designed a flood-resistant bridge for the coastal community.",
    exampleTranslation: "Kỹ sư đã thiết kế một cây cầu chống lũ cho cộng đồng ven biển.",
  },
  treat: {
    example: "Please let me give you a treat today.",
    exampleTranslation: "Hôm nay, hãy để tôi đãi bạn một món nhé.",
  },
  treater: {
    example: "The treater helped both sides reach an agreement.",
    exampleTranslation: "Người thương lượng đã giúp cả hai bên đạt được thỏa thuận.",
  },
  hospitalisation: {
    example: "The hospitalisation was useful in class.",
    exampleTranslation: "Việc nhập viện có ích trong lớp học.",
  },
  fertilization: {
    example: "Fertilization happens after the pollen reaches the flower.",
    exampleTranslation: "Sự thụ tinh diễn ra sau khi phấn hoa đến được hoa.",
  },
  afford: {
    example: "I cannot afford to lose my job right now.",
    exampleTranslation: "Lúc này tôi không thể để mất việc.",
  },
  industrially: {
    example: "She answered industrially and smiled.",
    exampleTranslation: "Cô ấy trả lời về mặt công nghiệp rồi mỉm cười.",
  },
  biologically: {
    example: "He moved biologically through the crowd.",
    exampleTranslation: "Anh ấy di chuyển qua đám đông theo cách thức sinh học.",
  },
};

const COURSE_DEFINITION_OVERRIDES = {
  tutor: "Gia sư; người dạy kèm cho một cá nhân hoặc nhóm nhỏ.",
  classroom: "Lớp học; phòng học trong trường.",
  enroll: "Đăng ký hoặc ghi danh tham gia khóa học, trường học hay chương trình.",
  scholar: "Học giả; người có kiến thức chuyên sâu, thường tham gia nghiên cứu.",
  conservative: "Thận trọng, có xu hướng giữ nguyên hiện trạng hoặc truyền thống.",
  schools: "Trường học; các cơ sở giáo dục dành cho học sinh.",
  functional: "Có công năng thực tế; hoạt động đúng mục đích.",
  predatory: "Có tập tính săn bắt con mồi; ăn thịt.",
  graduation: "Lễ tốt nghiệp; việc hoàn thành một chương trình học.",
  emission: "Lượng chất hoặc khí được thải ra, thường là chất gây ô nhiễm.",
  carbon: "Cacbon; nguyên tố hóa học có trong than đá và khí thải carbon.",
  drought: "Đợt hạn hán kéo dài do thiếu mưa.",
  forests: "Trồng cây gây rừng trên một khu vực đất.",
  desert: "Sa mạc; vùng đất khô cằn có rất ít mưa.",
  social: "Thuộc về xã hội hoặc các mối quan hệ giữa người với người.",
  recession: "Suy thoái kinh tế; giai đoạn hoạt động kinh tế giảm sút.",
  inflation: "Lạm phát; tình trạng giá cả hàng hóa và dịch vụ tăng lên.",
  bank: "Ngân hàng; tổ chức cung cấp dịch vụ tài chính.",
  import: "Việc nhập khẩu hàng hóa từ nước ngoài vào một quốc gia.",
  profit: "Lợi nhuận; khoản tiền còn lại sau khi trừ chi phí.",
  road: "Đường bộ; lối đi dành cho phương tiện và người đi lại.",
  arts: "Nghệ thuật hoặc các hoạt động sáng tạo như âm nhạc và hội họa.",
  planning: "Việc lập kế hoạch để xác định trước cách thực hiện một việc.",
  sculpt: "Tạc hoặc tạo hình một vật thể bằng cách đục, nặn hay gọt vật liệu.",
  capital: "Vốn; tiền hoặc tài sản dùng để thành lập hay phát triển một hoạt động kinh doanh.",
  religious: "Thuộc về tôn giáo hoặc niềm tin tôn giáo.",
  functionality: "Tính năng hoặc khả năng hoạt động của một thiết kế hay sản phẩm.",
  hobby: "Sở thích hoặc hoạt động thường làm trong thời gian rảnh.",
  fossilise: "Hóa thạch; được bảo tồn thành hóa thạch qua thời gian địa chất.",
  coaled: "Đã được tiếp hoặc nạp than làm nhiên liệu.",
  coaling: "Việc tiếp than hoặc đang nạp than làm nhiên liệu.",
  coals: "Tiếp than hoặc nạp than làm nhiên liệu.",
  naturalise: "Khôi phục trạng thái tự nhiên cho một khu vực, thường bằng cây bản địa.",
  crops: "Gieo trồng hoặc canh tác đất để thu hoạch nông sản.",
  diet: "Quốc hội Nhật Bản; cơ quan lập pháp của Nhật Bản.",
  corporation: "Công ty hoặc tập đoàn được thành lập để kinh doanh.",
  foreigner: "Người đến từ hoặc mang quốc tịch của một quốc gia khác.",
  nurture: "Sự chăm sóc và nuôi dưỡng giúp một người hoặc vật phát triển.",
  victimise: "Đối xử bất công hoặc gây hại cho ai, biến họ thành nạn nhân.",
  victimize: "Đối xử bất công hoặc gây hại cho ai, biến họ thành nạn nhân.",
  murdering: "Sát hại; hành động giết người một cách trái pháp luật.",
  artificially: "Bằng cách nhân tạo hoặc do con người tạo ra, không phải tự nhiên.",
  psychologise: "Giải thích hoặc phân tích một vấn đề theo góc độ tâm lý.",
  corruptly: "Một cách tham nhũng hoặc bất chính, thường để trục lợi.",
  inclusively: "Theo cách bao gồm mọi người và không loại trừ nhóm nào.",
  jobs: "Thuê ngoài; giao công việc cho một cá nhân hoặc đơn vị bên ngoài.",
};

const COURSE_HEADWORD_REPLACEMENTS = {
  capitally: "capital",
  religioner: "religious",
  functionate: "functionality",
  salarying: "salary",
};

// Exact dictionary headwords reviewed as too rare, obsolete, or malformed for
// IELTS lessons. Productive inflections are reviewed separately; do not use
// broad suffix rules here.
const RARE_HEADWORD_REVIEW = {
  academical: "Rare variant of academic.",
  studentship: "Uncommon term for a scholarship.",
  tutorship: "Rare term for guardianship.",
  graduator: "Obscure tool name unrelated to graduation.",
  pedagogism: "Rare theoretical term.",
  extinctive: "Rare adjective with an unhelpful example.",
  forestal: "Rare adjective; forestry is the usual term.",
  resourceless: "Rare adjective with an unnatural example.",
  wasteless: "Rare adjective with an unrelated definition.",
  algorithmical: "Rare variant of algorithmic.",
  machineless: "Rare adjective not useful for technology lessons.",
  artificialize: "Rare verb with an unnatural example.",
  artificialness: "Rare noun; artificiality is the usual form.",
  programer: "Misspelling of programmer.",
  mentalism: "Specialist term unrelated to mental health vocabulary.",
  hospitaler: "Archaic term for a religious order member.",
  hospitalism: "Obsolete or specialist hospital-administration term.",
  pharmaceutist: "Rare variant of pharmacist.",
  psychologism: "Rare theoretical term, not general psychology vocabulary.",
  epidemical: "Rare variant of epidemic.",
  vaccinal: "Rare or obsolete adjective with a misleading definition.",
  sociality: "Rare abstract noun; social interaction is the useful concept.",
  socialness: "Rare and unnatural abstract noun.",
  jobation: "Archaic word meaning a scolding.",
  incomeless: "Rare adjective; low-income is the useful expression.",
  inflationism: "Rare economic ideology, not core inflation vocabulary.",
  inflationist: "Rare label for an advocate of inflationism.",
  roadless: "Rare adjective with little value for transport lessons.",
  trainless: "Rare adjective with an unnatural example.",
  motory: "Rare technical adjective.",
  buss: "Obsolete spelling of a kiss, not a bus.",
  excursional: "Rare adjective; excursion is the common form.",
  excursionist: "Uncommon label for a tourist.",
  artistical: "Rare variant of artistic.",
  filmize: "Rare verb; make into a film is the usual expression.",
  craftless: "Rare adjective with an unrelated definition.",
  religionise: "Rare variant of religionize, itself uncommon.",
  religionism: "Rare term for religious fanaticism.",
  religionist: "Uncommon and potentially misleading label.",
  advertence: "Rare noun; attention is the common word.",
  advertent: "Rare adjective with an unnatural example.",
  pressor: "Specialist medical or mechanical term, not media vocabulary.",
  democratism: "Uncommon ideological term, not core government vocabulary.",
  presidentship: "Rare term for a president's office.",
  voteless: "Rare adjective; without voting rights is clearer.",
  criminalist: "Uncommon specialist occupation.",
  offenseless: "Rare variant of inoffensive.",
  prisoned: "Rare or obsolete verb form.",
  prisoning: "Rare or obsolete verb form.",
  justiceship: "Rare term for judicial office.",
  courter: "Rare term for a suitor.",
  arrestment: "Rare legal noun; arrest is the common term.",
  arrestor: "Uncommon specialist term for an arresting person or device.",
  scientistic: "Rare adjective for scientism.",
  methodism: "Religious denomination, not a research-method term.",
  methodise: "Uncommon verb; organize systematically is clearer.",
  methodize: "Uncommon verb; organize systematically is clearer.",
  fossilate: "Rare verb; fossilize is the usual form.",
  fossilism: "Rare noun with a misleading example.",
  fossilist: "Rare or obsolete label for a fossil researcher.",
  coaler: "Uncommon occupational term, not core energy vocabulary.",
  farmery: "Rare noun for a farm.",
  cropful: "Rare adjective unrelated to crop production.",
  foodless: "Rare adjective; without food is clearer.",
  organicism: "Specialist philosophical term, not food vocabulary.",
  animalness: "Rare abstract noun.",
  irrigational: "Rare adjective; irrigation is the useful headword.",
  grainer: "Specialist trade term unrelated to grain production.",
  foreignism: "Rare linguistic term, not globalization vocabulary.",
  foreignize: "Rare verb with an unnatural example.",
  integrationist: "Uncommon political label, not core globalization vocabulary.",
  educationist: "Uncommon variant of educator.",
  maternalize: "Rare verb with an unnatural example.",
  expressional: "Rare adjective; expressive is the common form.",
  sportive: "Uncommon adjective; sporting is more natural.",
  historicism: "Specialist academic concept, not core history vocabulary.",
  historicist: "Specialist academic label.",
  historicize: "Uncommon academic verb.",
  colonialness: "Rare abstract noun.",
  revolutionism: "Rare ideological noun.",
  revolutionist: "Uncommon variant of revolutionary.",
  poorness: "Rare noun; poverty is the useful headword.",
  engineership: "Rare term for the profession of engineering.",
  interiorize: "Specialist psychological verb, not architecture vocabulary.",
  exteriorise: "Rare variant of exteriorize with a non-architectural sense.",
  exteriorization: "Specialist psychological term, not architecture vocabulary.",
  rivered: "Rare or obsolete adjective with an unnatural example.",
  rivery: "Rare or obsolete adjective with an unnatural example.",
};

// Dictionary examples are pinned here when a broad topic prefix selects a
// different sense from the one learners need. Match exact headwords only:
// related inflections and other members of the word family remain eligible.
const DICTIONARY_SENSE_REVIEW = {
  learn: {
    example: "We were surprised to learn the news today.",
    reason: "Uses learn to mean find out, not acquire knowledge through study.",
  },
  assessable: {
    example: "The house is assessable for tax.",
    reason: "Uses the tax-valuation sense rather than educational assessment.",
  },
  assessor: {
    example: "The assessor checked the value of the house.",
    reason: "Names a property tax valuer, not someone assessing learning.",
  },
  degree: {
    example: "I agree with your opinion in some degree.",
    reason: "Uses degree to mean extent, not an academic qualification.",
  },
  examen: {
    example: "His examen of the facts was careful and fair.",
    reason: "Uses a rare critical examination sense, not a school exam.",
  },
  modern: {
    example: "She was a modern who liked new ideas.",
    reason: "Uses modern as a noun for a person, not the architecture adjective.",
  },
  plant: {
    example: "This large plant produces thousands of cars every year.",
    reason: "Uses plant to mean factory, not a living organism.",
  },
};

// These selected dictionary rows pair an unrelated definition with the
// example used by the lesson. Keep both source fields pinned so a dictionary
// refresh cannot silently replace a reviewed mismatch.
const DICTIONARY_DEFINITION_REVIEW = {
  tutor: {
    definition: "Người giám hộ (đứa trẻ vị thành niên).",
    example: "The tutor met the student after class.",
  },
  classroom: {
    definition: "Phòng đọc.",
    example: "The students waited quietly in the classroom.",
  },
  scholar: {
    definition: "Môn sinh.",
    example: "As a scholar, she loved learning new ideas.",
  },
  conservative: {
    definition: "Để giữ gìn, để duy trì, để bảo tồn, để bảo toàn.",
    example: "The museum used conservative methods to save paper.",
  },
  schools: {
    definition: "Dành cho nhà trường.",
    example: "Many local schools offer free lunch to students.",
  },
  functional: {
    definition: "Functionary.",
    example: "The chair is functional, but it is not pretty.",
  },
  predatory: {
    definition: "Ăn cướp, ăn bóc; ăn trộm.",
    example: "The predatory dog chased the small cat.",
  },
};

const REQUIRED_RELATED_HEADWORDS = ["plants", "assessed", "graduated", "modernise"];

const REQUIRED_COMMON_INFLECTIONS = [
  "educating",
  "learning",
  "schools",
  "assessed",
  "graduated",
  "enrolled",
  "polluted",
  "automated",
  "recruited",
  "taxed",
  "transported",
  "traveling",
  "advertising",
  "governing",
  "punished",
  "researched",
  "farming",
];

const CURATED_TOPIC_ENTRIES = {
  capital: {
    topicId: "economy",
    pos: "N",
    definition: "Vốn; tiền hoặc tài sản dùng để thành lập hay phát triển một hoạt động kinh doanh.",
    example: "Small businesses often need extra capital to expand.",
    exampleTranslation: "Các doanh nghiệp nhỏ thường cần thêm vốn để mở rộng.",
  },
  religious: {
    topicId: "culture",
    pos: "A",
    definition: "Thuộc về tôn giáo hoặc niềm tin tôn giáo.",
    example: "Religious traditions can shape how communities celebrate important events.",
    exampleTranslation: "Truyền thống tôn giáo có thể định hình cách cộng đồng kỷ niệm những sự kiện quan trọng.",
  },
  functionality: {
    topicId: "architecture",
    pos: "N",
    definition: "Tính năng hoặc khả năng hoạt động của một thiết kế hay sản phẩm.",
    example: "The new building combines energy efficiency with practical functionality.",
    exampleTranslation: "Tòa nhà mới kết hợp hiệu quả năng lượng với tính ứng dụng thực tế.",
  },
};

// Review the displayed label against how the headword is used in its lesson
// example. Keep the dictionary word; only correct its lesson-specific POS.
const COURSE_POS_OVERRIDES = {
  schools: {
    partOfSpeech: "N",
    sourceExample: "Many local schools offer free lunch to students.",
  },
  flooding: {
    partOfSpeech: "N",
    sourceExample: "Flooding washed mud across the road.",
  },
  computed: {
    partOfSpeech: "V",
    sourceExample: "The answer was computed correctly.",
  },
  exercise: {
    partOfSpeech: "V",
    sourceExample: "You may exercise your right to speak freely.",
  },
  press: {
    partOfSpeech: "V",
    sourceExample: "Please press the button to start the machine.",
  },
  solarize: {
    partOfSpeech: "V",
    sourceExample: "Too much light can solarize a photo.",
  },
  neighbor: {
    partOfSpeech: "N",
    sourceExample: "The house neighbor helps us with repairs.",
  },
};

const POS_GROUPS = {
  n: "noun",
  noun: "noun",
  v: "verb",
  verb: "verb",
  a: "adjective",
  adj: "adjective",
  adjective: "adjective",
  adv: "adverb",
  adverb: "adverb",
};

const EXCLUDED_HEADWORDS = new Set(
  [
    "learnable",
    "teachable",
    "schoolable",
    "schoolership",
    "environ",
    "climatize",
    "conservable",
    "conserver",
    "sustainer",
    "sustainment",
    "carbonation",
    "carbonic",
    "carbonize",
    "carbonise",
    "carbonous",
    "computable",
    "computative",
    "computist",
    "computor",
    "automat",
    "automatical",
    "automative",
    "automatism",
    "automatist",
    "automatization",
    "digitalize",
    "medic",
    "medicable",
    "medicative",
    "preventer",
    "careerism",
    "careered",
    "careering",
    "skillion",
    "recruital",
    "commutant",
    "commutate",
    "commutation",
    "commutative",
    "railer",
    "airportable",
    "architectors",
    "constructional",
    "constructionist",
    "explorate",
    "explorative",
    "tourer",
    "traditionary",
    "customable",
    "customer",
    "newspaperism",
    "journalize",
    "politicly",
    "adultness",
    "careen",
    "birther",
    "fathership",
    "pronunciational",
    "accentor",
    "sportful",
    "gameful",
    "gamely",
    "gameness",
    "gamey",
    "coacher",
    "preyer",
    "wilden",
    "wilding",
    "ancienter",
    "anciently",
    "ancientness",
    "archaeologer",
    "century-plant",
    "maleness",
    "aider",
    "charitableness",
    "progressist",
    "consumership",
    "brandy",
    "commercialist",
    "designable",
    "designative",
    "designation",
    "planation",
    "planation",
    "planless",
    "exteriorly",
    "exteriority",
    "preyer",
    "migrator",
    "animality",
    "animalism",
    "animalist",
    "animalization",
    "waterer",
    "cleanable",
    "contaminator",
    "transportable",
    "capitally",
    "religioner",
    "functionate",
    "salarying",
  ],
);

function normalizePos(value) {
  return POS_GROUPS[String(value ?? "").trim().toLowerCase()] ?? "other";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function headwordForms(term) {
  const forms = new Set([term]);
  const add = (form) => {
    if (form) forms.add(form);
  };

  if (term.endsWith("y")) {
    if (/[^aeiou]y$/.test(term)) {
      const stem = term.slice(0, -1);
      add(`${stem}ies`);
      add(`${stem}ied`);
    } else {
      add(`${term}s`);
    }
    add(`${term}ing`);
  } else if (term.endsWith("e")) {
    const stem = term.slice(0, -1);
    add(`${stem}ing`);
    add(`${term}s`);
    add(`${term}d`);
  } else {
    add(`${term}s`);
    add(`${term}ed`);
    add(`${term}ing`);
    if (/(?:s|x|z|ch|sh|o)$/.test(term)) add(`${term}es`);
  }
  if (/[^aeiou][aeiou][bcdfghjklmnpqrstvz]$/.test(term)) {
    const doubledStem = `${term}${term.at(-1)}`;
    add(`${doubledStem}ed`);
    add(`${doubledStem}ing`);
  }

  return [...forms];
}

function containsHeadword(term, example) {
  return headwordForms(term).some((form) =>
    new RegExp(`\\b${escapeRegExp(form)}\\b`, "i").test(example),
  );
}

function containsExactHeadword(term, example) {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(example);
}

function hasSentenceTemplatePlaceholder(example) {
  return (
    /_{2,}/.test(example) ||
    /\{\{[^{}]*\}\}|\{(?:word|term|blank|answer|insert|placeholder)\}/i.test(
      example,
    ) ||
    /\[(?:\s*(?:word|term|blank|answer|insert|placeholder)\s*|_{2,})\]/i.test(
      example,
    ) ||
    /<\s*(?:word|term|blank|answer|insert|placeholder)\s*>/i.test(example) ||
    /\b(?:TBD|TODO)\b/i.test(example)
  );
}

function openingEnglishSubjectPronoun(example) {
  const match = String(example ?? "").match(
    /^\s*(?:(?:[^,.!?]{1,45}),\s*)?(I|we|he|she|they)\b/i,
  );
  if (!match) return null;

  const pronoun = match[1].toLowerCase();
  if (pronoun === "he") return "male";
  if (pronoun === "she") return "female";
  if (pronoun === "they") return "third-person";
  return "first-person";
}

function openingVietnameseSubjectPronoun(translation) {
  const text = String(translation ?? "").trim();
  const intro = /^(?:(?:hôm nay|ngày mai|lúc này|hiện nay)\s*,?\s*)?/i;
  const subjectText = text.replace(intro, "");
  const alternatives = [
    [
      "male",
      /^(?:anh ấy|anh ta|ông ấy|ông ta|cậu ấy|cậu ta|hắn)(?=\s|[,.:;!?]|$)/i,
    ],
    [
      "female",
      /^(?:cô ấy|cô ta|chị ấy|chị ta|bà ấy|bà ta|nàng)(?=\s|[,.:;!?]|$)/i,
    ],
    ["third-person", /^(?:bọn họ|chúng nó|họ)(?=\s|[,.:;!?]|$)/i],
    [
      "first-person",
      /^(?:chúng tôi|chúng ta|chúng mình|chúng em|tôi|mình|ta)(?=\s|[,.:;!?]|$)/i,
    ],
  ];
  return (
    alternatives.find(([, pattern]) => pattern.test(subjectText))?.[0] ?? null
  );
}

function subjectPronounCategory(pronoun) {
  const value = String(pronoun ?? "").toLowerCase();
  if (/^(?:he|anh ấy|anh ta|ông ấy|ông ta|cậu ấy|cậu ta|hắn)$/.test(value)) {
    return "male";
  }
  if (/^(?:she|cô ấy|cô ta|chị ấy|chị ta|bà ấy|bà ta|nàng)$/.test(value)) {
    return "female";
  }
  if (/^(?:they|bọn họ|chúng nó|họ)$/.test(value)) return "third-person";
  if (
    /^(?:i|we|chúng tôi|chúng ta|chúng mình|chúng em|tôi|mình|ta)$/.test(
      value,
    )
  ) {
    return "first-person";
  }
  return null;
}

function laterEnglishClauseSubjects(example) {
  const text = String(example ?? "");
  const pronoun = "(I|we|he|she|they)";
  const clauseMarkers =
    "(?:that|whether|if|when|while|because|although|though|unless|until|once|after|before|since|whereas|where|as|and|but|or|so|yet)";
  const reportingVerbs =
    "(?:say|says|said|think|thinks|thought|know|knows|knew|believe|believes|believed|claim|claims|claimed|report|reports|reported|explain|explains|explained|mention|mentions|mentioned|promise|promises|promised|expect|expects|expected|hope|hopes|hoped|feel|feels|felt|hear|hears|heard|see|sees|saw|notice|notices|noticed|realize|realizes|realized|remember|remembers|remembered|tell|tells|told)";
  const subjects = [];
  const patterns = [
    new RegExp(`\\b${clauseMarkers}\\s+${pronoun}\\b`, "gi"),
    new RegExp(`\\b${reportingVerbs}\\s+${pronoun}\\b`, "gi"),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      subjects.push({
        index: match.index,
        category: subjectPronounCategory(match[1]),
      });
    }
  }
  return subjects
    .sort((left, right) => left.index - right.index)
    .filter((subject, index, all) => subject.index !== all[index - 1]?.index)
    .map(({ category }) => category);
}

function laterVietnameseClauseSubjects(translation) {
  const text = String(translation ?? "");
  const pronoun =
    "(chúng tôi|chúng ta|chúng mình|chúng em|bọn họ|chúng nó|anh ấy|anh ta|ông ấy|ông ta|cậu ấy|cậu ta|hắn|cô ấy|cô ta|chị ấy|chị ta|bà ấy|bà ta|nàng|họ|tôi|mình|ta)";
  const clauseMarkers =
    "(?:rằng|là|nếu|khi|trong khi|mặc dù|dù|bởi vì|vì|sau khi|trước khi|cho dù|và|nhưng|hoặc|nên)";
  const reportingVerbs =
    "(?:nói|bảo|nghĩ|biết|tin|kể|khẳng định|nhận ra|cho biết|giải thích|hy vọng|mong|cảm thấy|nhận thấy)";
  const subjects = [];
  const patterns = [
    new RegExp(`${clauseMarkers}\\s+${pronoun}(?=\\s|[,.:;!?]|$)`, "gi"),
    new RegExp(`${reportingVerbs}\\s+${pronoun}(?=\\s|[,.:;!?]|$)`, "gi"),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const matchedPronoun = match[1];
      subjects.push({
        index: match.index + match[0].lastIndexOf(matchedPronoun),
        category: subjectPronounCategory(matchedPronoun),
      });
    }
  }
  return subjects
    .sort((left, right) => left.index - right.index)
    .filter((subject, index, all) => subject.index !== all[index - 1]?.index)
    .map(({ category }) => category);
}

function hasSubjectPronounConflict(example, translation) {
  const englishSubject = openingEnglishSubjectPronoun(example);
  const vietnameseSubject = openingVietnameseSubjectPronoun(translation);
  if (
    englishSubject &&
    vietnameseSubject &&
    englishSubject !== vietnameseSubject
  ) {
    return true;
  }

  const englishClauseSubjects = laterEnglishClauseSubjects(example);
  const vietnameseClauseSubjects = laterVietnameseClauseSubjects(translation);
  if (
    englishClauseSubjects.length === 0 ||
    englishClauseSubjects.length !== vietnameseClauseSubjects.length
  ) {
    return false;
  }
  return englishClauseSubjects.some(
    (subject, index) => subject !== vietnameseClauseSubjects[index],
  );
}

function usableExample(term, value) {
  const example = String(value ?? "").trim();
  if (example.length < 24 || example.length > 190 || !/^[\x20-\x7E]+$/.test(example)) {
    return false;
  }
  const words = example.match(/[A-Za-z]+/g) ?? [];
  if (words.length < 5 || words.length > 30) return false;
  if (hasSentenceTemplatePlaceholder(example)) return false;
  if (/\b(the word|the term|old form|is used in english|another spelling)\b/i.test(example)) {
    return false;
  }
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(example);
}

function validateCourseExamples(entries) {
  const errors = [];
  for (const [term, entry] of Object.entries(entries)) {
    const example = String(entry.example ?? "").trim();
    const translation = String(entry.exampleTranslation ?? "").trim();
    const issues = [];

    if (!example) {
      issues.push("missing English example");
    } else if (hasSentenceTemplatePlaceholder(example)) {
      issues.push("unfilled sentence-template placeholder");
    }
    if (example && !containsHeadword(term, example)) {
      issues.push("example does not use the headword or a regular inflection");
    } else if (example && !containsExactHeadword(term, example)) {
      issues.push("example must include the exact headword for the lesson blank");
    }
    if (!translation) {
      issues.push("missing Vietnamese translation");
    } else if (hasSubjectPronounConflict(example, translation)) {
      issues.push("English subject pronoun conflicts with Vietnamese subject pronoun");
    }
    if (issues.length) {
      errors.push(`- ${term}: ${issues.join("; ")}`);
    }
  }

  if (errors.length) {
    throw new Error(
      `IELTS course examples failed validation:\n${errors.join("\n")}`,
    );
  }
}

function applyCourseDefinitionOverrides(entries) {
  for (const [term, definition] of Object.entries(
    COURSE_DEFINITION_OVERRIDES,
  )) {
    if (!entries[term]) {
      throw new Error(`Không tìm thấy từ để áp dụng định nghĩa IELTS đã biên soạn: ${term}`);
    }
    if (!definition.trim()) {
      throw new Error(`Định nghĩa IELTS đã biên soạn đang để trống: ${term}`);
    }
    entries[term].definition = definition;
    entries[term].dictionarySource = "authored";
  }
}

function applyCoursePosOverrides(entries) {
  for (const [term, review] of Object.entries(COURSE_POS_OVERRIDES)) {
    const entry = entries[term];
    if (!entry) {
      throw new Error(`Không tìm thấy từ để áp dụng nhãn từ loại IELTS đã xem xét: ${term}`);
    }
    entry.partOfSpeech = review.partOfSpeech;
    entry.posGroup = normalizePos(review.partOfSpeech);
  }
}

function validateCourseDataAgainstAuthoredOverrides(courseData) {
  const entries = courseData?.entries;
  const errors = [];

  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    throw new Error("IELTS course data is missing its entries object.");
  }
  if (courseData.spellingConvention !== IELTS_SPELLING_CONVENTION) {
    errors.push("- IELTS British-English spelling convention is missing or changed");
  }
  const topicWordCount = (courseData.topics ?? []).reduce(
    (sum, topic) => sum + (topic.terms?.length ?? 0),
    0,
  );
  if (courseData.totalWords !== topicWordCount) {
    errors.push(
      `- totalWords is ${courseData.totalWords}; topic term lists contain ${topicWordCount}`,
    );
  }
  const availableTerms = new Set(Object.keys(entries));
  for (const [term, entry] of Object.entries(entries)) {
    const expectedSpellingNote = spellingNoteForAvailableVariant(
      term,
      availableTerms,
    );
    if (entry.spellingNote !== expectedSpellingNote) {
      errors.push(`- ${term}: British/American spelling note changed`);
    }
  }

  const topicByTerm = new Map();
  for (const topic of courseData.topics ?? []) {
    if (!topic.terms?.length) {
      errors.push(`- ${topic.id}: topic has no terms`);
    }
    for (const rawTerm of topic.terms ?? []) {
      const term = rawTerm.trim().toLowerCase();
      const previousTopic = topicByTerm.get(term);
      if (previousTopic && previousTopic !== topic.id) {
        errors.push(
          `- ${rawTerm}: headword appears in multiple topics (${previousTopic}, ${topic.id})`,
        );
      } else {
        topicByTerm.set(term, topic.id);
      }
    }
  }

  for (const [term, review] of Object.entries(COURSE_POS_OVERRIDES)) {
    const entry = entries[term];
    if (!entry) {
      errors.push(`- ${term}: reviewed headword was removed`);
      continue;
    }
    if (
      entry.partOfSpeech !== review.partOfSpeech ||
      entry.posGroup !== normalizePos(review.partOfSpeech)
    ) {
      errors.push(`- ${term}: reviewed lesson part-of-speech label changed`);
    }
    if (entry.example !== review.sourceExample) {
      errors.push(`- ${term}: reviewed source example changed; review its lesson part-of-speech label`);
    }
  }

  for (const term of Object.keys(DICTIONARY_SENSE_REVIEW)) {
    if (entries[term]) {
      errors.push(`- ${term}: dictionary example uses an unrelated IELTS sense`);
    }
  }
  for (const [term, review] of Object.entries(DICTIONARY_DEFINITION_REVIEW)) {
    const entry = entries[term];
    if (!entry) {
      errors.push(`- ${term}: reviewed headword was removed`);
      continue;
    }
    if (entry.definition !== COURSE_DEFINITION_OVERRIDES[term]) {
      errors.push(`- ${term}: reviewed definition/example mismatch was not corrected`);
    }
    if (entry.dictionarySource !== "authored") {
      errors.push(`- ${term}: corrected definition is not marked as authored`);
    }
    const expectedExample =
      COURSE_EXAMPLE_OVERRIDES[term]?.example ?? review.example;
    if (entry.example !== expectedExample) {
      errors.push(`- ${term}: reviewed example changed`);
    }
  }
  for (const term of REQUIRED_RELATED_HEADWORDS) {
    if (!entries[term]) {
      errors.push(`- ${term}: valid related headword was removed by sense filtering`);
    }
  }
  for (const term of REQUIRED_COMMON_INFLECTIONS) {
    if (!entries[term]) {
      errors.push(`- ${term}: useful common inflection was removed`);
    }
  }

  const topicTerms = new Set(
    (courseData.topics ?? []).flatMap((topic) => topic.terms ?? []),
  );
  for (const term of Object.keys(RARE_HEADWORD_REVIEW)) {
    if (entries[term] || topicTerms.has(term)) {
      errors.push(
        `- ${term}: reviewed rare or obsolete headword remains in the course`,
      );
    }
  }

  for (const [oldTerm, replacement] of Object.entries(
    COURSE_HEADWORD_REPLACEMENTS,
  )) {
    if (entries[oldTerm]) {
      errors.push(`- ${oldTerm}: outdated or uncommon headword remains in the course`);
    }
    if (!entries[replacement]) {
      errors.push(`- ${oldTerm}: replacement headword ${replacement} is missing`);
    }
  }

  for (const [term, expectedDefinition] of Object.entries(
    COURSE_DEFINITION_OVERRIDES,
  )) {
    const entry = entries[term];
    if (!entry) {
      errors.push(`- ${term}: missing authored IELTS definition`);
      continue;
    }
    if (entry.definition !== expectedDefinition) {
      errors.push(`- ${term}: authored IELTS definition changed`);
    }
    if (entry.dictionarySource !== "authored") {
      errors.push(`- ${term}: definition is not marked as authored`);
    }
  }

  for (const [term, expectedExample] of Object.entries(
    COURSE_EXAMPLE_OVERRIDES,
  )) {
    const entry = entries[term];
    if (!entry) {
      errors.push(`- ${term}: missing authored IELTS example`);
      continue;
    }
    if (entry.example !== expectedExample.example) {
      errors.push(`- ${term}: authored IELTS example changed`);
    }
    if (entry.exampleTranslation !== expectedExample.exampleTranslation) {
      errors.push(`- ${term}: authored IELTS example translation changed`);
    }
    if (entry.exampleSource !== "authored") {
      errors.push(`- ${term}: example is not marked as authored`);
    }
  }

  for (const [term, review] of Object.entries(REVIEWED_EXAMPLES)) {
    const entry = entries[term];
    if (!entry) {
      errors.push(`- ${term}: reviewed IELTS example headword was removed`);
      continue;
    }
    if (
      entry.example !== review.example ||
      entry.exampleTranslation !== review.exampleTranslation
    ) {
      errors.push(`- ${term}: reviewed IELTS example pair changed`);
    }
    if (entry.exampleSource !== "authored") {
      errors.push(`- ${term}: reviewed IELTS example is not marked as authored`);
    }
  }

  if (errors.length) {
    throw new Error(
      `IELTS course data does not match builder corrections:\n${errors.join("\n")}`,
    );
  }
}

function rowScore(row, term) {
  const exampleWords = row.example.match(/[A-Za-z]+/g)?.length ?? 0;
  const posScore = normalizePos(row.pos) === "other" ? 0 : 4;
  const definitionScore =
    row.definition.length > 150 ? 0 : row.definition.length > 90 ? 1 : 2;
  const exampleScore =
    exampleWords >= 8 && exampleWords <= 20 ? 4 : exampleWords >= 5 ? 2 : 0;
  const exactTermScore = row.word.toLowerCase() === term ? 2 : 0;
  return posScore + definitionScore + exampleScore + exactTermScore;
}

function getDictionaryRows(database) {
  return database
    .prepare(
      `SELECT w.word, d.definition, d.pos, d.sub_pos AS subPos, wd.example
       FROM words w
       JOIN word_definitions wd ON wd.word_id = w.id
       JOIN definitions d ON d.id = wd.definition_id
       WHERE w.lang_code = 'en' AND d.definition_lang = 'vi'`,
    )
    .all();
}

function dictionaryEntryIndex(rows) {
  const entries = new Map();
  for (const row of rows) {
    const term = String(row.word ?? "").trim().toLowerCase();
    const definition = String(row.definition ?? "").trim();
    const example = String(row.example ?? "").trim();
    if (
      !/^[a-z]+$/.test(term) ||
      term.length < 4 ||
      term.length > 32 ||
      EXCLUDED_HEADWORDS.has(term) ||
      definition.length < 5 ||
      definition.length > 240 ||
      /^(?:dạng (?:viết )?khác|số nhiều của|quá khứ của|phân từ .* của|xem [a-z])/i.test(
        definition,
      ) ||
      !usableExample(term, example)
    ) {
      continue;
    }
    const candidate = { ...row, word: term, definition, example };
    const previous = entries.get(term);
    if (!previous || rowScore(candidate, term) > rowScore(previous, term)) {
      entries.set(term, candidate);
    }
  }
  return entries;
}

function findOfflineExampleSourceChanges(entries, dictionaryRows) {
  const sourceExamplesByTerm = new Map();
  for (const row of dictionaryRows) {
    const term = String(row.word ?? "").trim().toLowerCase();
    const example = String(row.example ?? "").trim();
    if (!term || !example) continue;
    if (!sourceExamplesByTerm.has(term)) {
      sourceExamplesByTerm.set(term, []);
    }
    const examples = sourceExamplesByTerm.get(term);
    if (!examples.includes(example)) examples.push(example);
  }

  const changes = [];
  for (const [rawTerm, entry] of Object.entries(entries ?? {})) {
    const term = rawTerm.trim().toLowerCase();
    if (
      entry?.exampleSource !== "offline" ||
      Object.hasOwn(REVIEWED_EXAMPLES, term)
    ) {
      continue;
    }
    const savedExample = String(entry.example ?? "").trim();
    const currentExamples = sourceExamplesByTerm.get(term) ?? [];
    if (!savedExample || currentExamples.includes(savedExample)) continue;
    changes.push({
      term,
      savedExample,
      currentExamples,
      translation: String(entry.exampleTranslation ?? "").trim(),
    });
  }

  return changes;
}

function validateOfflineExampleSources(entries, dictionaryRows) {
  const changes = findOfflineExampleSourceChanges(entries, dictionaryRows);
  if (changes.length) {
    const report = changes
      .map(({ term, savedExample, currentExamples, translation }) => {
        const currentLines = currentExamples.length
          ? currentExamples.map((example) => `    - ${JSON.stringify(example)}`)
          : ["    - (no current dictionary example found)"];
        return [
          `- ${term}`,
          `  Saved English source: ${JSON.stringify(savedExample)}`,
          `  Current English source${currentExamples.length === 1 ? "" : "s"}:`,
          ...currentLines,
          `  Existing Vietnamese translation: ${
            translation ? JSON.stringify(translation) : "(none saved)"
          }`,
        ].join("\n");
      })
      .join("\n");
    throw new Error(
      `IELTS dictionary-example translation review failed; rebuild stopped without changing course data:\n${report}`,
    );
  }
}

function validateReviewedExamples(reviews, dictionaryRows) {
  const sourceExamplesByTerm = new Map();
  for (const row of dictionaryRows) {
    const term = String(row.word ?? "").trim().toLowerCase();
    const example = String(row.example ?? "").trim();
    if (!term || !example) continue;
    if (!sourceExamplesByTerm.has(term)) {
      sourceExamplesByTerm.set(term, new Set());
    }
    sourceExamplesByTerm.get(term).add(example);
  }

  const errors = [];
  for (const [rawTerm, review] of Object.entries(reviews ?? {})) {
    const term = rawTerm.trim().toLowerCase();
    if (!/^[a-z]+$/.test(term)) {
      errors.push(`- ${rawTerm}: reviewed headword must contain only letters`);
      continue;
    }
    if (
      !review ||
      typeof review.example !== "string" ||
      !review.example.trim() ||
      typeof review.exampleTranslation !== "string" ||
      !review.exampleTranslation.trim() ||
      !Array.isArray(review.dictionaryExamples) ||
      review.dictionaryExamples.some(
        (example) => typeof example !== "string" || !example.trim(),
      )
    ) {
      errors.push(`- ${term}: reviewed example pair or dictionary snapshot is invalid`);
      continue;
    }

    const savedExamples = [
      ...new Set(review.dictionaryExamples.map((example) => example.trim())),
    ].sort();
    const currentExamples = [
      ...(sourceExamplesByTerm.get(term) ?? []),
    ].sort();
    if (JSON.stringify(savedExamples) !== JSON.stringify(currentExamples)) {
      const formatExamples = (examples) =>
        examples.length
          ? examples.map((example) => `    - ${JSON.stringify(example)}`)
          : ["    - (no dictionary examples found)"];
      errors.push(
        [
          `- ${term}: dictionary examples changed; review the approved IELTS example and translation`,
          "  Saved dictionary examples:",
          ...formatExamples(savedExamples),
          "  Current dictionary examples:",
          ...formatExamples(currentExamples),
        ].join("\n"),
      );
    }
  }
  if (errors.length) {
    throw new Error(
      `IELTS reviewed-example source check failed:\n${errors.join("\n")}`,
    );
  }
}

function applyReviewedExamples(entries, reviews = REVIEWED_EXAMPLES) {
  for (const [term, review] of Object.entries(reviews)) {
    const entry = entries[term];
    if (!entry) {
      throw new Error(
        `${term}: reviewed IELTS example headword is missing from the course`,
      );
    }
    entry.example = review.example;
    entry.exampleTranslation = review.exampleTranslation;
    entry.exampleSource = "authored";
  }
}

function termMatchesPrefix(term, prefix) {
  if (!term.startsWith(prefix)) return false;
  const remainder = term.slice(prefix.length);
  return COMMON_SUFFIXES.has(remainder);
}

function topicCandidates(topic, dictionary, sortedTerms) {
  const selected = [];
  const seen = new Set();
  for (const rawPrefix of topic.prefixes.split(/\s+/).filter(Boolean)) {
    const prefix = rawPrefix.toLowerCase();
    for (const term of sortedTerms) {
      if (
        !seen.has(term) &&
        !LEGACY_WORDS.has(term) &&
        !REDUNDANT_VERB_INFLECTION_REVIEW.has(term) &&
        !DICTIONARY_SENSE_REVIEW[term] &&
        !RARE_HEADWORD_REVIEW[term] &&
        termMatchesPrefix(term, prefix)
      ) {
        seen.add(term);
        selected.push({ term, family: prefix });
      }
    }
  }
  return selected;
}

function validateDictionarySenseReview(dictionary) {
  const errors = [];
  for (const [term, review] of Object.entries(DICTIONARY_SENSE_REVIEW)) {
    const entry = dictionary.get(term);
    if (!entry) {
      errors.push(`- ${term}: reviewed dictionary headword is missing`);
    } else if (entry.example !== review.example) {
      errors.push(`- ${term}: dictionary example changed; review its IELTS sense`);
    }
  }
  if (errors.length) {
    throw new Error(
      `IELTS dictionary-sense review failed:\n${errors.join("\n")}`,
    );
  }
}

function validateDictionaryPosReview(dictionaryRows) {
  const sourceExamplesByTerm = new Map();
  for (const row of dictionaryRows) {
    const term = String(row.word ?? "").trim().toLowerCase();
    const example = String(row.example ?? "").trim();
    if (!term || !example) continue;
    if (!sourceExamplesByTerm.has(term)) {
      sourceExamplesByTerm.set(term, new Set());
    }
    sourceExamplesByTerm.get(term).add(example);
  }

  const errors = [];
  for (const [term, review] of Object.entries(COURSE_POS_OVERRIDES)) {
    if (!sourceExamplesByTerm.get(term)?.has(review.sourceExample)) {
      errors.push(
        `- ${term}: dictionary example changed; review its lesson part-of-speech label`,
      );
    }
  }
  if (errors.length) {
    throw new Error(
      `IELTS dictionary-example part-of-speech review failed:\n${errors.join("\n")}`,
    );
  }
}

function validateDictionaryDefinitionReview(dictionary) {
  const errors = [];
  for (const [term, review] of Object.entries(
    DICTIONARY_DEFINITION_REVIEW,
  )) {
    const entry = dictionary.get(term);
    if (!entry) {
      errors.push(`- ${term}: reviewed dictionary headword is missing`);
    } else if (
      entry.definition !== review.definition ||
      entry.example !== review.example
    ) {
      errors.push(
        `- ${term}: dictionary definition/example changed; review the mismatch`,
      );
    }
  }
  if (errors.length) {
    throw new Error(
      `IELTS dictionary definition/example review failed:\n${errors.join("\n")}`,
    );
  }
}

function loadLegacyCourse() {
  if (existsSync(OUTPUT_PATH)) {
    const existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
    if (existing.topics?.some((topic) => topic.legacyLesson)) {
      const topics = existing.topics
        .filter((topic) => topic.legacyLesson)
        .map((topic) => ({
          id: topic.legacyLesson.id.replace(
            "ielts-topic-vocabulary-v1-",
            "",
          ),
          title: topic.title,
          terms: topic.legacyLesson.questions.map((question) => question.term),
        }));
      const legacyTerms = new Set(topics.flatMap((topic) => topic.terms));
      if (!legacyTerms.has("employment")) {
        topics.push({
          id: "society-work",
          title: LEGACY_SOCIETY_LESSON.title,
          terms: LEGACY_SOCIETY_LESSON.questions.map(
            (question) => question.term,
          ),
        });
      }
      for (const term of LEGACY_SOCIETY_LESSON.questions.map(
        (question) => question.term,
      )) {
        legacyTerms.add(term);
      }
      const entries = Object.fromEntries(
        [...legacyTerms].map((term) => [term, existing.entries[term]]),
      );
      Object.assign(entries, LEGACY_SOCIETY_ENTRIES);
      const lessons = new Map(
        existing.topics
          .filter((topic) => topic.legacyLesson)
          .map((topic) => [
            topic.legacyLesson.id.replace(
              "ielts-topic-vocabulary-v1-",
              "",
            ),
            topic.legacyLesson,
          ]),
      );
      lessons.set("society-work", LEGACY_SOCIETY_LESSON);
      return {
        topics,
        entries,
        lessons,
        exampleTranslations: Object.fromEntries(
          Object.entries(existing.entries)
            .filter(
              ([, entry]) =>
                entry.exampleTranslation?.trim() && entry.example?.trim(),
            )
            .map(([term, entry]) => [
              term,
              {
                example: entry.example,
                translation: entry.exampleTranslation,
              },
            ]),
        ),
      };
    }
  }
  throw new Error(
    "Không tìm thấy dữ liệu 25 từ IELTS ban đầu để giữ nguyên tiến độ.",
  );
}

function main() {
  const db = new DatabaseSync(DATABASE_PATH, { readOnly: true });
  try {
    const dictionaryRows = getDictionaryRows(db);
    const dictionary = dictionaryEntryIndex(dictionaryRows);
    validateDictionarySenseReview(dictionary);
    validateDictionaryPosReview(dictionaryRows);
    validateDictionaryDefinitionReview(dictionary);
    validateReviewedExamples(REVIEWED_EXAMPLES, dictionaryRows);
    const sortedTerms = [...dictionary.keys()].sort();
    const legacy = loadLegacyCourse();
    const filteredLegacyTopics = legacy.topics.map((topic) => ({
      ...topic,
      terms: topic.terms.filter(
        (term) => !REDUNDANT_VERB_INFLECTION_REVIEW.has(term),
      ),
    }));
    const filteredLegacyEntries = Object.fromEntries(
      Object.entries(legacy.entries).filter(
        ([term]) => !REDUNDANT_VERB_INFLECTION_REVIEW.has(term),
      ),
    );
    const filteredLegacyLessons = new Map(
      [...legacy.lessons].map(([topicId, lesson]) => [
        topicId,
        {
          ...lesson,
          questions: lesson.questions.filter(
            (question) =>
              !REDUNDANT_VERB_INFLECTION_REVIEW.has(question.term),
          ),
        },
      ]),
    );
    legacy.topics = filteredLegacyTopics;
    legacy.entries = filteredLegacyEntries;
    legacy.lessons = filteredLegacyLessons;
    validateOfflineExampleSources(legacy.entries, dictionaryRows);
    const legacyTopics = new Map(
      legacy.topics.map((topic) => [topic.id, topic]),
    );
    const legacyLessons = legacy.lessons;
    const usedTerms = new Set();
    const topics = TOPICS.map((topic) => {
      const oldTopic = legacyTopics.get(topic.id);
      const words = [];
      if (oldTopic) {
        for (const term of oldTopic.terms) {
          if (COURSE_HEADWORD_REPLACEMENTS[term]) continue;
          if (RARE_HEADWORD_REVIEW[term]) continue;
          if (!usedTerms.has(term)) {
            usedTerms.add(term);
            words.push({
              term,
              family: topic.id,
              entry:
                legacy.entries[term] ??
                (dictionary.has(term) ? dictionary.get(term) : null),
              pos: dictionary.get(term)?.pos ?? "noun",
              source: legacy.entries[term]
                ? "legacy"
                : "offline",
            });
          }
        }
      }
      for (const candidate of topicCandidates(topic, dictionary, sortedTerms)) {
        if (usedTerms.has(candidate.term)) continue;
        usedTerms.add(candidate.term);
        words.push({
          ...candidate,
          entry: dictionary.get(candidate.term),
          pos: dictionary.get(candidate.term)?.pos ?? "",
          source: "offline",
        });
      }
      for (const [term, entry] of Object.entries(CURATED_TOPIC_ENTRIES)) {
        if (entry.topicId !== topic.id || usedTerms.has(term)) continue;
        usedTerms.add(term);
        words.push({
          term,
          family: topic.id,
          entry: {
            definition: entry.definition,
            example: entry.example,
            exampleTranslation: entry.exampleTranslation,
            dictionarySource: "authored",
            exampleSource: "authored",
          },
          pos: entry.pos,
          source: "authored",
        });
      }
      return {
        id: topic.id,
        title: topic.title,
        focus: topic.focus,
        words,
        legacyLesson: legacyLessons.get(topic.id) ?? null,
      };
    });

    const entries = {};
    for (const topic of topics) {
      for (const word of topic.words) {
        if (!word.entry) {
          throw new Error(`Không có mục từ điển cho từ cũ: ${word.term}`);
        }
        const savedTranslation = legacy.exampleTranslations[word.term];
        entries[word.term] = {
          definition: word.entry.definition,
          example: word.entry.example,
          exampleTranslation:
            word.entry.exampleTranslation ||
            (savedTranslation?.example === word.entry.example
              ? savedTranslation.translation
              : ""),
          dictionarySource: word.entry.dictionarySource ?? "offline",
          exampleSource: word.entry.exampleSource ?? "offline",
          partOfSpeech: word.pos,
          posGroup: normalizePos(word.pos),
          family: word.family,
        };
        const authoredExample = COURSE_EXAMPLE_OVERRIDES[word.term];
        if (authoredExample) {
          entries[word.term].example = authoredExample.example;
          entries[word.term].exampleTranslation =
            authoredExample.exampleTranslation;
          entries[word.term].exampleSource = "authored";
        }
      }
    }

    for (const [term, example] of Object.entries(COURSE_EXAMPLE_OVERRIDES)) {
      if (!entries[term]) {
        throw new Error(`Không tìm thấy từ để áp dụng ví dụ IELTS đã biên soạn: ${term}`);
      }
    }

    applyReviewedExamples(entries);
    applyCourseDefinitionOverrides(entries);
    applyCoursePosOverrides(entries);
    applySpellingVariantNotes(entries);
    validateCourseExamples(entries);

    const totalWords = topics.reduce((sum, topic) => sum + topic.words.length, 0);
    const output = {
      generatedFrom: "dictionary_en_vi.db",
      spellingConvention: IELTS_SPELLING_CONVENTION,
      totalWords,
      topics: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        focus: topic.focus,
        terms: topic.words.map((word) => word.term),
        legacyLesson: topic.legacyLesson,
      })),
      entries,
    };
    validateCourseDataAgainstAuthoredOverrides(output);
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(output)}\n`, "utf8");
    console.log(
      `Built IELTS course data: ${totalWords} unique words across ${topics.length} topics; excluded ${Object.keys(DICTIONARY_SENSE_REVIEW).length} reviewed dictionary sense mismatches and ${Object.keys(RARE_HEADWORD_REVIEW).length} reviewed rare or obsolete headwords.`,
    );
    for (const topic of topics) {
      console.log(`- ${topic.title}: ${topic.words.length} words`);
    }
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  IELTS_SPELLING_CONVENTION,
  SPELLING_VARIANTS,
  spellingNoteForTerm,
  containsHeadword,
  hasSentenceTemplatePlaceholder,
  hasSubjectPronounConflict,
  usableExample,
  validateCourseExamples,
  applyCourseDefinitionOverrides,
  validateCourseDataAgainstAuthoredOverrides,
  DICTIONARY_SENSE_REVIEW,
  DICTIONARY_DEFINITION_REVIEW,
  REQUIRED_RELATED_HEADWORDS,
  REQUIRED_COMMON_INFLECTIONS,
  REDUNDANT_VERB_INFLECTION_REVIEW,
  RARE_HEADWORD_REVIEW,
  validateDictionarySenseReview,
  validateDictionaryPosReview,
  validateDictionaryDefinitionReview,
  COURSE_DEFINITION_OVERRIDES,
  COURSE_EXAMPLE_OVERRIDES,
  COURSE_POS_OVERRIDES,
  applyCoursePosOverrides,
  findOfflineExampleSourceChanges,
  validateOfflineExampleSources,
  REVIEWED_EXAMPLES,
  validateReviewedExamples,
  applyReviewedExamples,
};
