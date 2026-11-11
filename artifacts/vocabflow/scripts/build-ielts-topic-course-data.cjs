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
  ],
);

function normalizePos(value) {
  return POS_GROUPS[String(value ?? "").trim().toLowerCase()] ?? "other";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function usableExample(term, value) {
  const example = String(value ?? "").trim();
  if (example.length < 24 || example.length > 190 || !/^[\x20-\x7E]+$/.test(example)) {
    return false;
  }
  const words = example.match(/[A-Za-z]+/g) ?? [];
  if (words.length < 5 || words.length > 30) return false;
  if (/\b(the word|the term|old form|is used in english|another spelling)\b/i.test(example)) {
    return false;
  }
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(example);
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
        termMatchesPrefix(term, prefix)
      ) {
        seen.add(term);
        selected.push({ term, family: prefix });
      }
    }
  }
  return selected;
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
    const dictionary = dictionaryEntryIndex(getDictionaryRows(db));
    const sortedTerms = [...dictionary.keys()].sort();
    const legacy = loadLegacyCourse();
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
        entries[word.term] = {
          definition: word.entry.definition,
          example: word.entry.example,
          exampleTranslation: word.entry.exampleTranslation ?? "",
          dictionarySource: word.entry.dictionarySource ?? "offline",
          exampleSource: word.entry.exampleSource ?? "offline",
          partOfSpeech: word.pos,
          posGroup: normalizePos(word.pos),
          family: word.family,
        };
      }
    }

    const totalWords = topics.reduce((sum, topic) => sum + topic.words.length, 0);
    const output = {
      generatedFrom: "dictionary_en_vi.db",
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
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(output)}\n`, "utf8");
    console.log(
      `Built IELTS course data: ${totalWords} unique words across ${topics.length} topics.`,
    );
    for (const topic of topics) {
      console.log(`- ${topic.title}: ${topic.words.length} words`);
    }
  } finally {
    db.close();
  }
}

main();
