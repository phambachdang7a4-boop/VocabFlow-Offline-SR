import familyExamplesJson from '../data/basic-family-example-overrides.json';

type FamilyLessonId = 'basic-965-v2-family-1' | 'basic-965-v2-family-2';

const familyExamples = familyExamplesJson as Record<string, Record<string, string>>;

const targets: {
  lessonId: FamilyLessonId;
  entryId: number;
  senseId: number;
  term: string;
}[] = [
  { lessonId: 'basic-965-v2-family-1', entryId: 371147, senseId: 634240, term: 'family' },
  { lessonId: 'basic-965-v2-family-1', entryId: 91669, senseId: 198048, term: 'parent' },
  { lessonId: 'basic-965-v2-family-1', entryId: 153122, senseId: 327762, term: 'mother' },
  { lessonId: 'basic-965-v2-family-1', entryId: 201904, senseId: 399953, term: 'father' },
  { lessonId: 'basic-965-v2-family-1', entryId: 202935, senseId: 402536, term: 'child' },
  { lessonId: 'basic-965-v2-family-1', entryId: 120105, senseId: 263178, term: 'kid' },
  { lessonId: 'basic-965-v2-family-1', entryId: 145902, senseId: 308060, term: 'son' },
  { lessonId: 'basic-965-v2-family-1', entryId: 149005, senseId: 316291, term: 'daughter' },
  { lessonId: 'basic-965-v2-family-1', entryId: 202843, senseId: 402341, term: 'brother' },
  { lessonId: 'basic-965-v2-family-1', entryId: 87770, senseId: 178616, term: 'sister' },
  { lessonId: 'basic-965-v2-family-1', entryId: 87667, senseId: 178435, term: 'sibling' },
  { lessonId: 'basic-965-v2-family-1', entryId: 119933, senseId: 262628, term: 'husband' },
  { lessonId: 'basic-965-v2-family-1', entryId: 205363, senseId: 406944, term: 'wife' },
  { lessonId: 'basic-965-v2-family-1', entryId: 78732, senseId: 162312, term: 'grandson' },
  { lessonId: 'basic-965-v2-family-1', entryId: 119671, senseId: 261780, term: 'grandmother' },
  { lessonId: 'basic-965-v2-family-1', entryId: 152847, senseId: 326319, term: 'grandfather' },
  { lessonId: 'basic-965-v2-family-1', entryId: 151350, senseId: 320725, term: 'grandma' },
  { lessonId: 'basic-965-v2-family-2', entryId: 78723, senseId: 162296, term: 'granddaughter' },
  { lessonId: 'basic-965-v2-family-2', entryId: 210132, senseId: 413542, term: 'uncle' },
  { lessonId: 'basic-965-v2-family-2', entryId: 152151, senseId: 322382, term: 'aunt' },
  { lessonId: 'basic-965-v2-family-2', entryId: 99705, senseId: 214358, term: 'cousin' },
  { lessonId: 'basic-965-v2-family-2', entryId: 83358, senseId: 170663, term: 'nephew' },
  { lessonId: 'basic-965-v2-family-2', entryId: 83391, senseId: 170728, term: 'niece' },
  { lessonId: 'basic-965-v2-family-2', entryId: 86285, senseId: 175903, term: 'relative' },
  { lessonId: 'basic-965-v2-family-2', entryId: 371084, senseId: 634177, term: 'baby' },
  { lessonId: 'basic-965-v2-family-2', entryId: 146629, senseId: 312027, term: 'adult' },
  { lessonId: 'basic-965-v2-family-2', entryId: 220364, senseId: 432137, term: 'teenager' },
  { lessonId: 'basic-965-v2-family-2', entryId: 119581, senseId: 261446, term: 'people' },
  { lessonId: 'basic-965-v2-family-2', entryId: 153269, senseId: 328447, term: 'person' },
  { lessonId: 'basic-965-v2-family-2', entryId: 63831, senseId: 136126, term: 'man' },
  { lessonId: 'basic-965-v2-family-2', entryId: 205035, senseId: 406432, term: 'woman' },
  { lessonId: 'basic-965-v2-family-2', entryId: 94132, senseId: 202859, term: 'boy' },
  { lessonId: 'basic-965-v2-family-2', entryId: 99959, senseId: 214882, term: 'girl' },
  { lessonId: 'basic-965-v2-family-2', entryId: 220015, senseId: 431067, term: 'marry' },
  { lessonId: 'basic-965-v2-family-2', entryId: 205964, senseId: 407890, term: 'wedding' },
  { lessonId: 'basic-965-v2-family-2', entryId: 78182, senseId: 161411, term: 'generation' },
];

export const DICTIONARY_EXAMPLE_REVISION = 'family-examples-v1';

export const DICTIONARY_EXAMPLE_UPDATES = targets.map(target => ({
  ...target,
  example: familyExamples[target.lessonId][target.term],
}));
