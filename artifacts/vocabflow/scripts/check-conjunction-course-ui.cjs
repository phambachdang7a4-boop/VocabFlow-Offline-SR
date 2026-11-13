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
const idiomCourseData = require("../domain/idiom-course-data.json");
const dictionaryDomain = require("./test-support.cjs").loadDictionaryDomain();
const idiomCourseDomain = loadTs(
  join(__dirname, "../domain/idiom-course.ts"),
  {
    "./idiom-course-data.json": idiomCourseData,
    "./dictionary": dictionaryDomain,
  },
);
const courseWordSelectionDomain = loadTs(
  join(__dirname, "../domain/course-word-selection.ts"),
);
const element = (type, props, ...children) => {
  if (typeof type === "function") return type(props ?? {});
  return { type, props: { ...props, children } };
};
const native = Object.fromEntries(
  ["View", "Text", "Image", "Pressable", "ScrollView", "ActivityIndicator"].map(
    (name) => [name, name],
  ),
);
native.Platform = { OS: "android" };
native.StyleSheet = { create: (value) => value };
const tick = () => new Promise((resolve) => setImmediate(resolve));

function find(node, predicate) {
  if (Array.isArray(node))
    return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== "object") return undefined;
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function mount() {
  const slots = [];
  const focusCallbacks = [];
  let cursor = 0;
  let dirty = true;
  let tree;
  const completed = [];
  const savedWords = [];
  const savedWordInputs = [];
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
    "@/domain/idiom-course": idiomCourseDomain,
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
        saveWord: async (input) => {
          savedWordInputs.push(input);
          savedWords.push({ ...input, id: savedWords.length + 1 });
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
  };
}

(async () => {
  const screen = mount();
  await screen.focus();
  assert.ok(screen.byId("idioms-course-card"));
  assert.ok(screen.byId("conjunction-course-card"));
  assert.ok(screen.byId("linking-adverb-course-card"));
  screen.byId("conjunction-course-card").props.onPress();
  assert.ok(screen.byId("conjunction-lesson-1"));
  const lesson = courseDomain.CONJUNCTION_COURSE_LESSONS[0];
  screen.byId("conjunction-lesson-1").props.onPress();
  for (let index = 0; index < lesson.questions.length; index++) {
    const question = lesson.questions[index];
    assert.deepEqual(
      screen.byId("conjunction-question-prompt").props.children,
      [question.prompt],
    );
    screen
      .byId(`conjunction-choice-${question.term}`)
      .props.onPress();
    assert.ok(screen.byId("conjunction-answer-feedback"));
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
  console.log("All course catalog and lesson flows passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
