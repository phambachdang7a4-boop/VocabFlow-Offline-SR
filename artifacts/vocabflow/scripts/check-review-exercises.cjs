const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadTs, loadDictionaryDomain, srs, createRepository } = require('./test-support.cjs');
const dictionary = loadDictionaryDomain();
const exercises = loadTs(join(__dirname, '../domain/review-exercises.ts'), { './dictionary': dictionary });
const word = {
  id: 1, term: 'whimsical', meaning: 'kỳ quặc, giàu tưởng tượng', ipa: '', note: '',
  example: 'Whimsical paintings are whimsical.',
  ...srs.initialProgress('2026-11-07'),
};
const notebookWords = [
  word,
  { ...word, id: 2, term: 'playful' },
  { ...word, id: 3, term: 'ordinary' },
  { ...word, id: 4, term: 'serious' },
];
assert.equal(exercises.createReviewExercise(word, 0).kind, 'meaning');
const idiomWord = {
  ...word,
  term: 'break the ice',
  meaning: '(idiom) phá tan bầu không khí ngượng ngùng',
  example: 'She told a joke to break the ice.',
};
assert.equal(exercises.isIdiomVocabularyWord(idiomWord), true);
assert.equal(exercises.isIdiomVocabularyWord({ ...word, meaning: '(verb) break the ice' }), false);
const idiomDialogue = exercises.createIdiomDialogueExercise(idiomWord);
assert.equal(idiomDialogue.kind, 'idiom-dialogue');
assert.equal(idiomDialogue.dialoguePrompt,
  'Tớ đang nghĩ đến một idiom có nghĩa là “phá tan bầu không khí ngượng ngùng”. Cậu đoán được không?');
assert.equal(idiomDialogue.prompt, 'She told a joke to ________.');
assert.ok(!idiomDialogue.prompt.includes(idiomWord.term), 'The dialogue reply must hide the idiom.');
assert.ok(!idiomDialogue.dialoguePrompt.includes(idiomWord.term),
  'Corvi’s message must not reveal the answer.');
assert.equal(exercises.checkReviewAnswer('breaktheice', idiomWord.term), true);
const idiomFallback = exercises.createIdiomDialogueExercise({ ...idiomWord, example: '' });
assert.equal(idiomFallback.kind, 'idiom-dialogue');
assert.equal(idiomFallback.prompt, 'Mình đoán là ________.');
assert.match(idiomFallback.dialoguePrompt, /idiom/u);
assert.equal(idiomFallback.fallback, true);
assert.throws(
  () => exercises.createIdiomDialogueExercise(word),
  /đánh dấu là idiom/,
  'Do not turn ordinary saved words into idiom dialogue questions.',
);
const cloze = exercises.createReviewExercise(word, 1, 0, notebookWords);
assert.equal(cloze.kind, 'multiple-choice');
assert.equal(cloze.prompt, '________ paintings are ________.');
assert.ok(!cloze.prompt.toLowerCase().includes(word.term));
assert.equal(exercises.createReviewExercise({ ...word, reviewCount: 1 }, 0, undefined, notebookWords).kind, 'multiple-choice',
  'Single-word sessions also use multiple choice for sentence questions');
assert.equal(exercises.createReviewExercise({ ...word, reviewCount: 1 }, 1, 0, notebookWords).kind, 'multiple-choice',
  'A fixed session offset must keep sentence questions as choices');
assert.equal(exercises.clozeSentence('The theater is there.', 'he'), null);
assert.equal(exercises.clozeSentence('C++ is not C+.', 'C++'), '________ is not C+.');
assert.equal(exercises.clozeSentence('They take  off.', 'take off'), 'They ________.');
assert.equal(exercises.clozeSentence('She is running.', 'run'), null, 'Never expect a different inflection silently');
for (const example of ['', 'Nothing matches here.']) {
  const fallback = exercises.createReviewExercise({ ...word, example }, 1);
  assert.equal(fallback.kind, 'meaning');
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.prompt, word.meaning);
}
assert.equal(exercises.createReviewExercise({ ...word, meaning: 'A whimsical style.' }, 0).prompt, 'A ________ style.');
const hints = [1, 2, 3].map(level => exercises.letterHint({ ...word, level }));
const counts = hints.map(hint => hint.replace(/_/g, '').length);
assert.ok(counts[0] > counts[1] && counts[1] > counts[2]);
assert.ok(counts[0] < word.term.length);
assert.deepEqual([1, 2, 3].map(level => exercises.letterHint({ ...word, term: 'cat', level }).replace(/_/g, '').length), [2, 1, 0]);
for (const level of [4, 5, 6]) assert.equal(exercises.letterHint({ ...word, level }), null);
assert.equal(exercises.letterHint(word), exercises.letterHint(word), 'Typing/rerendering must not reshuffle hints');
for (const term of ['a', 'go', 'résumé', 'take off', 'C++', '123']) {
  for (const level of [1, 2, 3]) {
    const hint = exercises.letterHint({ ...word, term, level });
    assert.ok(hint.includes('_'), 'Never reveal the full answer, including short words');
  }
}
assert.equal(exercises.letterHint({ ...word, term: '++' }), null);
assert.equal(exercises.normalizeReviewAnswer('grow up'), 'growup');
for (const [input, target] of [
  [' WHIMSICAL ', 'whimsical'],
  ['TAKE   OFF', 'take off'],
  ['bumpinto', 'bump into'],
  ['growup', 'grow up'],
  ['bump into', 'bumpinto'],
  ['don’t', "don't"],
  ['part‑time', 'part-time'],
  ['ＨＥＬＬＯ', 'hello'],
]) {
  assert.equal(exercises.checkReviewAnswer(input, target), true);
}
for (const [input, target] of [
  ['find\u200Bout', 'find out'],
  ['find\uFEFFout', 'find out'],
  ['find\u200Bout\u200B', 'find out'],
]) {
  assert.equal(exercises.checkReviewAnswer(input, target), true, 'Invisible word separators must not make a visually correct answer wrong');
}
for (const [input, target] of [['', 'go'], ['   ', 'go'], ['dessert', 'desert'], ['goes', 'go'], ['cant', "can't"], ['take-off', 'take off']]) {
  assert.equal(exercises.checkReviewAnswer(input, target), false);
}

const multipleChoice = exercises.createReviewExercise(word, 2, 0, notebookWords);
assert.equal(multipleChoice.kind, 'multiple-choice');
assert.equal(multipleChoice.prompt, '________ paintings are ________.');
assert.equal(multipleChoice.choices.length, 4);
assert.equal(new Set(multipleChoice.choices.map(exercises.normalizeReviewAnswer)).size, 4);
assert.equal(multipleChoice.choices.filter(choice => exercises.checkReviewAnswer(choice, word.term)).length, 1);
assert.ok(multipleChoice.choices.every(choice => notebookWords.some(candidate =>
  exercises.checkReviewAnswer(choice, candidate.term),
)), 'All answer choices must come from the notebook.');
assert.deepEqual(
  exercises.createReviewExercise(word, 2, 0, notebookWords).choices,
  multipleChoice.choices,
  'Choices must remain stable while a question is displayed.',
);
assert.equal(exercises.createReviewExercise(word, 2, 0, notebookWords.slice(0, 3)).choices.length, 3);
const fewChoices = exercises.createReviewExercise(word, 2, 0, notebookWords.slice(0, 2));
assert.equal(fewChoices.kind, 'meaning');
assert.match(fewChoices.fallbackNote, /ít nhất 3 từ/);
const noSentenceQuiz = exercises.createReviewExercise({ ...word, example: 'A sentence without the saved word.' }, 2, 0, notebookWords);
assert.equal(noSentenceQuiz.kind, 'meaning');
assert.match(noSentenceQuiz.fallbackNote, /Chưa có câu ví dụ/);

(async () => {
  const root = mkdtempSync(join(tmpdir(), 'vocabflow-exercises-'));
  const storage = createRepository(root, '2026-11-07T12:00:00');
  try {
    await storage.repo.saveWord({ term: word.term, meaning: word.meaning, ipa: '', note: '', example: word.example });
    for (let level = 1; level <= 6; level++) {
      const current = (await storage.repo.listWords())[0];
      assert.equal(current.level, level);
      storage.setDay(current.nextReviewOn);
      const question = exercises.createReviewExercise(current, 0);
      if (level >= 4) assert.equal(question.hint, null);
      const correct = exercises.checkReviewAnswer('  WHIMSICAL ', current.term);
      await storage.repo.recordReview(current.id, correct, current.reviewCount);
      await assert.rejects(storage.repo.recordReview(current.id, correct, current.reviewCount), /thay đổi/, 'A duplicate submission cannot apply SRS twice');
    }
    const finished = (await storage.repo.listWords())[0];
    assert.equal(finished.level, 6);
    assert.equal(finished.completed, true);
    assert.equal(finished.reviewCount, 6);
    assert.equal(finished.nextReviewOn, null);
    await storage.repo.saveWord({ term: 'go', meaning: 'đi', ipa: '', note: '', example: 'They go home.' });
    await storage.repo.saveWord({ term: 'playful', meaning: 'tinh nghịch', ipa: '', note: '', example: '' });
    let go = (await storage.repo.listWords()).find(row => row.term === 'go');
    await storage.repo.recordReview(go.id, true, go.reviewCount);
    go = (await storage.repo.listWords()).find(row => row.term === 'go');
    storage.setDay(go.nextReviewOn);
    const anchor = go.learnedOn;
    const quiz = exercises.createReviewExercise(go, 0, 1, await storage.repo.listWords());
    assert.equal(quiz.kind, 'multiple-choice');
    assert.equal(quiz.prompt, 'They ________ home.');
    const wrongChoice = quiz.choices.find(choice => !exercises.checkReviewAnswer(choice, go.term));
    assert.ok(wrongChoice);
    await storage.repo.recordReview(go.id, exercises.checkReviewAnswer(wrongChoice, go.term), go.reviewCount);
    go = (await storage.repo.listWords()).find(row => row.term === 'go');
    assert.equal(go.level, 1);
    assert.equal(go.reviewCount, 2);
    assert.equal(go.learnedOn, anchor);
    console.log('PASS: typed meaning plus sentence multiple choice; 3/4 notebook-only choices; safe fallbacks; stable options; correct/wrong choices grade through SQLite SRS.');
  } finally {
    storage.db?.close();
    rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
