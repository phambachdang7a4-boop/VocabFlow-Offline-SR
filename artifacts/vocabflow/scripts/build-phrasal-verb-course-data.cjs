const { createHash } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const DATABASE_PATH = join(
  __dirname,
  "../../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const DICTIONARY_DOMAIN_PATH = join(__dirname, "../domain/dictionary.ts");
const PHRASAL_COURSE_PATH = join(__dirname, "../domain/phrasal-verb-course.ts");
const TOPIC_MAP_PATH = join(__dirname, "../domain/phrasal-verb-topic-map.json");
const EXAMPLE_TRANSLATIONS_PATH = join(
  __dirname,
  "../domain/phrasal-verb-example-translations.json",
);
const EXAMPLE_REVIEWS_PATH = join(
  __dirname,
  "../domain/phrasal-verb-example-review.json",
);
const OUTPUT_PATH = join(
  __dirname,
  "../domain/phrasal-verb-course-data.json",
);

const PARTICLES = new Set([
  "about", "across", "after", "against", "along", "apart", "around",
  "aside", "at", "away", "back", "by", "down", "for", "forth", "from",
  "in", "into", "off", "on", "onto", "out", "over", "past", "through",
  "to", "together", "under", "up", "upon", "with", "without",
]);

const IRREGULAR_FORMS = {
  be: "am|are|is|was|were|been|being",
  become: "became|become|becomes|becoming",
  begin: "began|begun|begins|beginning",
  bend: "bent|bends|bending",
  bet: "bet|bets|betting",
  bind: "bound|binds|binding",
  bite: "bit|bitten|bites|biting",
  bleed: "bled|bleeds|bleeding",
  blow: "blew|blown|blows|blowing",
  break: "broke|broken|breaks|breaking",
  bring: "brought|brings|bringing",
  build: "built|builds|building",
  buy: "bought|buys|buying",
  catch: "caught|catches|catching",
  choose: "chose|chosen|chooses|choosing",
  come: "came|comes|coming",
  cost: "cost|costs|costing",
  creep: "crept|creeps|creeping",
  cut: "cut|cuts|cutting",
  deal: "dealt|deals|dealing",
  dig: "dug|digs|digging",
  do: "did|done|does|doing",
  draw: "drew|drawn|draws|drawing",
  drink: "drank|drunk|drinks|drinking",
  drive: "drove|driven|drives|driving",
  eat: "ate|eaten|eats|eating",
  fall: "fell|fallen|falls|falling",
  feed: "fed|feeds|feeding",
  feel: "felt|feels|feeling",
  fight: "fought|fights|fighting",
  find: "found|finds|finding",
  flee: "fled|flees|fleeing",
  fly: "flew|flown|flies|flying",
  forget: "forgot|forgotten|forgets|forgetting",
  forgive: "forgave|forgiven|forgives|forgiving",
  freeze: "froze|frozen|freezes|freezing",
  get: "got|gotten|gets|getting",
  give: "gave|given|gives|giving",
  go: "went|gone|goes|going",
  grow: "grew|grown|grows|growing",
  hang: "hung|hanged|hangs|hanging",
  have: "had|has|having",
  hear: "heard|hears|hearing",
  hide: "hid|hidden|hides|hiding",
  hit: "hit|hits|hitting",
  hold: "held|holds|holding",
  hurt: "hurt|hurts|hurting",
  keep: "kept|keeps|keeping",
  know: "knew|known|knows|knowing",
  lay: "laid|lays|laying",
  lead: "led|leads|leading",
  leave: "left|leaves|leaving",
  lend: "lent|lends|lending",
  let: "let|lets|letting",
  lie: "lay|lain|lies|lying",
  lose: "lost|loses|losing",
  make: "made|makes|making",
  mean: "meant|means|meaning",
  meet: "met|meets|meeting",
  pay: "paid|pays|paying",
  put: "put|puts|putting",
  read: "read|reads|reading",
  ride: "rode|ridden|rides|riding",
  ring: "rang|rung|rings|ringing",
  rise: "rose|risen|rises|rising",
  run: "ran|runs|running",
  say: "said|says|saying",
  see: "saw|seen|sees|seeing",
  seek: "sought|seeks|seeking",
  sell: "sold|sells|selling",
  send: "sent|sends|sending",
  set: "set|sets|setting",
  shake: "shook|shaken|shakes|shaking",
  shoot: "shot|shoots|shooting",
  show: "showed|shown|shows|showing",
  shut: "shut|shuts|shutting",
  sing: "sang|sung|sings|singing",
  sink: "sank|sunk|sinks|sinking",
  sit: "sat|sits|sitting",
  sleep: "slept|sleeps|sleeping",
  slide: "slid|slides|sliding",
  speak: "spoke|spoken|speaks|speaking",
  spend: "spent|spends|spending",
  stand: "stood|stands|standing",
  steal: "stole|stolen|steals|stealing",
  stick: "stuck|sticks|sticking",
  strike: "struck|stricken|strikes|striking",
  sweep: "swept|sweeps|sweeping",
  swim: "swam|swum|swims|swimming",
  take: "took|taken|takes|taking",
  teach: "taught|teaches|teaching",
  tear: "tore|torn|tears|tearing",
  tell: "told|tells|telling",
  think: "thought|thinks|thinking",
  throw: "threw|thrown|throws|throwing",
  understand: "understood|understands|understanding",
  wake: "woke|woken|wakes|waking",
  wear: "wore|worn|wears|wearing",
  win: "won|wins|winning",
  write: "wrote|written|writes|writing",
};

const TOPICS = [
  {
    id: "daily-life",
    title: "Sinh hoạt và gia đình",
    focus: "Việc thường ngày, nhà cửa và chăm sóc bản thân.",
    keywords: "home house family child clean cook food eat drink sleep wake wash dress clothes kitchen room",
    roots: "wake get dress wash clean cook eat drink sleep tidy",
  },
  {
    id: "work-study",
    title: "Học tập và công việc",
    focus: "Học tập, công việc, cuộc họp và hoàn thành nhiệm vụ.",
    keywords: "work job study school office meeting report project task teacher student class exam assignment business",
    roots: "work study learn teach hand report carry apply",
  },
  {
    id: "communication",
    title: "Giao tiếp và quan hệ",
    focus: "Trao đổi thông tin, giữ liên lạc và ứng xử.",
    keywords: "talk speak say tell ask answer call phone message discuss mention explain communicate friend relationship",
    roots: "talk speak say tell ask answer call chat",
  },
  {
    id: "travel-movement",
    title: "Di chuyển và du lịch",
    focus: "Đi lại, phương tiện, khởi hành và quay về.",
    keywords: "travel trip journey road car drive bus train airport station arrive leave move walk run transport",
    roots: "drive travel move walk run arrive depart go come",
  },
  {
    id: "money-shopping",
    title: "Tiền bạc và mua sắm",
    focus: "Mua bán, giá cả, thanh toán và quản lý tiền.",
    keywords: "money pay price cost buy sell shop purchase bank cash spend save bill rent debt tax",
    roots: "pay buy sell spend save shop bargain charge",
  },
  {
    id: "technology",
    title: "Công nghệ và thiết bị",
    focus: "Máy móc, thiết bị, máy tính và dữ liệu.",
    keywords: "computer internet file data phone screen machine device software printer system technology email",
    roots: "log click print boot plug switch back",
  },
  {
    id: "health-emotions",
    title: "Sức khỏe và cảm xúc",
    focus: "Sức khỏe, cảm xúc và cách phản ứng.",
    keywords: "health doctor hospital sick illness pain medicine feel happy angry sad worry calm emotion",
    roots: "cheer calm feel worry cry laugh recover",
  },
  {
    id: "rules-safety",
    title: "Quy tắc và an toàn",
    focus: "Quy định, pháp luật, nguy hiểm và bảo vệ.",
    keywords: "rule law police court crime fire safety danger protect arrest prison legal permission",
    roots: "arrest lock guard watch protect warn",
  },
  {
    id: "problem-solving",
    title: "Giải quyết vấn đề",
    focus: "Xử lý khó khăn, sửa chữa và tìm giải pháp.",
    keywords: "problem issue solve fix repair mistake trouble answer solution decide plan manage change",
    roots: "solve fix work figure sort deal handle",
  },
  {
    id: "other-situations",
    title: "Tình huống khác",
    focus: "Các cụm động từ dùng trong nhiều tình huống khác nhau.",
    keywords: "",
    roots: "",
  },
];

function normalizeTerm(term) {
  return String(term ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function verbForms(verb) {
  const forms = new Set([verb, ...(IRREGULAR_FORMS[verb] ?? "").split("|")]);
  const doubleFinal =
    /^[^aeiou]*[aeiou][^aeiouwxy]$/i.test(verb) && verb.length < 7
      ? `${verb}${verb.at(-1)}`
      : verb;
  forms.add(
    verb.endsWith("e")
      ? `${verb}d`
      : verb.endsWith("y") && !/[aeiou]y$/i.test(verb)
        ? `${verb.slice(0, -1)}ied`
        : `${verb}ed`,
  );
  forms.add(
    verb.endsWith("ie")
      ? `${verb.slice(0, -2)}ying`
      : verb.endsWith("e") && !/(?:ee|ye|oe)$/i.test(verb)
        ? `${verb.slice(0, -1)}ing`
        : `${doubleFinal}ing`,
  );
  forms.add(
    verb.endsWith("y") && !/[aeiou]y$/i.test(verb)
      ? `${verb.slice(0, -1)}ies`
      : /(?:s|x|z|ch|sh|o)$/i.test(verb)
        ? `${verb}es`
        : `${verb}s`,
  );
  return [...forms].filter(Boolean).sort((a, b) => b.length - a.length);
}

function headwordPattern(term) {
  const parts = term.split(" ");
  const forms = verbForms(parts[0]).map(escapeRegExp).join("|");
  const tail = parts.slice(1).map(escapeRegExp).join("\\s+");
  const contiguous = `\\b(?:${forms})\\s+${tail}\\b`;
  const separated =
    parts.length === 2
      ? `\\b(?:${forms})\\s+(?:[A-Za-z0-9'’-]+\\s+){1,4}${escapeRegExp(parts[1])}\\b`
      : "";
  return new RegExp(
    separated ? `(?:${contiguous}|${separated})` : contiguous,
    "i",
  );
}

function termIsCandidate(term) {
  const parts = term.split(" ");
  return (
    parts.length >= 2 &&
    parts.length <= 4 &&
    parts.every((part) => /^[a-z]+(?:['’-][a-z]+)*$/i.test(part)) &&
    PARTICLES.has(parts.at(-1).toLocaleLowerCase("en"))
  );
}

function sentenceQuality(example) {
  if (!example || example.split(/\s+/).length < 5) return 0;
  const trimmed = example.trim();
  let score = 0;
  if (/^[“"'‘]?[A-Z]/u.test(trimmed)) score += 5;
  if (/[.!?][”"'’)]?$/u.test(trimmed)) score += 5;
  if (!/\b[A-Z]{2,}\b/u.test(trimmed)) score += 2;
  if (trimmed.length >= 24 && trimmed.length <= 220) score += 2;
  if (!/\s{2,}/u.test(trimmed)) score += 1;
  return score;
}

function entryScore(row, matcher) {
  const definition = String(row.definition ?? "").trim();
  const example = String(row.example ?? "").trim();
  if (!definition || !example || !matcher.test(example)) return -1;
  const quality = sentenceQuality(example);
  if (quality < 8) return -1;
  return (
    quality +
    Math.min(definition.length, 180) / 100 +
    (/[à-ỹđ]/iu.test(definition) ? 3 : 0) -
    (/\bIT\b/u.test(example) ? 1 : 0)
  );
}

function classifyTopic(term, definition, example) {
  const root = term.split(" ")[0].toLocaleLowerCase("en");
  const tokens = new Set(
    `${term} ${definition} ${example}`
      .toLocaleLowerCase("en")
      .split(/[^a-z]+/u)
      .filter((token) => token.length >= 4),
  );
  let best = TOPICS.at(-1);
  let bestScore = 0;
  for (const topic of TOPICS.slice(0, -1)) {
    const keywordHits = topic.keywords
      .split(/\s+/)
      .filter(Boolean)
      .filter((keyword) =>
        [...tokens].some((token) => token.startsWith(keyword)),
      ).length;
    const rootHits = topic.roots.split(/\s+/).filter(Boolean).includes(root);
    const score = keywordHits + (rootHits ? 3 : 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best;
}

function main() {
  if (!existsSync(DATABASE_PATH)) {
    throw new Error(
      `Không tìm thấy từ điển nguồn tại ${DATABASE_PATH}. Hãy chuẩn bị dữ liệu từ điển trước.`,
    );
  }
  const domain = readFileSync(DICTIONARY_DOMAIN_PATH, "utf8");
  const expectedHash = domain.match(/sha256:\s*'([a-f0-9]{64})'/i)?.[1];
  if (!expectedHash) throw new Error("Không đọc được mã kiểm tra từ điển đã ghim.");
  const actualHash = createHash("sha256")
    .update(readFileSync(DATABASE_PATH))
    .digest("hex");
  if (actualHash !== expectedHash)
    throw new Error("Từ điển nguồn không khớp phiên bản đã ghim.");
  const exampleTranslations = JSON.parse(
    readFileSync(EXAMPLE_TRANSLATIONS_PATH, "utf8"),
  );
  const exampleReviews = JSON.parse(readFileSync(EXAMPLE_REVIEWS_PATH, "utf8"));
  if (exampleTranslations.sourceSha256 !== actualHash)
    throw new Error(
      "Bản dịch ví dụ không khớp phiên bản từ điển đã ghim.",
    );
  const curatedTopicMap = JSON.parse(readFileSync(TOPIC_MAP_PATH, "utf8"));

  const db = new DatabaseSync(DATABASE_PATH, { readOnly: true });
  try {
    const phrasalSource = readFileSync(PHRASAL_COURSE_PATH, "utf8");
    const authoredTerms = new Set(
      [...phrasalSource.matchAll(/^\s*\["([^"]+)",/gm)]
        .map((match) => normalizeTerm(match[1])),
    );
    const rows = db.prepare(`
      SELECT w.word AS term, d.definition, wd.example, d.pos
      FROM words w
      JOIN word_definitions wd ON wd.word_id = w.id
      JOIN definitions d ON d.id = wd.definition_id
      WHERE w.lang_code = 'en'
        AND d.definition_lang = 'vi'
        AND LOWER(TRIM(COALESCE(d.pos, ''))) IN ('v', 'verb', 'vt', 'vi')
        AND TRIM(w.word) <> ''
        AND TRIM(COALESCE(d.definition, '')) <> ''
      ORDER BY w.word COLLATE NOCASE, wd.id
    `).all();

    const chosen = new Map();
    let candidateRows = 0;
    for (const row of rows) {
      const term = String(row.term ?? "").trim().replace(/\s+/g, " ");
      const key = normalizeTerm(term);
      if (!key || authoredTerms.has(key) || !termIsCandidate(key)) continue;
      candidateRows += 1;
      const matcher = headwordPattern(key);
      const score = entryScore(row, matcher);
      if (score < 0) continue;
      const previous = chosen.get(key);
      if (!previous || score > previous.score) {
        const topic =
          TOPICS.find((candidate) => candidate.id === curatedTopicMap[key]) ??
          classifyTopic(key, row.definition, row.example);
        chosen.set(key, {
          term: key,
          definition: String(row.definition).trim(),
          example: String(row.example).trim(),
          rootVerb: key.split(" ")[0],
          topicId: topic.id,
          topicTitle: topic.title,
          partOfSpeech: String(row.pos ?? "V"),
          dictionarySource: "offline",
          score,
        });
      }
    }

    if (chosen.size < 1_000) {
      throw new Error(
        `Chỉ lọc được ${chosen.size} cụm có ví dụ phù hợp; dừng để tránh tạo khóa quá ngắn.`,
      );
    }
    const entries = Object.fromEntries(
      [...chosen.values()]
        .sort(
          (a, b) =>
            a.topicId.localeCompare(b.topicId) ||
            a.rootVerb.localeCompare(b.rootVerb, "en") ||
            a.term.localeCompare(b.term, "en"),
        )
        .map(({ score, ...entry }) => {
          const exampleTranslation =
            exampleTranslations.translations[entry.term];
          if (
            typeof exampleTranslation !== "string" ||
            !exampleTranslation.trim() ||
            !/[à-ỹÀ-ỸđĐ]/u.test(exampleTranslation)
          ) {
            throw new Error(
              `Thiếu bản dịch tiếng Việt cho ví dụ cụm động từ: ${entry.term}`,
            );
          }
          return [
            entry.term,
            { ...entry, exampleTranslation: exampleTranslation.trim() },
          ];
        }),
    );
    if (
      Object.keys(exampleTranslations.translations).length !==
      Object.keys(entries).length
    )
      throw new Error(
        "Số bản dịch ví dụ không khớp số cụm động từ được tạo.",
      );
    for (const [term, review] of Object.entries(exampleReviews.reviews ?? {})) {
      const entry = entries[term];
      if (!entry)
        throw new Error(`Không tìm thấy cụm từ đã duyệt trong dữ liệu nguồn: ${term}`);
      if (
        createHash("sha256").update(entry.example).digest("hex") !==
          review.exampleSha256 ||
        createHash("sha256").update(entry.definition).digest("hex") !==
          review.definitionSha256
      )
        throw new Error(
          `Ví dụ hoặc nghĩa nguồn của “${term}” đã đổi; cần duyệt lại trước khi dựng khóa.`,
        );
      if (
        !["corrected", "retained"].includes(review.decision) ||
        !review.reviewNote?.trim() ||
        !review.approvedExample?.trim() ||
        !review.approvedTranslation?.trim() ||
        !/[à-ỹÀ-ỸđĐ]/u.test(review.approvedTranslation)
      )
        throw new Error(`Thiếu quyết định hoặc nội dung đã duyệt cho: ${term}`);
    }
    for (const [term, entry] of Object.entries(entries)) {
      const review = exampleReviews.reviews?.[term];
      if (review) {
        entry.sourceExample = entry.example;
        entry.example = review.approvedExample.trim();
        entry.exampleTranslation = review.approvedTranslation.trim();
      } else {
        entry.exampleTranslation =
          exampleTranslations.translations[term].trim();
      }
    }
    const topics = TOPICS.map((topic) => ({
      id: topic.id,
      title: topic.title,
      focus: topic.focus,
      terms: Object.values(entries)
        .filter((entry) => entry.topicId === topic.id)
        .map((entry) => entry.term),
    })).filter((topic) => topic.terms.length > 0);
    const output = {
      generatedFrom: "dictionary_en_vi.db",
      sourceSha256: actualHash,
      sourceRows: rows.length,
      candidateRows,
      uniqueTerms: Object.keys(entries).length,
      topics,
      entries,
    };
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(output)}\n`, "utf8");
    console.log(
      `Built phrasal-verb course: ${output.uniqueTerms} unique dictionary entries from ${candidateRows} candidate rows across ${topics.length} themes.`,
    );
    for (const topic of topics)
      console.log(`${topic.title}: ${topic.terms.length}`);
  } finally {
    db.close();
  }
}

if (require.main === module) main();

module.exports = {
  headwordPattern,
  normalizeTerm,
  sentenceQuality,
  termIsCandidate,
};
