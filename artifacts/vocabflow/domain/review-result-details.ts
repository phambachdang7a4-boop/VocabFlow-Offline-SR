import {
  pronunciationAccent,
  type DictionaryPronunciation,
} from "./dictionary";
import { ALL_LOCAL_DICTIONARY_ADDITIONS } from "./dictionary-local-additions";

export interface ReviewPronunciationLines {
  us: string[];
  uk: string[];
  unspecified: string[];
}

function uniqueIpa(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseSavedPronunciations(value: string): ReviewPronunciationLines {
  const result: ReviewPronunciationLines = { us: [], uk: [], unspecified: [] };
  const unlabelled: string[] = [];

  for (const segment of value.split(/\s*·\s*/u).map((part) => part.trim())) {
    if (!segment) continue;
    const match = segment.match(
      /^(Anh-Mỹ\/Anh-Anh|Anh-Mỹ|Anh-Anh|NAmE|BrE|US|UK)\s*:\s*(.+)$/iu,
    );
    if (!match) {
      unlabelled.push(segment);
      continue;
    }

    const label = match[1].toLocaleLowerCase("vi");
    if (label === "anh-mỹ/anh-anh") {
      result.us.push(match[2]);
      result.uk.push(match[2]);
    } else if (label === "anh-anh" || label === "bre" || label === "uk") {
      result.uk.push(match[2]);
    } else {
      result.us.push(match[2]);
    }
  }

  result.unspecified.push(...unlabelled);
  return {
    us: uniqueIpa(result.us),
    uk: uniqueIpa(result.uk),
    unspecified: uniqueIpa(result.unspecified),
  };
}

export function groupReviewPronunciations(
  pronunciations: readonly DictionaryPronunciation[],
  savedIpa: string,
): ReviewPronunciationLines {
  const saved = parseSavedPronunciations(savedIpa);
  const us = uniqueIpa(
    pronunciations
      .filter((item) => pronunciationAccent(item.region) === "us")
      .map((item) => item.ipa),
  );
  const uk = uniqueIpa(
    pronunciations
      .filter((item) => pronunciationAccent(item.region) === "uk")
      .map((item) => item.ipa),
  );

  return {
    us: us.length ? us : saved.us,
    uk: uk.length ? uk : saved.uk,
    unspecified: saved.unspecified,
  };
}

function normalizeExample(example: string): string {
  return example.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

const FAMILY_EXAMPLE_TRANSLATIONS: [string, string][] = [
  [
    "A family is a group of people related to one another, such as parents and children.",
    "Gia đình là một nhóm người có quan hệ với nhau, chẳng hạn như cha mẹ và con cái.",
  ],
  [
    "A parent is a mother or father who raises and cares for a child.",
    "Cha hoặc mẹ là người nuôi dưỡng và chăm sóc con.",
  ],
  [
    "A mother is the woman who gives birth to a child or raises one.",
    "Mẹ là người phụ nữ sinh ra hoặc nuôi dưỡng một đứa trẻ.",
  ],
  [
    "A father is the man who has a child and helps care for them.",
    "Cha là người đàn ông có con và góp phần chăm sóc con.",
  ],
  [
    "A child is a young person who has not yet become an adult.",
    "Trẻ em là người trẻ tuổi chưa trưởng thành.",
  ],
  [
    "A kid is a child who is still growing up.",
    "Trẻ con là những đứa trẻ vẫn đang lớn.",
  ],
  [
    "A son is a person's male child.",
    "Con trai là người con thuộc giới tính nam của ai đó.",
  ],
  [
    "A daughter is a person's female child.",
    "Con gái là người con thuộc giới tính nữ của ai đó.",
  ],
  [
    "A brother is a boy or man who has the same parent as you.",
    "Anh hoặc em trai là người nam có cùng cha hoặc mẹ với bạn.",
  ],
  [
    "A sister is a girl or woman who has the same parent as you.",
    "Chị hoặc em gái là người nữ có cùng cha hoặc mẹ với bạn.",
  ],
  [
    "A sibling is a brother or sister in the same family.",
    "Anh chị em ruột là anh, chị hoặc em trong cùng một gia đình.",
  ],
  [
    "A husband is a man who is married to someone.",
    "Chồng là người đàn ông đã kết hôn.",
  ],
  [
    "A wife is a woman who is married to someone.",
    "Vợ là người phụ nữ đã kết hôn.",
  ],
  [
    "A grandson is the son of someone's son or daughter.",
    "Cháu trai là con trai của con trai hoặc con gái của một người.",
  ],
  [
    "A grandmother is the mother of someone's mother or father.",
    "Bà là mẹ của cha hoặc mẹ của một người.",
  ],
  [
    "A grandfather is the father of someone's mother or father.",
    "Ông là cha của cha hoặc mẹ của một người.",
  ],
  [
    "Grandma is an informal word for a grandmother.",
    "“Grandma” là cách gọi thân mật của “bà”.",
  ],
  [
    "A granddaughter is the daughter of someone's son or daughter.",
    "Cháu gái là con gái của con trai hoặc con gái của một người.",
  ],
  [
    "An uncle is the brother of your mother or father, or the husband of your aunt.",
    "Chú, bác hoặc cậu là anh/em trai của cha mẹ bạn hoặc chồng của cô/dì bạn.",
  ],
  [
    "An aunt is the sister of your mother or father, or the wife of your uncle.",
    "Cô, dì hoặc bác gái là chị/em gái của cha mẹ bạn hoặc vợ của chú/bác/cậu bạn.",
  ],
  [
    "A cousin is the child of your aunt or uncle.",
    "Anh, chị hoặc em họ là con của cô, dì, chú, bác hoặc cậu bạn.",
  ],
  [
    "A nephew is the son of your brother or sister.",
    "Cháu trai là con trai của anh, chị hoặc em bạn.",
  ],
  [
    "A niece is the daughter of your brother or sister.",
    "Cháu gái là con gái của anh, chị hoặc em bạn.",
  ],
  [
    "A relative is a person who belongs to your family.",
    "Người thân là người thuộc gia đình bạn.",
  ],
  [
    "A baby is a very young child who cannot walk or talk yet.",
    "Em bé là trẻ rất nhỏ chưa biết đi hoặc nói.",
  ],
  [
    "An adult is a fully grown person, not a child.",
    "Người trưởng thành là người đã lớn, không còn là trẻ em.",
  ],
  [
    "A teenager is someone between the ages of 13 and 19.",
    "Thiếu niên là người từ 13 đến 19 tuổi.",
  ],
  [
    "The word people means more than one person.",
    "Từ “people” có nghĩa là nhiều hơn một người.",
  ],
  [
    "A person is one human being.",
    "“Person” nghĩa là một con người.",
  ],
  [
    "A man is an adult male person.",
    "“Man” là một người trưởng thành thuộc giới tính nam.",
  ],
  [
    "A woman is an adult female person.",
    "“Woman” là một người trưởng thành thuộc giới tính nữ.",
  ],
  [
    "A boy is a male child.",
    "“Boy” là một bé trai.",
  ],
  [
    "A girl is a female child.",
    "“Girl” là một bé gái.",
  ],
  [
    "When two people marry, they become spouses.",
    "Khi hai người kết hôn, họ trở thành vợ chồng.",
  ],
  [
    "A wedding is a ceremony where two people get married.",
    "Đám cưới là buổi lễ nơi hai người kết hôn.",
  ],
  [
    "A generation is a group of people born around the same time, such as parents and children.",
    "Một thế hệ là nhóm người sinh ra trong khoảng thời gian gần nhau, chẳng hạn như cha mẹ và con cái.",
  ],
];

const REVIEW_EXAMPLE_TRANSLATIONS = new Map<string, string>([
  [
    normalizeExample("It is important to reciprocate a favor kindly."),
    "Điều quan trọng là đáp lại một ân huệ một cách tử tế.",
  ],
  ...ALL_LOCAL_DICTIONARY_ADDITIONS.map(({ example, exampleTranslation }) => [
    normalizeExample(example),
    exampleTranslation,
  ] as [string, string]),
  ...FAMILY_EXAMPLE_TRANSLATIONS.map(([example, translation]) => [
    normalizeExample(example),
    translation,
  ] as [string, string]),
]);

export function reviewExampleTranslation(example: string): string | null {
  return REVIEW_EXAMPLE_TRANSLATIONS.get(normalizeExample(example)) ?? null;
}
