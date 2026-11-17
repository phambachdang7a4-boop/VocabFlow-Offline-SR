const assert = require("node:assert/strict");
const { join } = require("node:path");
const {
  loadLocalDictionaryAdditions,
  loadToeicTopicCourseDomain,
  loadTs,
} = require("./test-support.cjs");
const colors = loadTs(join(__dirname, "../constants/colors.ts")).default.light;
const courseDomain = loadTs(join(__dirname, "../domain/conjunction-course.ts"), {
  "./dictionary-local-additions": loadLocalDictionaryAdditions(),
});
const linkingAdverbDomain = loadTs(
  join(__dirname, "../domain/linking-adverb-course.ts"),
);
const sentenceStructurePatternDomain = loadTs(
  join(__dirname, "../domain/sentence-structure-patterns.ts"),
);
const ieltsTopicDomain = loadTs(
  join(__dirname, "../domain/ielts-topic-course.ts"),
  {
    "./ielts-topic-course-data.json": require(
      "../domain/ielts-topic-course-data.json",
    ),
  },
);
const toeicTopicDomain = loadToeicTopicCourseDomain();
const officeAppsDomain = loadTs(
  join(__dirname, "../domain/office-apps-course.ts"),
);
const idiomCourseData = require("../domain/idiom-course-data.json");
const dictionaryDomain = require("./test-support.cjs").loadDictionaryDomain();
const idiomCourseDomain = loadTs(
  join(__dirname, "../domain/idiom-course.ts"),
  {
    "./idiom-course-data.json": idiomCourseData,
    "./dictionary": dictionaryDomain,
  },
);
const phrasalVerbCourseDomain = loadTs(
  join(__dirname, "../domain/phrasal-verb-course.ts"),
  {
    "./phrasal-verb-course-data.json": require(
      "../domain/phrasal-verb-course-data.json",
    ),
  },
);
const combinedLessonCount =
  courseDomain.CONJUNCTION_COURSE_LESSONS.length +
  linkingAdverbDomain.LINKING_ADVERB_COURSE_LESSONS.length +
  sentenceStructurePatternDomain.SENTENCE_STRUCTURE_PATTERN_LESSONS.length;
const courseWordSelectionDomain = loadTs(
  join(__dirname, "../domain/course-word-selection.ts"),
);
const savedWordMetadataDomain = loadTs(
  join(__dirname, "../domain/saved-word-metadata.ts"),
);
const element = (type, props, ...children) => {
  if (typeof type === "function") return type(props ?? {});
  return { type, props: { ...props, children } };
};
const native = Object.fromEntries(
  ["View", "Text", "Image", "Pressable", "ScrollView", "Modal", "ActivityIndicator"].map(
    (name) => [name, name],
  ),
);
native.Platform = { OS: "android" };
native.StyleSheet = { create: (value) => value };
native.useWindowDimensions = () => ({ width: 400, height: 800 });
const tick = () => new Promise((resolve) => setImmediate(resolve));

function find(node, predicate) {
  if (Array.isArray(node))
    return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== "object") return undefined;
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function findAll(node, predicate, matches = []) {
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, matches);
    return matches;
  }
  if (!node || typeof node !== "object") return matches;
  if (predicate(node)) matches.push(node);
  findAll(node.props?.children, predicate, matches);
  return matches;
}

function textContent(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  return node && typeof node === "object"
    ? textContent(node.props?.children)
    : "";
}

function mount(initialSavedWords = [], options = {}) {
  const slots = [];
  const focusCallbacks = [];
  let cursor = 0;
  let dirty = true;
  let tree;
  const completed = [...(options.completedLessons ?? [])];
  const attempts = options.lessonAttempts ?? [];
  const savedWords = [...initialSavedWords];
  const savedWordInputs = [];
  const savedWordBatches = [];
  const ipaLookupCalls = [];
  const react = {
    createElement: element,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) => {
          const next = typeof value === "function" ? value(slots[index]) : value;
          if (!Object.is(next, slots[index])) {
            slots[index] = next;
            dirty = true;
          }
        },
      ];
    },
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
  };
  const loaded = loadTs(join(__dirname, "../app/(tabs)/courses.tsx"), {
    react: { ...react, default: react },
    "react-native": native,
    "@expo/vector-icons": { Feather: "Feather" },
    "expo-router": {
      useFocusEffect: (callback) => focusCallbacks.push(callback),
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
    },
    "@/components/ScreenHeader": { useBottomPad: () => 108 },
    "@/components/ui": {
      Button: "Button",
      F: { b: "bold", r: "regular", s: "semibold" },
      MaterialSheen: "MaterialSheen",
    },
    "@/domain/conjunction-course": courseDomain,
    "@/domain/linking-adverb-course": linkingAdverbDomain,
    "@/domain/sentence-structure-patterns": sentenceStructurePatternDomain,
    "@/domain/ielts-topic-course": ieltsTopicDomain,
    "@/domain/toeic-topic-course": toeicTopicDomain,
    "@/domain/office-apps-course": officeAppsDomain,
    "@/domain/idiom-course": idiomCourseDomain,
    "@/domain/phrasal-verb-course": phrasalVerbCourseDomain,
    "../../assets/courses/idioms.png": "idioms-course-artwork",
    "../../assets/courses/phrasal-verbs.png": "phrasal-verbs-course-artwork",
    "../../assets/courses/sentence-structures.png": "sentence-structures-course-artwork",
    "../../assets/courses/ielts.png": "ielts-course-artwork",
    "../../assets/courses/toeic.png": "toeic-course-artwork",
    "../../assets/courses/office-apps.png": "office-apps-course-artwork",
    "../../assets/images/corvi-dialogue-avatar.png": "corvi-dialogue-avatar-asset",
    "../../assets/images/pan-dialogue-avatar.png": "pan-dialogue-avatar-asset",
    "../../assets/images/baron-dialogue-avatar.png": "baron-dialogue-avatar-asset",
    "@/data/vocabulary": {
      getCourseLessonCompletions: async (courseId) =>
        completed.filter((lessonId) => lessonId.startsWith(courseId)),
      getCourseLessonAttempts: async (courseId) =>
        attempts.filter((attempt) => attempt.lessonId.startsWith(courseId)),
      saveCourseLessonAttempt: async (attempt) => {
        const saved = { ...attempt, updatedAt: new Date().toISOString() };
        const index = attempts.findIndex(
          (item) => item.lessonId === saved.lessonId,
        );
        if (index >= 0) attempts[index] = saved;
        else attempts.push(saved);
        return saved;
      },
      markCourseLessonCompleted: async (lessonId) => {
        completed.push(lessonId);
        const index = attempts.findIndex(
          (attempt) => attempt.lessonId === lessonId,
        );
        if (index >= 0) attempts.splice(index, 1);
      },
      recordStoneInvestmentStudyDay: async () => undefined,
    },
    "@/data/dictionary": {
      getDictionaryPronunciationsForTerms: async (terms, onProgress) => {
        ipaLookupCalls.push([...terms]);
        if (options.pronunciationLookup)
          return options.pronunciationLookup(terms, onProgress);
        onProgress?.(terms.length, terms.length);
        return new Map(terms.map((term) => [term, `/${term}/`]));
      },
    },
    "@/contexts/VocabularyContext": {
      useVocabulary: () => ({
        words: savedWords,
        saveWords: async (inputs, onProgress) => {
          const commit = async () => {
            const batch = [...inputs];
            savedWordBatches.push(batch);
            for (const input of batch) {
              savedWordInputs.push(input);
              savedWords.push({ ...input, id: savedWords.length + 1 });
            }
          };
          if (options.saveWordsBehavior)
            return options.saveWordsBehavior(inputs, onProgress, commit);
          onProgress?.(inputs.length, inputs.length);
          await commit();
        },
      }),
    },
    "@/domain/course-word-selection": courseWordSelectionDomain,
    "@/hooks/useColors": {
      useColors: () => ({ ...colors, radius: 14 }),
    },
  });
  const Component = loaded.default;
  function render() {
    for (let limit = 0; dirty; limit++) {
      assert.ok(limit < 30, "Course screen render settles.");
      dirty = false;
      cursor = 0;
      tree = Component();
    }
  }
  return {
    byId(id) {
      render();
      return find(tree, (node) => node.props?.testID === id);
    },
    choiceIds(prefix) {
      render();
      return findAll(
        tree,
        (node) =>
          typeof node.props?.testID === "string" &&
          node.props.testID.startsWith(`${prefix}-choice-`),
      ).map((node) => node.props.testID);
    },
    shuffleLessonChoices: loaded.shuffleLessonChoices,
    async settle() {
      render();
      await tick();
      render();
    },
    async focus() {
      render();
      focusCallbacks.at(-1)?.();
      await this.settle();
    },
    savedWords,
    attempts,
    savedWordInputs,
    savedWordBatches,
    ipaLookupCalls,
  };
}

(async () => {
  const retainedLinkingProgress = mount([], {
    completedLessons: [
      linkingAdverbDomain.LINKING_ADVERB_COURSE_LESSONS[0].id,
    ],
  });
  await retainedLinkingProgress.focus();
  assert.deepEqual(
    retainedLinkingProgress.byId("conjunction-course-progress").props
      .accessibilityValue,
    { min: 0, max: combinedLessonCount, now: 1 },
    "Previously completed linking-adverb lessons remain in merged course progress.",
  );
  const retainedPatternProgress = mount([], {
    completedLessons: [
      sentenceStructurePatternDomain.SENTENCE_STRUCTURE_PATTERN_LESSONS[0].id,
    ],
  });
  await retainedPatternProgress.focus();
  assert.deepEqual(
    retainedPatternProgress.byId("conjunction-course-progress").props
      .accessibilityValue,
    { min: 0, max: combinedLessonCount, now: 1 },
    "New structure-pattern lesson progress is included in the merged course.",
  );

  const screen = mount();
  const forcedShuffle = screen.shuffleLessonChoices(
    [
      { term: "answer-one", choices: ["answer-one", "a", "b", "c"] },
      { term: "answer-two", choices: ["answer-two", "a", "b", "c"] },
      { term: "answer-three", choices: ["answer-three", "a", "b", "c"] },
    ],
    () => 0,
  );
  const correctPositions = forcedShuffle.map((choices, index) =>
    choices.indexOf(`answer-${["one", "two", "three"][index]}`),
  );
  assert.ok(
    correctPositions.every(
      (position, index) => index === 0 || position !== correctPositions[index - 1],
    ),
    "The correct option does not stay at the same letter across consecutive questions.",
  );
  assert.deepEqual(
    forcedShuffle.map((choices) => [...choices].sort()),
    [
      ["a", "answer-one", "b", "c"],
      ["a", "answer-two", "b", "c"],
      ["a", "answer-three", "b", "c"],
    ],
    "Shuffling preserves each question's full set of choices.",
  );
  const interruptedAttempts = [];
  const interruptedLesson = mount([], {
    lessonAttempts: interruptedAttempts,
  });
  await interruptedLesson.focus();
  interruptedLesson.byId("conjunction-course-card").props.onPress();
  const interruptedCourseLesson = courseDomain.CONJUNCTION_COURSE_LESSONS[0];
  interruptedLesson.byId("conjunction-lesson-1").props.onPress();
  await interruptedLesson.settle();
  interruptedLesson
    .byId(`conjunction-choice-${interruptedCourseLesson.questions[0].term}`)
    .props.onPress();
  interruptedLesson.byId("conjunction-next").props.onPress();
  await interruptedLesson.settle();
  assert.deepEqual(
    interruptedLesson.byId("conjunction-question-prompt").props.children,
    [interruptedCourseLesson.questions[1].prompt],
    "A lesson advances after the answer is saved.",
  );
  interruptedLesson.byId("conjunction-leave-lesson").props.onPress();
  const resumedAfterRestart = mount([], {
    lessonAttempts: interruptedAttempts,
  });
  await resumedAfterRestart.focus();
  resumedAfterRestart.byId("conjunction-course-card").props.onPress();
  const continueButton = resumedAfterRestart.byId(
    "conjunction-resume-lesson-1",
  );
  assert.ok(continueButton, "Interrupted lessons show a continue button.");
  assert.match(textContent(continueButton), /Tiếp tục/);
  continueButton.props.onPress();
  await resumedAfterRestart.settle();
  assert.deepEqual(
    resumedAfterRestart.byId("conjunction-question-prompt").props.children,
    [interruptedCourseLesson.questions[1].prompt],
    "A fresh app instance restores the first unanswered question.",
  );
  assert.equal(interruptedAttempts[0].correctCount, 1);
  const interruptedAnswer = interruptedCourseLesson.questions[1].choices.find(
    (choice) => choice !== interruptedCourseLesson.questions[1].term,
  );
  resumedAfterRestart
    .byId(`conjunction-choice-${interruptedAnswer}`)
    .props.onPress();
  await resumedAfterRestart.settle();
  resumedAfterRestart.byId("conjunction-leave-lesson").props.onPress();
  const selectedAnswerAfterRestart = mount([], {
    lessonAttempts: interruptedAttempts,
  });
  await selectedAnswerAfterRestart.focus();
  selectedAnswerAfterRestart
    .byId("conjunction-course-card")
    .props.onPress();
  selectedAnswerAfterRestart
    .byId("conjunction-resume-lesson-1")
    .props.onPress();
  await selectedAnswerAfterRestart.settle();
  assert.ok(
    selectedAnswerAfterRestart.byId("conjunction-answer-feedback"),
    "A selected answer and its feedback survive leaving the app.",
  );
  await screen.focus();
  assert.ok(screen.byId("idioms-course-card"));
  assert.ok(screen.byId("conjunction-course-card"));
  for (const [testId, expectedArtwork] of [
    ["idioms-course-card", "idioms-course-artwork"],
    ["phrasal-verbs-course-card", "phrasal-verbs-course-artwork"],
    ["conjunction-course-card", "sentence-structures-course-artwork"],
    ["ielts-course-card", "ielts-course-artwork"],
    ["toeic-course-card", "toeic-course-artwork"],
    ["office-apps-course-card", "office-apps-course-artwork"],
  ]) {
    const card = screen.byId(testId);
    assert.equal(
      find(card, (node) => node.type === "Image")?.props.source,
      expectedArtwork,
      `${testId} uses the matching pixel-art course icon.`,
    );
  }
  assert.equal(
    screen.byId("linking-adverb-course-card"),
    undefined,
    "Linking adverbs no longer appear as a separate course.",
  );
  assert.match(
    screen.byId("conjunction-course-card").props.accessibilityLabel,
    /^Cấu trúc câu & từ nối,/,
  );
  assert.match(
    textContent(screen.byId("conjunction-course-card")),
    /mẫu cấu trúc câu/,
  );
  assert.deepEqual(
    screen.byId("conjunction-course-progress").props.accessibilityValue,
    {
      min: 0,
      max: combinedLessonCount,
      now: 0,
    },
    "The merged course progress includes lessons from both former courses.",
  );
  screen.byId("conjunction-course-card").props.onPress();
  assert.ok(screen.byId("conjunction-lesson-1"));
  assert.ok(screen.byId(`conjunction-lesson-${combinedLessonCount}`));
  const lesson = courseDomain.CONJUNCTION_COURSE_LESSONS[0];
  const simileQuestion = courseDomain.CONJUNCTION_COURSE_LESSONS
    .flatMap((item) => item.questions)
    .find((question) =>
      question.prompt.startsWith("The dog stared at the empty bowl"),
    );
  assert.equal(simileQuestion?.term, "as though");
  assert.ok(simileQuestion?.choices.includes("as though"));
  assert.ok(!simileQuestion?.choices.includes("inasmuch as"));
  assert.ok(simileQuestion?.choices.includes("so that"));
  screen.byId("conjunction-lesson-1").props.onPress();
  await screen.settle();
  for (let index = 0; index < lesson.questions.length; index++) {
    const question = lesson.questions[index];
    const orderBeforeAnswer = screen.choiceIds("conjunction");
    assert.deepEqual(
      screen.byId("conjunction-question-prompt").props.children,
      [question.prompt],
    );
    const isWrongAnswer = index === 0;
    const selectedChoice = isWrongAnswer
      ? question.choices.find((choice) => choice !== question.term)
      : question.term;
    screen
      .byId(`conjunction-choice-${selectedChoice}`)
      .props.onPress();
    assert.deepEqual(
      screen.choiceIds("conjunction"),
      orderBeforeAnswer,
      "Answer options remain stable after selecting an answer.",
    );
    assert.ok(screen.byId("conjunction-answer-feedback"));
    if (isWrongAnswer) {
      assert.equal(
        screen.byId("conjunction-correct-popup"),
        undefined,
        "Wrong answers keep the existing inline feedback.",
      );
    } else {
      assert.equal(
        screen.byId("conjunction-correct-popup").props.visible,
        true,
        "Correct answers open the success popup.",
      );
      assert.ok(screen.byId("conjunction-answer-correct"));
    }
    screen.byId("conjunction-next").props.onPress();
    await screen.settle();
  }
  assert.deepEqual(
    screen.byId("conjunction-question-prompt").props.children,
    [lesson.questions[0].prompt],
    "The lesson asks missed questions again once after the first pass.",
  );
  const stillWrongOnRetry = lesson.questions[0].choices.find(
    (choice) => choice !== lesson.questions[0].term,
  );
  screen
    .byId(`conjunction-choice-${stillWrongOnRetry}`)
    .props.onPress();
  screen.byId("conjunction-next").props.onPress();
  await screen.settle();
  assert.ok(screen.byId("conjunction-lesson-complete"));
  assert.match(
    textContent(screen.byId("conjunction-lesson-complete")),
    new RegExp(
      `Đúng ${lesson.questions.length - 1}/${lesson.questions.length} câu`,
    ),
    "A question missed again on its one retry is not asked a third time.",
  );
  assert.equal(
    screen.byId("conjunction-lesson-complete").props.testID,
    "conjunction-lesson-complete",
  );
  assert.ok(screen.byId("conjunction-word-selection"));
  assert.equal(screen.savedWordInputs.length, 0, "Finishing a lesson never auto-adds its words.");
  assert.equal(
    screen.byId("conjunction-add-selected-words").props.label,
    `Thêm ${lesson.questions.length} từ đã chọn`,
    "Unsaved lesson terms are selected by default.",
  );
  screen.byId("conjunction-clear-word-selection").props.onPress();
  assert.equal(
    screen.byId("conjunction-add-selected-words").props.label,
    "Thêm 0 từ đã chọn",
  );
  screen.byId("conjunction-select-all-words").props.onPress();
  screen.byId("conjunction-add-selected-words").props.onPress();
  await screen.settle();
  assert.equal(screen.savedWordInputs.length, lesson.questions.length);
  assert.equal(screen.savedWordBatches.length, 1, "Selected words are saved in one batch.");
  assert.equal(screen.savedWordBatches[0].length, lesson.questions.length);
  assert.equal(
    screen.savedWordInputs[0].term,
    lesson.questions[0].term,
    "The selection screen sends the chosen lesson word through saveWord.",
  );
  assert.ok(screen.byId("conjunction-words-added-message"));
  screen.byId("conjunction-return").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  assert.deepEqual(
    screen.byId("conjunction-course-progress").props.accessibilityValue,
    {
      min: 0,
      max: combinedLessonCount,
      now: 1,
    },
    "Finishing a lesson updates its course progress immediately.",
  );
  screen.byId("idioms-course-card").props.onPress();
  const idiomLesson = idiomCourseDomain.IDIOM_COURSE_LESSONS[0];
  assert.ok(screen.byId("idioms-lesson-1"));
  screen.byId("idioms-lesson-1").props.onPress();
  await screen.settle();
  const wordsSavedBeforeIdioms = screen.savedWordInputs.length;
  const idiomQuestion = idiomLesson.questions[0];
  assert.deepEqual(
    screen.byId("idioms-question-prompt").props.children,
    [idiomQuestion.prompt],
  );
  assert.equal(screen.byId("idioms-dialogue-corvi-avatar").props.source, "corvi-dialogue-avatar-asset");
  assert.equal(screen.byId("idioms-dialogue-pan-avatar").props.source, "pan-dialogue-avatar-asset");
  assert.equal(
    screen.byId("idioms-dialogue-corvi-avatar").props.style[0].borderRadius,
    9,
    "Corvi's framed portrait keeps its rounded-square shape.",
  );
  assert.equal(
    screen.byId("idioms-dialogue-pan-avatar").props.style[0].borderRadius,
    9,
    "Pan's framed portrait keeps its rounded-square shape.",
  );
  assert.ok(
    find(screen.byId("idioms-dialogue-reply"), (node) =>
      node.type === "Text" && String(node.props?.children ?? "") === "Pan",
    ),
    "Pan speaks the line with the missing idiom.",
  );
  assert.ok(screen.byId("idioms-dialogue"));
  screen.byId(`idioms-choice-${idiomQuestion.term}`).props.onPress();
  assert.ok(screen.byId("idioms-answer-feedback"));
  assert.equal(
    screen.byId("idioms-correct-popup").props.visible,
    true,
    "Correct idiom answers also use the success popup.",
  );
  screen.byId("idioms-next").props.onPress();
  await screen.settle();
  assert.deepEqual(
    screen.byId("idioms-question-prompt").props.children,
    [idiomLesson.questions[1].prompt],
    "The learner advances through the offline idiom lesson.",
  );
  for (let index = 1; index < idiomLesson.questions.length; index++) {
    const question = idiomLesson.questions[index];
    assert.deepEqual(
      screen.byId("idioms-question-prompt").props.children,
      [question.prompt],
    );
    const selectedChoice =
      index === 1
        ? question.choices.find((choice) => choice !== question.term)
        : question.term;
    screen.byId(`idioms-choice-${selectedChoice}`).props.onPress();
    screen.byId("idioms-next").props.onPress();
    await screen.settle();
  }
  assert.deepEqual(
    screen.byId("idioms-question-prompt").props.children,
    [idiomLesson.questions[1].prompt],
    "A missed idiom is included in the end-of-lesson retry.",
  );
  screen
    .byId(`idioms-choice-${idiomLesson.questions[1].term}`)
    .props.onPress();
  screen.byId("idioms-next").props.onPress();
  await screen.settle();
  assert.ok(screen.byId("idioms-lesson-complete"));
  assert.equal(
    screen.savedWordInputs.length - wordsSavedBeforeIdioms,
    idiomLesson.questions.length,
    "Completing an idiom lesson automatically adds every term, even when an answer was wrong.",
  );
  assert.ok(
    screen.savedWordInputs
      .slice(wordsSavedBeforeIdioms)
      .every((input) => input.note === "Từ loại: idiom"),
    "Automatically saved course idioms carry a marker so review can identify them.",
  );
  assert.equal(
    screen.byId("idioms-word-selection"),
    undefined,
    "Successful automatic saving replaces the manual word picker.",
  );
  assert.match(
    textContent(screen.byId("idioms-words-added-message")),
    /tự thêm .* idiom/i,
  );
  screen.byId("idioms-return").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  screen.byId("conjunction-course-card").props.onPress();
  const linkingLesson = linkingAdverbDomain.LINKING_ADVERB_COURSE_LESSONS[0];
  const firstLinkingLessonIndex =
    courseDomain.CONJUNCTION_COURSE_LESSONS.length + 1;
  screen
    .byId(`conjunction-lesson-${firstLinkingLessonIndex}`)
    .props.onPress();
  await screen.settle();
  for (let index = 0; index < linkingLesson.questions.length; index++) {
    const question = linkingLesson.questions[index];
    assert.deepEqual(
      screen.byId("conjunction-question-prompt").props.children,
      [question.prompt],
    );
    screen
      .byId(`conjunction-choice-${question.term}`)
      .props.onPress();
    assert.ok(screen.byId("conjunction-answer-feedback"));
    assert.equal(
      screen.byId("conjunction-correct-popup").props.visible,
      true,
      "Correct linking-adverb answers open the success popup.",
    );
    screen.byId("conjunction-next").props.onPress();
    await screen.settle();
  }
  assert.ok(screen.byId("conjunction-lesson-complete"));
  screen.byId("conjunction-return").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  assert.deepEqual(
    screen.byId("conjunction-course-progress").props.accessibilityValue,
    { min: 0, max: combinedLessonCount, now: 2 },
    "Progress from both former courses contributes to the merged course.",
  );
  const structureDialogueScreen = mount();
  await structureDialogueScreen.focus();
  structureDialogueScreen.byId("conjunction-course-card").props.onPress();
  const firstStructureLessonNumber =
    courseDomain.CONJUNCTION_COURSE_LESSONS.length +
    linkingAdverbDomain.LINKING_ADVERB_COURSE_LESSONS.length +
    1;
  structureDialogueScreen
    .byId(`conjunction-lesson-${firstStructureLessonNumber}`)
    .props.onPress();
  await structureDialogueScreen.settle();
  const structureQuestion =
    sentenceStructurePatternDomain.SENTENCE_STRUCTURE_PATTERN_LESSONS[0]
      .questions[0];
  for (const question of sentenceStructurePatternDomain
    .SENTENCE_STRUCTURE_PATTERN_LESSONS.flatMap((lesson) => lesson.questions)) {
    const explanations =
      sentenceStructurePatternDomain
        .SENTENCE_STRUCTURE_PATTERN_DISTRACTOR_EXPLANATIONS[question.term];
    assert.ok(explanations, `${question.term} has learner-facing explanations.`);
    assert.deepEqual(
      Object.keys(explanations).sort(),
      question.choices.filter((choice) => choice !== question.term).sort(),
      `${question.term} explains every wrong choice and no other option.`,
    );
    assert.ok(
      Object.values(explanations).every(
        (explanation) =>
          typeof explanation === "string" && explanation.trim().length > 0,
      ),
      `${question.term} has a nonempty explanation for every distractor.`,
    );
  }
  assert.ok(structureDialogueScreen.byId("sentence-structure-dialogue"));
  assert.equal(
    structureDialogueScreen.byId("sentence-structure-dialogue-corvi-avatar")
      .props.source,
    "corvi-dialogue-avatar-asset",
    "Corvi asks the structure question.",
  );
  assert.equal(
    structureDialogueScreen.byId("sentence-structure-dialogue-baron-avatar")
      .props.source,
    "baron-dialogue-avatar-asset",
    "Baron answers with the unchanged sentence prompt.",
  );
  assert.deepEqual(
    structureDialogueScreen.byId("conjunction-question-prompt").props.children,
    [structureQuestion.prompt],
    "The structure prompt remains unchanged inside the conversation.",
  );
  const structureDistractor = structureQuestion.choices.find(
    (choice) => choice !== structureQuestion.term,
  );
  structureDialogueScreen
    .byId(`conjunction-choice-${structureDistractor}`)
    .props.onPress();
  assert.equal(
    textContent(
      structureDialogueScreen.byId("conjunction-grammar-explanation"),
    ),
    sentenceStructurePatternDomain.SENTENCE_STRUCTURE_PATTERN_ENTRIES[
      structureQuestion.term
    ].definition,
    "A wrong structure answer still explains why the correct pattern fits.",
  );
  assert.equal(
    textContent(
      structureDialogueScreen.byId("conjunction-distractor-explanation"),
    ),
    sentenceStructurePatternDomain
      .SENTENCE_STRUCTURE_PATTERN_DISTRACTOR_EXPLANATIONS[
      structureQuestion.term
    ][structureDistractor],
    "A wrong structure answer explains the selected distractor.",
  );
  structureDialogueScreen.byId("conjunction-next").props.onPress();
  await structureDialogueScreen.settle();
  const correctStructureQuestion =
    sentenceStructurePatternDomain.SENTENCE_STRUCTURE_PATTERN_LESSONS[0]
      .questions[1];
  structureDialogueScreen
    .byId(`conjunction-choice-${correctStructureQuestion.term}`)
    .props.onPress();
  assert.equal(
    structureDialogueScreen.byId("conjunction-correct-popup").props.visible,
    true,
    "Correct structure answers retain the success popup.",
  );
  assert.equal(
    textContent(
      structureDialogueScreen.byId("conjunction-grammar-explanation"),
    ),
    sentenceStructurePatternDomain.SENTENCE_STRUCTURE_PATTERN_ENTRIES[
      correctStructureQuestion.term
    ].definition,
    "A correct structure answer explains why the selected pattern fits.",
  );

  let idiomSaveAttempts = 0;
  const idiomSaveRetryScreen = mount([], {
    saveWordsBehavior: async (_inputs, _onProgress, commit) => {
      idiomSaveAttempts += 1;
      if (idiomSaveAttempts === 1) throw new Error("temporary save failure");
      await commit();
    },
  });
  await idiomSaveRetryScreen.focus();
  idiomSaveRetryScreen.byId("idioms-course-card").props.onPress();
  idiomSaveRetryScreen.byId("idioms-lesson-1").props.onPress();
  await idiomSaveRetryScreen.settle();
  for (const question of idiomLesson.questions) {
    idiomSaveRetryScreen
      .byId(`idioms-choice-${question.term}`)
      .props.onPress();
    idiomSaveRetryScreen.byId("idioms-next").props.onPress();
    await idiomSaveRetryScreen.settle();
  }
  assert.ok(idiomSaveRetryScreen.byId("course-error"));
  assert.ok(idiomSaveRetryScreen.byId("idioms-word-selection"),
    "A failed automatic save leaves a manual retry path.");
  idiomSaveRetryScreen
    .byId("idioms-add-selected-words")
    .props.onPress();
  await idiomSaveRetryScreen.settle();
  assert.equal(idiomSaveAttempts, 2);
  assert.equal(idiomSaveRetryScreen.savedWordInputs.length, idiomLesson.questions.length);
  assert.equal(idiomSaveRetryScreen.byId("idioms-word-selection"), undefined);
  assert.ok(screen.byId("ielts-course-card"));
  screen.byId("ielts-course-card").props.onPress();
  const ieltsLesson = ieltsTopicDomain.IELTS_TOPIC_COURSE_LESSONS[0];
  screen.byId("ielts-lesson-1").props.onPress();
  await screen.settle();
  for (let index = 0; index < ieltsLesson.questions.length; index++) {
    const question = ieltsLesson.questions[index];
    const courseEntry =
      ieltsTopicDomain.IELTS_TOPIC_COURSE_ENTRIES[question.term];
    const savedTranslation = courseEntry.exampleTranslation;
    const simulateMissingTranslation = index === 1;
    if (simulateMissingTranslation) courseEntry.exampleTranslation = "";
    assert.deepEqual(
      screen.byId("ielts-question-prompt").props.children,
      [question.prompt],
    );
    screen.byId(`ielts-choice-${question.term}`).props.onPress();
    assert.ok(screen.byId("ielts-answer-feedback"));
    assert.equal(
      screen.byId("ielts-correct-popup").props.visible,
      true,
      "Correct IELTS answers open the success popup.",
    );
    const translation =
      ieltsTopicDomain.IELTS_TOPIC_COURSE_ENTRIES[question.term]
        .exampleTranslation;
    const translationText = translation
      ? find(
          screen.byId("ielts-answer-feedback"),
          (node) => node.props?.children?.includes?.(translation),
        )
      : undefined;
    if (simulateMissingTranslation) {
      assert.equal(
        translationText,
        undefined,
        "IELTS feedback omits the Vietnamese line when it is unavailable.",
      );
      courseEntry.exampleTranslation = savedTranslation;
    } else {
      assert.ok(
        translationText,
        "IELTS feedback shows the available Vietnamese example translation.",
      );
    }
    screen.byId("ielts-next").props.onPress();
    await screen.settle();
  }
  assert.ok(screen.byId("ielts-lesson-complete"));
  screen.byId("ielts-leave-lesson").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  assert.ok(screen.byId("toeic-course-card"));
  screen.byId("toeic-course-card").props.onPress();
  const toeicLesson = toeicTopicDomain.TOEIC_TOPIC_COURSE_LESSONS[0];
  screen.byId("toeic-lesson-1").props.onPress();
  await screen.settle();
  for (let index = 0; index < toeicLesson.questions.length; index++) {
    const question = toeicLesson.questions[index];
    assert.deepEqual(
      screen.byId("toeic-question-prompt").props.children,
      [question.prompt],
    );
    screen.byId(`toeic-choice-${question.term}`).props.onPress();
    assert.ok(screen.byId("toeic-answer-feedback"));
    assert.equal(
      screen.byId("toeic-correct-popup").props.visible,
      true,
      "Correct TOEIC answers open the success popup.",
    );
    const toeicTranslation =
      toeicTopicDomain.TOEIC_TOPIC_COURSE_ENTRIES[question.term]
        .exampleTranslation;
    assert.ok(toeicTranslation.trim());
    assert.ok(
      find(
        screen.byId("toeic-answer-feedback"),
        (node) => node.props?.children?.includes?.(toeicTranslation),
      ),
      "TOEIC answer feedback shows the Vietnamese example translation.",
    );
    screen.byId("toeic-next").props.onPress();
    await screen.settle();
  }
  assert.ok(screen.byId("toeic-lesson-complete"));
  screen.byId("toeic-leave-lesson").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  assert.ok(screen.byId("office-apps-course-card"));
  screen.byId("office-apps-course-card").props.onPress();
  const officeLesson = officeAppsDomain.OFFICE_APPS_COURSE_LESSONS[0];
  screen.byId("office-apps-lesson-1").props.onPress();
  await screen.settle();
  for (let index = 0; index < officeLesson.questions.length; index++) {
    const question = officeLesson.questions[index];
    const officeEntry =
      officeAppsDomain.OFFICE_APPS_COURSE_ENTRIES[question.term];
    const translation = officeEntry.exampleTranslation;
    assert.deepEqual(
      screen.byId("office-apps-question-prompt").props.children,
      [question.prompt],
    );
    screen.byId(`office-apps-choice-${question.term}`).props.onPress();
    assert.ok(screen.byId("office-apps-answer-feedback"));
    assert.ok(
      find(
        screen.byId("office-apps-answer-feedback"),
        (node) => node.props?.children?.includes?.(translation),
      ),
      "Office-apps feedback shows the Vietnamese example translation.",
    );
    assert.ok(
      find(
        screen.byId("office-apps-answer-feedback"),
        (node) => node.props?.children?.includes?.(
          `Từ loại: ${officeEntry.partOfSpeech}`,
        ),
      ),
      "Office-apps feedback shows the example-based part of speech.",
    );
    screen.byId("office-apps-next").props.onPress();
    await screen.settle();
  }
  assert.ok(screen.byId("office-apps-lesson-complete"));
  assert.ok(screen.byId("office-apps-word-selection"));
  const savedBeforeOfficeLesson = screen.savedWordInputs.length;
  screen.byId("office-apps-add-selected-words").props.onPress();
  await screen.settle();
  const officeLessonSaves = screen.savedWordInputs.slice(
    savedBeforeOfficeLesson,
  );
  assert.ok(officeLessonSaves.length > 0);
  assert.ok(
    officeLessonSaves.every((input) => {
      const expectedPartOfSpeech =
        officeAppsDomain.OFFICE_APPS_COURSE_ENTRIES[input.term].partOfSpeech;
      return (
        input.note ===
        (expectedPartOfSpeech ? `Từ loại: ${expectedPartOfSpeech}` : "") &&
        savedWordMetadataDomain.getSavedWordPartOfSpeech(input.note) ===
          (expectedPartOfSpeech || null)
      );
    }),
    "Saving selected Office words keeps available part-of-speech labels.",
  );
  screen.byId("office-apps-leave-lesson").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  assert.ok(screen.byId("phrasal-verbs-course-card"));
  screen.byId("phrasal-verbs-course-card").props.onPress();
  const phrasalVerbLesson = phrasalVerbCourseDomain
    .PHRASAL_VERB_COURSE_LESSONS[0];
  assert.equal(phrasalVerbLesson.questions.length, 20);
  screen.byId("phrasal-verbs-lesson-1").props.onPress();
  await screen.settle();
  const firstPhrasalQuestion = phrasalVerbLesson.questions[0];
  assert.deepEqual(
    screen.byId("phrasal-verbs-question-prompt").props.children,
    [firstPhrasalQuestion.prompt],
    "Phrasal-verb cloze questions appear in the shared lesson screen.",
  );
  const wrongPhrasalChoice = firstPhrasalQuestion.choices.find(
    (choice) => choice !== firstPhrasalQuestion.term,
  );
  screen.byId(`phrasal-verbs-choice-${wrongPhrasalChoice}`).props.onPress();
  assert.ok(screen.byId("phrasal-verbs-answer-feedback"));
  screen.byId("phrasal-verbs-next").props.onPress();
  await screen.settle();
  for (let index = 1; index < phrasalVerbLesson.questions.length; index += 1) {
    const question = phrasalVerbLesson.questions[index];
    const entry = phrasalVerbCourseDomain.PHRASAL_VERB_COURSE_ENTRIES[
      question.term
    ];
    const savedTranslation = entry.exampleTranslation;
    const simulateMissingTranslation = index === 1;
    if (simulateMissingTranslation) entry.exampleTranslation = "   ";
    assert.deepEqual(
      screen.byId("phrasal-verbs-question-prompt").props.children,
      [question.prompt],
    );
    screen.byId(`phrasal-verbs-choice-${question.term}`).props.onPress();
    assert.ok(screen.byId("phrasal-verbs-answer-feedback"));
    assert.ok(
      simulateMissingTranslation
        ? !find(
            screen.byId("phrasal-verbs-answer-feedback"),
            (node) =>
              node.type === "Text" &&
              typeof node.props?.children === "string" &&
              !node.props.children.trim(),
          )
        : find(
            screen.byId("phrasal-verbs-answer-feedback"),
            (node) => node.props?.children?.includes?.(entry.exampleTranslation),
          ),
      simulateMissingTranslation
        ? "Phrasal-verb feedback omits the translation line when none is available."
        : "Correct-answer feedback includes the complete Vietnamese example translation.",
    );
    if (simulateMissingTranslation) entry.exampleTranslation = savedTranslation;
    screen.byId("phrasal-verbs-next").props.onPress();
    await screen.settle();
  }
  assert.deepEqual(
    screen.byId("phrasal-verbs-question-prompt").props.children,
    [firstPhrasalQuestion.prompt],
    "Phrasal-verb mistakes are retried once after the lesson.",
  );
  screen
    .byId(`phrasal-verbs-choice-${firstPhrasalQuestion.term}`)
    .props.onPress();
  screen.byId("phrasal-verbs-next").props.onPress();
  await screen.settle();
  assert.ok(screen.byId("phrasal-verbs-lesson-complete"));
  assert.ok(screen.byId("phrasal-verbs-word-selection"));
  const savedBeforePhrasalCourse = screen.savedWordInputs.length;
  screen.byId("phrasal-verbs-add-selected-words").props.onPress();
  await screen.settle();
  assert.equal(
    screen.savedWordInputs.length,
    savedBeforePhrasalCourse + phrasalVerbLesson.questions.length,
    "Course words are added to the existing vocabulary notebook flow.",
  );
  assert.ok(screen.byId("phrasal-verbs-words-added-message"));

  const officeEntries = officeAppsDomain.OFFICE_APPS_COURSE_ENTRIES;
  for (let index = 0; index < 1_200; index += 1) {
    officeEntries[`synthetic course term ${index + 1}`] = {
      definition: `Synthetic definition ${index + 1}`,
      example: `A synthetic course term ${index + 1} appears here.`,
      exampleTranslation: `Ví dụ ${index + 1}`,
    };
  }
  const firstOfficeTerm = Object.keys(officeEntries)[0];
  let rejectFirstBulkSave;
  const firstBulkSaveGate = new Promise((_, reject) => {
    rejectFirstBulkSave = reject;
  });
  let shouldFailFirstBulkSave = true;
  let bulkSaveAttempts = 0;
  const bulkScreen = mount(
    [
      {
        term: firstOfficeTerm,
        meaning: officeEntries[firstOfficeTerm].definition,
      },
    ],
    {
      saveWordsBehavior: async (inputs, onProgress, commit) => {
        bulkSaveAttempts += 1;
        if (shouldFailFirstBulkSave) {
          shouldFailFirstBulkSave = false;
          onProgress(Math.floor(inputs.length / 3), inputs.length);
          await firstBulkSaveGate;
        }
        await commit();
        onProgress(inputs.length, inputs.length);
      },
    },
  );
  await bulkScreen.focus();
  bulkScreen.byId("office-apps-course-card").props.onPress();
  const allOfficeCandidates = courseWordSelectionDomain.buildCourseWordCandidates(
    Object.keys(officeEntries),
    new Map(Object.entries(officeEntries)),
    bulkScreen.savedWords,
  );
  const firstNewOfficeCandidate = allOfficeCandidates.find(
    (candidate) => !candidate.alreadySaved,
  );
  assert.ok(firstNewOfficeCandidate);
  const newOfficeWordCount = allOfficeCandidates.filter(
    (candidate) => !candidate.alreadySaved,
  ).length;
  assert.ok(
    newOfficeWordCount > 1_000,
    "The bulk-save test exercises a course with more than one thousand new words.",
  );
  assert.ok(bulkScreen.byId("office-apps-bulk-add-section"));
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-button").props.label,
    `Nạp toàn bộ từ vào Sổ (${newOfficeWordCount.toLocaleString("vi-VN")} từ mới)`,
    "The course overview offers a single button for every available course entry.",
  );
  bulkScreen.byId("office-apps-bulk-add-button").props.onPress();
  const bulkModal = bulkScreen.byId("office-apps-bulk-add-confirmation");
  assert.equal(bulkModal.props.visible, true);
  assert.ok(bulkScreen.byId("office-apps-bulk-add-summary"));
  assert.doesNotMatch(textContent(bulkModal), /Rủi ro cần đọc trước|Quá tải ôn tập|Dễ sai/);
  assert.match(
    textContent(bulkModal),
    /Từ đơn sẽ được tra IPA ngoại tuyến; cụm từ không cần IPA/,
  );
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-acknowledgement"),
    undefined,
    "The risk acknowledgment is removed after the IPA handling is implemented.",
  );
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-confirm").props.disabled,
    false,
    "The final add button no longer requires risk acknowledgment.",
  );
  const expectedIpaTerms = allOfficeCandidates
    .filter(
      (candidate) =>
        !candidate.alreadySaved &&
        courseWordSelectionDomain.isSingleWordCourseTerm(candidate.term) &&
        !candidate.ipa.trim(),
    )
    .map((candidate) => candidate.term);
  assert.ok(expectedIpaTerms.length > 0);
  bulkScreen.byId("office-apps-bulk-add-confirm").props.onPress();
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-confirm").props.disabled,
    true,
    "The confirmation is disabled immediately while the large course is being saved.",
  );
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-cancel").props.disabled,
    true,
    "The learner cannot close the confirmation during the database transaction.",
  );
  await bulkScreen.settle();
  assert.deepEqual(
    bulkScreen.ipaLookupCalls[0],
    expectedIpaTerms,
    "IPA lookup only includes single-word entries that do not already have IPA.",
  );
  const progress = bulkScreen.byId("office-apps-bulk-add-progress");
  assert.ok(progress, "A visible progress status appears during the large save.");
  assert.equal(progress.props.accessibilityValue.max, newOfficeWordCount);
  assert.ok(
    textContent(progress).includes(
      `${Math.floor(newOfficeWordCount / 3).toLocaleString("vi-VN")} / ${newOfficeWordCount.toLocaleString("vi-VN")}`,
    ),
  );
  assert.equal(
    progress.props.accessibilityValue.now,
    Math.floor(newOfficeWordCount / 3),
    "The progress display reports completed words.",
  );
  assert.equal(bulkScreen.savedWords.length, 1);
  bulkScreen.byId("office-apps-bulk-add-confirm").props.onPress();
  assert.equal(bulkSaveAttempts, 1, "A repeated tap cannot start a second save.");
  rejectFirstBulkSave(new Error("Không thể lưu thay đổi."));
  await bulkScreen.settle();
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-confirmation").props.visible,
    true,
    "A failed save leaves the confirmation open so the learner can retry.",
  );
  assert.equal(bulkScreen.savedWords.length, 1);
  assert.equal(bulkScreen.savedWordInputs.length, 0);
  assert.ok(
    textContent(bulkScreen.byId("office-apps-bulk-add-error")).includes(
      "Dữ liệu đã có vẫn được giữ nguyên; hãy thử lại",
    ),
    "The failure message confirms existing words are kept and explains retry.",
  );
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-confirm").props.disabled,
    false,
    "The learner can retry after the failed transaction.",
  );
  bulkScreen.byId("office-apps-bulk-add-confirm").props.onPress();
  await bulkScreen.settle();
  assert.equal(bulkSaveAttempts, 2, "The failed save can be retried once.");
  assert.equal(bulkScreen.savedWordInputs.length, newOfficeWordCount);
  assert.ok(
    bulkScreen.savedWordInputs.every((input) => {
      const expectedPartOfSpeech = officeEntries[input.term].partOfSpeech;
      return (
        input.note ===
          (expectedPartOfSpeech ? `Từ loại: ${expectedPartOfSpeech}` : "") &&
        savedWordMetadataDomain.getSavedWordPartOfSpeech(input.note) ===
          (expectedPartOfSpeech || null)
      );
    }),
    "Bulk-saved Office words keep available labels and omit blank part of speech.",
  );
  assert.ok(
    bulkScreen.savedWordInputs.some(
      (input) =>
        !officeEntries[input.term].partOfSpeech &&
        savedWordMetadataDomain.getSavedWordPartOfSpeech(input.note) === null,
    ),
    "Bulk-saved words without a part of speech do not produce an empty label.",
  );
  assert.ok(
    bulkScreen.savedWordInputs
      .filter((input) =>
        courseWordSelectionDomain.isSingleWordCourseTerm(input.term),
      )
      .every((input) => input.ipa.trim()),
    "Every bulk-saved single word receives IPA.",
  );
  assert.ok(
    bulkScreen.savedWordInputs
      .filter((input) =>
        !courseWordSelectionDomain.isSingleWordCourseTerm(input.term),
      )
      .every((input) => input.ipa === ""),
    "Multi-word phrases do not require IPA.",
  );
  assert.equal(
    bulkScreen.savedWordInputs.find(
      (input) => input.term === firstNewOfficeCandidate.term,
    )
      ?.note,
    `Từ loại: ${officeEntries[firstNewOfficeCandidate.term].partOfSpeech}`,
  );
  assert.equal(
    bulkScreen.savedWordBatches.length,
    1,
    "All newly selected course entries are saved in one batch.",
  );
  assert.ok(bulkScreen.byId("office-apps-bulk-add-success"));
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-confirmation").props.visible,
    false,
  );
  assert.ok(
    find(bulkScreen.byId("office-apps-bulk-add-success"), (node) =>
      String(node.props?.children ?? "").includes("bỏ qua 1 từ"),
    ),
    "The success message reports the existing duplicate that was skipped.",
  );
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-button").props.disabled,
    true,
    "After import, the course button prevents re-adding already saved words.",
  );

  const missingIpaScreen = mount([], {
    pronunciationLookup: async () => new Map(),
  });
  await missingIpaScreen.focus();
  missingIpaScreen.byId("office-apps-course-card").props.onPress();
  missingIpaScreen.byId("office-apps-bulk-add-button").props.onPress();
  missingIpaScreen.byId("office-apps-bulk-add-confirm").props.onPress();
  await missingIpaScreen.settle();
  assert.equal(
    missingIpaScreen.savedWordInputs.length,
    0,
    "The bulk import does not add single-word entries without found IPA.",
  );
  assert.equal(
    missingIpaScreen.savedWordBatches.length,
    0,
    "Missing IPA is detected before the bulk database transaction.",
  );
  assert.match(
    textContent(missingIpaScreen.byId("office-apps-bulk-add-error")),
    /Chưa tìm thấy IPA cho/,
  );
  assert.equal(
    missingIpaScreen.byId("office-apps-bulk-add-confirmation").props.visible,
    true,
    "The learner can install IPA data and retry without losing the dialog.",
  );
  console.log("All course catalog and lesson flows passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
