const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");
const colors = loadTs(join(__dirname, "../constants/colors.ts")).default.light;
const courseDomain = loadTs(join(__dirname, "../domain/conjunction-course.ts"), {
  "./dictionary-local-additions": loadTs(
    join(__dirname, "../domain/dictionary-local-additions.ts"),
  ),
});
const linkingAdverbDomain = loadTs(
  join(__dirname, "../domain/linking-adverb-course.ts"),
);
const ieltsTopicDomain = loadTs(
  join(__dirname, "../domain/ielts-topic-course.ts"),
  {
    "./ielts-topic-course-data.json": require(
      "../domain/ielts-topic-course-data.json",
    ),
  },
);
const toeicTopicDomain = loadTs(
  join(__dirname, "../domain/toeic-topic-course.ts"),
  {
    "./toeic-topic-course-data.json": require(
      "../domain/toeic-topic-course-data.json",
    ),
  },
);
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
);
const courseWordSelectionDomain = loadTs(
  join(__dirname, "../domain/course-word-selection.ts"),
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

function mount(initialSavedWords = []) {
  const slots = [];
  const focusCallbacks = [];
  let cursor = 0;
  let dirty = true;
  let tree;
  const completed = [];
  const savedWords = [...initialSavedWords];
  const savedWordInputs = [];
  const savedWordBatches = [];
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
    "@/domain/ielts-topic-course": ieltsTopicDomain,
    "@/domain/toeic-topic-course": toeicTopicDomain,
    "@/domain/office-apps-course": officeAppsDomain,
    "@/domain/idiom-course": idiomCourseDomain,
    "@/domain/phrasal-verb-course": phrasalVerbCourseDomain,
    "../../assets/images/corvi-app-icon.png": "corvi-avatar-asset",
    "../../assets/images/pan-avatar.png": "pan-avatar-asset",
    "@/data/vocabulary": {
      getCourseLessonCompletions: async (courseId) =>
        completed.filter((lessonId) => lessonId.startsWith(courseId)),
      markCourseLessonCompleted: async (lessonId) => completed.push(lessonId),
    },
    "@/contexts/VocabularyContext": {
      useVocabulary: () => ({
        words: savedWords,
        saveWords: async (inputs) => {
          const batch = [...inputs];
          savedWordBatches.push(batch);
          for (const input of batch) {
            savedWordInputs.push(input);
            savedWords.push({ ...input, id: savedWords.length + 1 });
          }
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
    savedWordInputs,
    savedWordBatches,
  };
}

(async () => {
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
  await screen.focus();
  assert.ok(screen.byId("idioms-course-card"));
  assert.ok(screen.byId("conjunction-course-card"));
  assert.ok(screen.byId("linking-adverb-course-card"));
  screen.byId("conjunction-course-card").props.onPress();
  assert.ok(screen.byId("conjunction-lesson-1"));
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
  assert.ok(screen.byId("conjunction-lesson-complete"));
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
  screen.byId("idioms-course-card").props.onPress();
  const idiomLesson = idiomCourseDomain.IDIOM_COURSE_LESSONS[0];
  assert.ok(screen.byId("idioms-lesson-1"));
  screen.byId("idioms-lesson-1").props.onPress();
  const idiomQuestion = idiomLesson.questions[0];
  assert.deepEqual(
    screen.byId("idioms-question-prompt").props.children,
    [idiomQuestion.prompt],
  );
  assert.equal(screen.byId("idioms-dialogue-corvi-avatar").props.source, "corvi-avatar-asset");
  assert.equal(screen.byId("idioms-dialogue-pan-avatar").props.source, "pan-avatar-asset");
  assert.equal(
    screen.byId("idioms-dialogue-corvi-avatar").props.style[0].borderRadius,
    20,
    "Corvi uses a circular avatar.",
  );
  assert.equal(
    screen.byId("idioms-dialogue-pan-avatar").props.style[0].borderRadius,
    20,
    "Pan uses a circular avatar.",
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
  screen.byId("idioms-leave-lesson").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  screen.byId("linking-adverb-course-card").props.onPress();
  const linkingLesson = linkingAdverbDomain.LINKING_ADVERB_COURSE_LESSONS[0];
  screen.byId("linking-adverb-lesson-1").props.onPress();
  for (let index = 0; index < linkingLesson.questions.length; index++) {
    const question = linkingLesson.questions[index];
    assert.deepEqual(
      screen.byId("linking-adverb-question-prompt").props.children,
      [question.prompt],
    );
    screen
      .byId(`linking-adverb-choice-${question.term}`)
      .props.onPress();
    assert.ok(screen.byId("linking-adverb-answer-feedback"));
    assert.equal(
      screen.byId("linking-adverb-correct-popup").props.visible,
      true,
      "Correct linking-adverb answers open the success popup.",
    );
    screen.byId("linking-adverb-next").props.onPress();
    await screen.settle();
  }
  assert.ok(screen.byId("linking-adverb-lesson-complete"));
  screen.byId("linking-adverb-return").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  assert.ok(screen.byId("ielts-course-card"));
  screen.byId("ielts-course-card").props.onPress();
  const ieltsLesson = ieltsTopicDomain.IELTS_TOPIC_COURSE_LESSONS[0];
  screen.byId("ielts-lesson-1").props.onPress();
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
  for (let index = 0; index < officeLesson.questions.length; index++) {
    const question = officeLesson.questions[index];
    const translation =
      officeAppsDomain.OFFICE_APPS_COURSE_ENTRIES[question.term]
        .exampleTranslation;
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
    screen.byId("office-apps-next").props.onPress();
    await screen.settle();
  }
  assert.ok(screen.byId("office-apps-lesson-complete"));
  screen.byId("office-apps-leave-lesson").props.onPress();
  screen.byId("return-to-course-list").props.onPress();
  assert.ok(screen.byId("phrasal-verbs-course-card"));
  screen.byId("phrasal-verbs-course-card").props.onPress();
  const phrasalVerbLesson = phrasalVerbCourseDomain
    .PHRASAL_VERB_COURSE_LESSONS[0];
  assert.equal(phrasalVerbLesson.questions.length, 20);
  screen.byId("phrasal-verbs-lesson-1").props.onPress();
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
    assert.deepEqual(
      screen.byId("phrasal-verbs-question-prompt").props.children,
      [question.prompt],
    );
    screen.byId(`phrasal-verbs-choice-${question.term}`).props.onPress();
    assert.ok(screen.byId("phrasal-verbs-answer-feedback"));
    assert.ok(
      find(
        screen.byId("phrasal-verbs-answer-feedback"),
        (node) => node.props?.children?.includes?.(entry.exampleTranslation),
      ),
      "Correct-answer feedback includes the complete Vietnamese example translation.",
    );
    screen.byId("phrasal-verbs-next").props.onPress();
    await screen.settle();
  }
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
  const firstOfficeTerm = Object.keys(officeEntries)[0];
  const bulkScreen = mount([
    {
      term: firstOfficeTerm,
      meaning: officeEntries[firstOfficeTerm].definition,
    },
  ]);
  await bulkScreen.focus();
  bulkScreen.byId("office-apps-course-card").props.onPress();
  const allOfficeCandidates = courseWordSelectionDomain.buildCourseWordCandidates(
    Object.keys(officeEntries),
    new Map(Object.entries(officeEntries)),
    bulkScreen.savedWords,
  );
  const newOfficeWordCount = allOfficeCandidates.filter(
    (candidate) => !candidate.alreadySaved,
  ).length;
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
  assert.ok(
    find(bulkModal, (node) =>
      node.type === "Text" &&
      String(node.props?.children ?? "").includes("Quá tải ôn tập"),
    ),
    "The confirmation warns that adding a whole course can overload reviews.",
  );
  assert.ok(
    find(bulkModal, (node) =>
      node.type === "Text" &&
      String(node.props?.children ?? "").includes("Dễ sai"),
    ),
    "The confirmation warns that course meanings and examples can be wrong.",
  );
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-confirm").props.disabled,
    true,
    "The final add button remains disabled until the learner acknowledges the risks.",
  );
  bulkScreen.byId("office-apps-bulk-add-confirm").props.onPress();
  await bulkScreen.settle();
  assert.equal(
    bulkScreen.savedWordInputs.length,
    0,
    "Calling the guarded confirm action without acknowledgment adds nothing.",
  );
  bulkScreen
    .byId("office-apps-bulk-add-acknowledgement")
    .props.onPress();
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-acknowledgement").props.accessibilityState
      .checked,
    true,
  );
  assert.equal(
    bulkScreen.byId("office-apps-bulk-add-confirm").props.disabled,
    false,
  );
  bulkScreen.byId("office-apps-bulk-add-confirm").props.onPress();
  await bulkScreen.settle();
  assert.equal(bulkScreen.savedWordInputs.length, newOfficeWordCount);
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
  console.log("All course catalog and lesson flows passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
