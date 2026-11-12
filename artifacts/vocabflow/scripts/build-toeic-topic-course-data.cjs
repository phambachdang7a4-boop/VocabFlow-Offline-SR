const { DatabaseSync } = require("node:sqlite");
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const DATABASE_PATH = join(
  __dirname,
  "../../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const OUTPUT_PATH = join(__dirname, "../domain/toeic-topic-course-data.json");
const TOEIC_EXAMPLE_TRANSLATIONS_PATH = join(
  __dirname,
  "../domain/toeic-example-translations.json",
);
const TOEIC_EXAMPLE_TRANSLATIONS = JSON.parse(
  readFileSync(TOEIC_EXAMPLE_TRANSLATIONS_PATH, "utf8"),
);

const TOEIC_SPELLING_CONVENTION =
  "Ưu tiên chính tả Anh-Anh; các dạng Anh-Mỹ hữu ích được ghi rõ ở mục từ.";

const US_TO_UK_SPELLING_RULES = [
  { pattern: /ization$/, britishSuffix: "isation" },
  { pattern: /izing$/, britishSuffix: "ising" },
  { pattern: /ized$/, britishSuffix: "ised" },
  { pattern: /izer$/, britishSuffix: "iser" },
  { pattern: /ize$/, britishSuffix: "ise" },
  { pattern: /^traveling$/, british: "travelling" },
  { pattern: /^traveled$/, british: "travelled" },
  { pattern: /^license$/, british: "licence" },
];

function britishEquivalent(term) {
  for (const rule of US_TO_UK_SPELLING_RULES) {
    if (rule.british) {
      if (rule.pattern.test(term)) return rule.british;
      continue;
    }
    if (rule.pattern.test(term)) {
      return term.replace(rule.pattern, rule.britishSuffix);
    }
  }
  return null;
}

function spellingNoteFor(term) {
  const british = britishEquivalent(term);
  return british ? `Anh-Mỹ; chính tả Anh-Anh: ${british}.` : null;
}

function applyToeicSpellingLabels(data) {
  return {
    ...data,
    spellingConvention: TOEIC_SPELLING_CONVENTION,
    entries: Object.fromEntries(
      Object.entries(data.entries).map(([term, entry]) => {
        const spellingNote = spellingNoteFor(term);
        if (!spellingNote) return [term, entry];
        return [term, { ...entry, spellingNote }];
      }),
    ),
  };
}

function validateToeicSpellingData(data) {
  if (data.spellingConvention !== TOEIC_SPELLING_CONVENTION) {
    throw new Error("TOEIC spelling convention is missing or inconsistent.");
  }
  for (const [term, entry] of Object.entries(data.entries ?? {})) {
    const expectedNote = spellingNoteFor(term);
    if (expectedNote && entry.spellingNote !== expectedNote) {
      throw new Error(
        `TOEIC American spelling "${term}" must be labeled "${expectedNote}".`,
      );
    }
    if (!expectedNote && entry.spellingNote?.startsWith("Anh-Mỹ;")) {
      throw new Error(
        `TOEIC entry "${term}" has an American label without a British equivalent.`,
      );
    }
  }
}

function validateToeicExampleTranslations(data) {
  const entries = data.entries ?? {};
  const errors = [];
  for (const [term, entry] of Object.entries(entries)) {
    const example = String(entry.example ?? "").trim();
    const translation = String(entry.exampleTranslation ?? "").trim();
    const authoredTranslation = String(TOEIC_EXAMPLE_TRANSLATIONS[term] ?? "").trim();
    if (!example) errors.push(`- ${term}: missing English example`);
    if (!authoredTranslation) {
      errors.push(`- ${term}: missing authored Vietnamese example translation`);
    } else if (!translation) {
      errors.push(`- ${term}: missing Vietnamese example translation`);
    } else if (translation !== authoredTranslation) {
      errors.push(`- ${term}: Vietnamese example translation differs from authored source`);
    }
  }
  for (const term of Object.keys(TOEIC_EXAMPLE_TRANSLATIONS)) {
    if (!Object.hasOwn(entries, term)) {
      errors.push(`- ${term}: authored translation has no TOEIC course entry`);
    }
  }
  if (errors.length) {
    throw new Error(`TOEIC course examples failed validation:\n${errors.join("\n")}`);
  }
}

const TOPICS = [
  {
    id: "office-operations",
    title: "Văn phòng và hành chính",
    focus: "Công việc văn phòng, giấy tờ, thiết bị và hoạt động hành chính.",
    prefixes:
      "office administrat cleric secretar reception receipt stationery file record document correspondence photocop copier typist desk workstation paperwork office printer print typist",
  },
  {
    id: "meetings-scheduling",
    title: "Cuộc họp và lịch trình",
    focus: "Lên lịch, tham dự cuộc họp, thuyết trình và sắp xếp công việc.",
    prefixes:
      "meeting confer agenda minute appointment schedule postpon cancel reschedul confirm attend participant present seminar workshop discuss negotiat consensus delegate briefing coordinate",
  },
  {
    id: "recruitment-hr",
    title: "Tuyển dụng và nhân sự",
    focus: "Ứng tuyển, phỏng vấn, tuyển dụng và quản lý nhân viên.",
    prefixes:
      "employ recruit hir applicant candidate interview resum vacancy qualif experience skill workforce personnel staff manager supervisor executive payroll promotion retir resign overtime benefit compensat colleague",
  },
  {
    id: "business-communication",
    title: "Giao tiếp và thư tín công việc",
    focus: "Trao đổi thông tin, thư từ, thông báo và tài liệu doanh nghiệp.",
    prefixes:
      "communicat correspond announc message notice notif memo memorandum report brochure catalog newsletter publication press release mail postage telephone telephon email",
  },
  {
    id: "finance-accounting",
    title: "Tài chính và kế toán",
    focus: "Ngân sách, doanh thu, chi phí, thanh toán và báo cáo tài chính.",
    prefixes:
      "finance financ account accountant audit budget revenue expens profit loss cash invoic receipt transaction bill payment charge balance loan interest tax taxation fiscal expenditure",
  },
  {
    id: "banking-insurance",
    title: "Ngân hàng và bảo hiểm",
    focus: "Tài khoản, tiền gửi, khoản vay và các loại bảo hiểm.",
    prefixes:
      "bank deposit withdraw withdrawal saving savings credit debit mortgage insur insurer insurance policy premium claim coverage liability compensation financial",
  },
  {
    id: "sales-marketing",
    title: "Bán hàng và tiếp thị",
    focus: "Sản phẩm, khách hàng, quảng cáo, khuyến mãi và nghiên cứu thị trường.",
    prefixes:
      "sell sale seller market marketing advertis campaign product brand consumer customer client promotion discount retail wholesale commercial merchandis launch survey feedback demand publicity",
  },
  {
    id: "purchasing-contracts",
    title: "Mua hàng và hợp đồng",
    focus: "Đặt mua, tìm nhà cung cấp, báo giá và thương lượng hợp đồng.",
    prefixes:
      "purchas purchase procurement supplier vendor order contract negotiat quotation quote bid tender agreement bargain wholesale retail vendor inventory procurement",
  },
  {
    id: "shipping-inventory",
    title: "Vận chuyển và hàng tồn kho",
    focus: "Kho bãi, giao nhận, vận chuyển hàng hóa và theo dõi đơn hàng.",
    prefixes:
      "ship shipment shipping freight cargo warehouse storage inventory inventor stock deliver delivery courier dispatch package packaging export import custom customs tracking logistics distribution supply",
  },
  {
    id: "customer-service",
    title: "Dịch vụ khách hàng",
    focus: "Tiếp nhận yêu cầu, xử lý khiếu nại, đổi trả và hỗ trợ khách hàng.",
    prefixes:
      "customer complaint complain refund warranty guarantee replacement exchange repair maintenance service satisf respond response support assistance contact agent solution inquiry",
  },
  {
    id: "business-travel",
    title: "Công tác và du lịch",
    focus: "Chuyến công tác, vé máy bay, hành lý và đặt chỗ.",
    prefixes:
      "travel trip itinerary agency airline flight passenger airport boarding board passport visa luggage baggage accommodat hotel lodging reservation booking destination fare rental",
  },
  {
    id: "hospitality-events",
    title: "Khách sạn và sự kiện",
    focus: "Lưu trú, nhà hàng, tiệc, hội nghị và phục vụ khách.",
    prefixes:
      "hotel hospitality guest reception restaurant cater banquet meal menu venue hall event reservation booking waiter accommodation service conference",
  },
  {
    id: "transportation",
    title: "Giao thông và đi lại",
    focus: "Phương tiện, tuyến đường, lịch khởi hành và tình trạng giao thông.",
    prefixes:
      "transport commute traffic congestion vehicle route road railway rail station train bus taxi parking departure arrival delay timetable transit driver",
  },
  {
    id: "facilities-property",
    title: "Cơ sở vật chất và bất động sản",
    focus: "Tòa nhà, văn phòng, thuê mặt bằng, sửa chữa và bảo trì.",
    prefixes:
      "facil building property construction maintenance repair renov renovation installation equipment appliance utility electricity plumbing heating cleaning security lease landlord tenant rent",
  },
  {
    id: "manufacturing-quality",
    title: "Sản xuất và kiểm soát chất lượng",
    focus: "Nhà máy, quy trình sản xuất, kiểm tra sản phẩm và năng suất.",
    prefixes:
      "manufactur factory production productiv assembly assemble machine machinery process quality inspect inspection defect defective standard control output material automation",
  },
  {
    id: "safety-compliance",
    title: "An toàn và tuân thủ quy định",
    focus: "An toàn lao động, rủi ro, giấy phép và quy định doanh nghiệp.",
    prefixes:
      "safe safety hazard risk workplace occupational protect emergency fire accident precaution regulat comply compliance procedure permit license inspection prevention",
  },
  {
    id: "technology-equipment",
    title: "Công nghệ và thiết bị văn phòng",
    focus: "Máy tính, phần mềm, mạng và thiết bị dùng trong công việc.",
    prefixes:
      "technol digital computer software hardware network internet database system device printer photocop telecommunicat technical technician online cyber password data information electronic",
  },
  {
    id: "projects-planning",
    title: "Dự án và kế hoạch",
    focus: "Mục tiêu, thời hạn, nhiệm vụ, tiến độ và phân công nguồn lực.",
    prefixes:
      "project plan planning deadline target milestone priority schedule assign assignment task progress coordinate coordination organiz arrange proposal objective strategy resource",
  },
  {
    id: "training-career",
    title: "Đào tạo và phát triển nghề nghiệp",
    focus: "Đào tạo nhân viên, kỹ năng, chứng chỉ và đánh giá hiệu suất.",
    prefixes:
      "training trainer orientation mentor certificate certification qualif skill performance apprais evaluat promotion advancement development instruction workshop",
  },
  {
    id: "international-trade",
    title: "Thương mại quốc tế",
    focus: "Xuất nhập khẩu, hải quan, ngoại tệ và giao dịch quốc tế.",
    prefixes:
      "international export import global currency exchange custom customs foreign trade commerce tariff border overseas multinational",
  },
  {
    id: "business-management",
    title: "Quản lý doanh nghiệp",
    focus: "Cơ cấu công ty, quản lý, chiến lược và mở rộng hoạt động kinh doanh.",
    prefixes:
      "business corporate corporation company enterprise organization department division headquarters subsidiary affiliate partnership shareholder ownership leadership strategy strategic mission objective growth expansion merger acquisition startup incorporation",
  },
  {
    id: "compensation-benefits",
    title: "Lương thưởng và quyền lợi",
    focus: "Lương, thưởng, trợ cấp, nghỉ phép và quyền lợi của nhân viên.",
    prefixes:
      "bonus pension retirement allowance commission gratuity subsidy reimburse reimbursement severance entitlement vacation holiday maternity absentee absenteeism leave",
  },
  {
    id: "events-public-relations",
    title: "Sự kiện và quan hệ công chúng",
    focus: "Hội chợ, triển lãm, lễ khai trương, tài trợ và quảng bá sự kiện.",
    prefixes:
      "exhibition exhibit convention ceremony inauguration anniversary celebrate celebration sponsor sponsorship organizer audience auditorium opening fair inauguration publicity",
  },
  {
    id: "legal-compliance",
    title: "Pháp lý và tuân thủ doanh nghiệp",
    focus: "Hợp đồng, giấy phép, trách nhiệm pháp lý và quy định kinh doanh.",
    prefixes:
      "legal law legislation legislator regulatory regulation comply compliance authorization authorize permit permission license licence liability lawsuit litigation attorney lawyer trademark copyright patent confidentiality privacy",
  },
  {
    id: "business-procedures",
    title: "Quy trình và năng suất",
    focus: "Quy trình làm việc, hướng dẫn, tiêu chuẩn và cải thiện hiệu suất.",
    prefixes:
      "procedure process workflow protocol handbook guideline manual operate operational operation efficiency efficient streamline productivity implement implementation documentation document standardize standardization instruction register certification",
  },
];

const COMMON_SUFFIXES = new Set([
  "",
  "s",
  "es",
  "ed",
  "ing",
  "er",
  "ers",
  "or",
  "tion",
  "sion",
  "ation",
  "ment",
  "ity",
  "ties",
  "al",
  "ical",
  "ic",
  "ive",
  "able",
  "ible",
  "ly",
  "ize",
  "ise",
  "ized",
  "ised",
  "ance",
  "ence",
  "ant",
  "ent",
  "y",
  "ion",
  "ization",
  "isation",
]);

const EXCLUDED_HEADWORDS = new Set([
  "officeism",
  "secretaryship",
  "administrational",
  "receptional",
  "receiption",
  "commutative",
  "airportable",
  "airportable",
  "accountancyship",
  "accountantship",
  "audition",
  "auditive",
  "conferment",
  "recruital",
  "hirable",
  "flightless",
  "guestship",
  "constructional",
  "constructionist",
  "productionist",
  "machineless",
  "computerism",
  "computerist",
  "planation",
  "projective",
  "pensionary",
  "exhibitive",
  "procession",
  "receipted",
  "receipter",
  "receipting",
  "deposition",
  "orderer",
  "orderly",
  "freighter",
  "freighting",
  "inventor",
  "inventors",
  "refundment",
  "banqueted",
  "banqueter",
  "transportable",
  "transporter",
  "processable",
  "processer",
  "hazarded",
  "hazarding",
  "planed",
  "planer",
  "planes",
  "appraisable",
  "pensionable",
  "pensioning",
  "commissioning",
  "exhibitioner",
  "budgeter",
  "taxer",
  "commercialist",
  "advertent",
  "quotable",
  "vendorism",
  "shipmentable",
  "warehouser",
  "customerism",
  "travelable",
  "tourer",
  "hotelism",
  "waitership",
  "facilityship",
  "architectors",
  "manufacturable",
  "machinable",
  "safetyism",
  "technologize",
  "projectable",
  "trainable",
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePos(value) {
  const pos = String(value ?? "").trim().toLowerCase();
  if (["n", "noun"].includes(pos)) return "noun";
  if (["v", "verb"].includes(pos)) return "verb";
  if (["a", "adj", "adjective"].includes(pos)) return "adjective";
  if (["adv", "adverb"].includes(pos)) return "adverb";
  return "other";
}

function usableExample(term, value) {
  const example = String(value ?? "").trim();
  if (
    example.length < 24 ||
    example.length > 190 ||
    !/^[\x20-\x7E]+$/.test(example)
  ) {
    return false;
  }
  const words = example.match(/[A-Za-z]+/g) ?? [];
  if (words.length < 5 || words.length > 30) return false;
  if (/\b(the word|the term|old form|is used in english|another spelling)\b/i.test(example)) {
    return false;
  }
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(example);
}

function scoreRow(row) {
  const exampleWords = row.example.match(/[A-Za-z]+/g)?.length ?? 0;
  const definitionScore =
    row.definition.length > 150 ? 0 : row.definition.length > 90 ? 1 : 2;
  const exampleScore =
    exampleWords >= 8 && exampleWords <= 20 ? 4 : exampleWords >= 5 ? 2 : 0;
  return definitionScore + exampleScore;
}

function buildDictionaryIndex(db) {
  const rows = db
    .prepare(
      `SELECT w.word, d.definition, d.pos, d.sub_pos AS subPos, wd.example
       FROM words w
       JOIN word_definitions wd ON wd.word_id = w.id
       JOIN definitions d ON d.id = wd.definition_id
       WHERE w.lang_code = 'en' AND d.definition_lang = 'vi'`,
    )
    .all();
  const entries = new Map();
  for (const row of rows) {
    const term = String(row.word ?? "").trim().toLowerCase();
    const definition = String(row.definition ?? "").trim();
    const example = String(row.example ?? "").trim();
    if (
      !/^[a-z]+$/.test(term) ||
      term.length < 4 ||
      term.length > 28 ||
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
    const current = entries.get(term);
    if (!current || scoreRow(candidate) > scoreRow(current)) {
      entries.set(term, candidate);
    }
  }
  return entries;
}

function matchesPrefix(term, prefix) {
  const remainder = term.slice(prefix.length);
  return term.startsWith(prefix) && COMMON_SUFFIXES.has(remainder);
}

function createTopicWords(topic, dictionary, sortedTerms, assignedTerms) {
  const words = [];
  const seen = new Set();
  for (const rawPrefix of topic.prefixes.split(/\s+/).filter(Boolean)) {
    const prefix = rawPrefix.toLowerCase();
    for (const term of sortedTerms) {
      if (
        !seen.has(term) &&
        !assignedTerms.has(term) &&
        matchesPrefix(term, prefix)
      ) {
        seen.add(term);
        assignedTerms.add(term);
        const source = dictionary.get(term);
        words.push({
          term,
          family: prefix,
          definition: source.definition,
          example: source.example,
          exampleTranslation: TOEIC_EXAMPLE_TRANSLATIONS[term] ?? "",
          dictionarySource: "offline",
          exampleSource: "offline",
          partOfSpeech: source.pos ?? "",
          posGroup: normalizePos(source.pos),
        });
      }
    }
  }
  return words;
}

function main() {
  const db = new DatabaseSync(DATABASE_PATH, { readOnly: true });
  try {
    const dictionary = buildDictionaryIndex(db);
    const sortedTerms = [...dictionary.keys()].sort();
    const assignedTerms = new Set();
    const topics = TOPICS.map((topic) => ({
      id: topic.id,
      title: topic.title,
      focus: topic.focus,
      words: createTopicWords(topic, dictionary, sortedTerms, assignedTerms),
    }));
    const entries = {};
    for (const topic of topics) {
      for (const word of topic.words) entries[word.term] = word;
    }
    const totalWords = assignedTerms.size;
    const output = applyToeicSpellingLabels({
      generatedFrom: "dictionary_en_vi.db",
      totalWords,
      topics: topics.map(({ words, ...topic }) => ({
        ...topic,
        terms: words.map((word) => word.term),
      })),
      entries,
    });
    validateToeicSpellingData(output);
    validateToeicExampleTranslations(output);
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(output)}\n`, "utf8");
    console.log(
      `Built TOEIC course data: ${totalWords} unique words across ${topics.length} topics.`,
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
  TOEIC_SPELLING_CONVENTION,
  applyToeicSpellingLabels,
  britishEquivalent,
  spellingNoteFor,
  validateToeicSpellingData,
  validateToeicExampleTranslations,
};
