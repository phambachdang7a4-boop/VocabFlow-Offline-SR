import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVocabulary } from "@/contexts/VocabularyContext";
import { useColors } from "@/hooks/useColors";
import type { VocabularyWord } from "@/data/types";
import { getDictionaryEntry } from "@/data/dictionary";
import {
  getRegionalIpaLookupForTerm,
  type RegionalIpaLookupResult,
} from "@/data/offline-regional-pronunciations";
import type { DictionaryPronunciation } from "@/domain/dictionary";
import {
  checkReviewAnswer,
  compactReviewAnswer,
  displayReviewAnswer,
  checkReviewChoiceAnswer,
  isReviewExampleUsable,
  type ReviewExercise,
} from "@/domain/review-exercises";
import {
  groupReviewPronunciations,
  reviewExampleTranslation,
} from "@/domain/review-result-details";
import { Button, ErrorBanner, F, MaterialSheen } from "@/components/ui";
import { useSpeechPreferences } from "@/contexts/SpeechPreferencesContext";
import { useSoundEffects } from "@/contexts/SoundEffectsContext";
import { soundCueFor, withSoundOutcome } from "@/domain/sound-cues";

export function calendarLabel(day: string) {
  return day.split("-").reverse().join("/");
}

type Outcome =
  { action: "grade"; correct: boolean; typed: string } | { action: "freeze" };
type Phase = "answering" | "saving" | "saved" | "failed";
const REPORT_REASONS = [
  { id: "meaning", label: "Sai nghĩa" },
  { id: "example", label: "Ví dụ chưa đúng" },
  { id: "spelling", label: "Lỗi chính tả" },
  { id: "pronunciation", label: "Phiên âm / phát âm" },
  { id: "other", label: "Khác" },
] as const;
type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export interface ReviewCardProps {
  /** Snapshot of the word captured when the question opened; never swapped mid-question. */
  word: VocabularyWord;
  exercise: ReviewExercise;
  /** Global context error: lock input/Continue until resolved. */
  blocked: boolean;
  /** Hide answer details and advance as soon as the SRS save succeeds. */
  speedMode?: boolean;
  isLast: boolean;
  onCommitted: (id: number, correct: boolean | null) => void;
  onBusyChange: (busy: boolean) => void;
  onNext: () => void;
}

export function ReviewCard({
  word,
  exercise,
  blocked,
  speedMode = false,
  isLast,
  onCommitted,
  onBusyChange,
  onNext,
}: ReviewCardProps) {
  const c = useColors();
  const { recordReview, setWordFrozen } = useVocabulary();
  const speech = useSpeechPreferences();
  const sound = useSoundEffects();
  const { height: windowHeight } = useWindowDimensions();
  const resultPanelHeight = Math.round(windowHeight * 0.72);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [inputFocused, setInputFocused] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [freezeBusy, setFreezeBusy] = useState(false);
  const [freezeError, setFreezeError] = useState<string | null>(null);
  const [frozenAfterAnswer, setFrozenAfterAnswer] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSharing, setReportSharing] = useState(false);
  const lock = useRef(false);
  const inFlight = useRef(false);
  const outcomeRef = useRef<Outcome | null>(null);
  const speedAdvanceStarted = useRef(false);
  const typedRef = useRef("");
  const mounted = useRef(true);
  const cb = useRef({ onCommitted, onBusyChange, onNext });
  cb.current = { onCommitted, onBusyChange, onNext };
  const snap = useRef({ id: word.id, expected: word.reviewCount });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cb.current.onBusyChange(false);
    };
  }, []);

  const answered = outcome !== null;
  const graded = outcome?.action === "grade" ? outcome : null;
  const pronunciationLookupKey = `${word.id}:${word.dictionaryEntryId ?? ""}:${word.term}`;
  const [pronunciationLookup, setPronunciationLookup] = useState<{
    key: string;
    pronunciations: DictionaryPronunciation[];
    regionalState: RegionalIpaLookupResult["state"] | "loading" | "not-needed";
  } | null>(null);
  const pronunciationState =
    pronunciationLookup?.key === pronunciationLookupKey
      ? pronunciationLookup.regionalState
      : "loading";
  const pronunciationLines = groupReviewPronunciations(
    pronunciationLookup?.key === pronunciationLookupKey
      ? pronunciationLookup.pronunciations
      : [],
    word.ipa,
  );
  const exampleTranslation = reviewExampleTranslation(word.example);

  useEffect(() => {
    if (!answered) return;
    let active = true;

    const loadPronunciations = async () => {
      let pronunciations: DictionaryPronunciation[] = [];
      let dictionaryLookupFailed = false;
      if (word.dictionaryEntryId != null) {
        try {
          pronunciations = (
            await getDictionaryEntry(word.dictionaryEntryId)
          ).pronunciations;
        } catch {
          dictionaryLookupFailed = true;
        }
      }

      let regionalState: RegionalIpaLookupResult["state"] | "not-needed" =
        "not-needed";
      if (
        word.dictionaryEntryId == null ||
        !groupReviewPronunciations(pronunciations, "").uk.length
      ) {
        try {
          const result = await getRegionalIpaLookupForTerm(word.term);
          regionalState =
            dictionaryLookupFailed && result.state !== "found"
              ? "failed"
              : result.state;
          if (result.state === "found") {
            pronunciations = [...pronunciations, ...result.pronunciations];
          }
        } catch {
          regionalState = "failed";
        }
      }

      if (active) {
        setPronunciationLookup({
          key: pronunciationLookupKey,
          pronunciations,
          regionalState,
        });
      }
    };

    void loadPronunciations();
    return () => {
      active = false;
    };
  }, [
    answered,
    pronunciationLookupKey,
    word.dictionaryEntryId,
    word.term,
  ]);

  useEffect(() => {
    if (
      speedMode ||
      !answered ||
      !graded ||
      !speech.ready ||
      !speech.autoRead
    )
      return;
    void speech.speakWord(word.term, word.dictionaryEntryId);
    return () => {
      void speech.stopSpeaking();
    };
  }, [
    answered,
    speedMode,
    outcome,
    word.term,
    speech.ready,
    speech.autoRead,
    speech.speakWord,
    speech.stopSpeaking,
  ]);

  const persist = async () => {
    const o = outcomeRef.current;
    if (!o || inFlight.current || !mounted.current) return;
    inFlight.current = true;
    if (mounted.current) {
      setPhase("saving");
      setSaveError(null);
    }
    cb.current.onBusyChange(true);
    try {
      const cue =
        o.action === "freeze"
          ? soundCueFor("freezeEnabled")
          : o.correct
            ? null
            : soundCueFor("reviewIncorrect");
      await withSoundOutcome(
        async () => {
          if (o.action === "grade")
            await recordReview(
              snap.current.id,
              o.correct,
              snap.current.expected,
            );
          else await setWordFrozen(snap.current.id, true);
        },
        (cueToPlay) => {
          if (mounted.current) sound.play(cueToPlay);
        },
        cue,
      );
      if (!mounted.current) return;
      setPhase("saved");
      cb.current.onCommitted(
        snap.current.id,
        o.action === "grade" ? o.correct : null,
      );
    } catch (failure) {
      if (!mounted.current) return;
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Không thể lưu. Hãy thử lại.",
      );
      setPhase("failed");
    } finally {
      inFlight.current = false;
      if (mounted.current) cb.current.onBusyChange(false);
    }
  };

  useEffect(() => {
    if (
      !speedMode ||
      !answered ||
      phase !== "saved" ||
      blocked ||
      speedAdvanceStarted.current
    ) {
      return;
    }
    speedAdvanceStarted.current = true;
    cb.current.onNext();
  }, [speedMode, answered, phase, blocked]);

  const commit = (o: Outcome) => {
    if (lock.current || blocked) return;
    if (o.action === "grade" && o.typed !== "" && !o.typed.trim()) return;
    lock.current = true;
    outcomeRef.current = o;
    setOutcome(o);
    void persist();
  };

  const check = () => {
    const latestTyped = typedRef.current;
    if (!latestTyped.trim()) return;
    sound.unlockFromGesture();
    Keyboard.dismiss();
    commit({
      action: "grade",
      correct: checkReviewAnswer(latestTyped, word.term),
      typed: latestTyped,
    });
  };
  const choose = (choice: string) => {
    sound.unlockFromGesture();
    commit({
      action: "grade",
      correct: checkReviewChoiceAnswer(choice, word.term),
      typed: choice,
    });
  };
  const dontKnow = () => {
    sound.unlockFromGesture();
    Keyboard.dismiss();
    commit({ action: "grade", correct: false, typed: "" });
  };
  const freeze = () => {
    sound.unlockFromGesture();
    Keyboard.dismiss();
    commit({ action: "freeze" });
  };
  const retry = () => {
    if (phase === "failed" && !blocked) {
      sound.unlockFromGesture();
      void persist();
    }
  };
  const freezeAnsweredWord = async () => {
    if (
      !graded ||
      phase !== "saved" ||
      blocked ||
      freezeBusy ||
      frozenAfterAnswer
    )
      return;
    sound.unlockFromGesture();
    setFreezeBusy(true);
    setFreezeError(null);
    try {
      await withSoundOutcome(
        async () => setWordFrozen(snap.current.id, true),
        (cueToPlay) => {
          if (mounted.current) sound.play(cueToPlay);
        },
        soundCueFor("freezeEnabled"),
      );
      if (mounted.current) setFrozenAfterAnswer(true);
    } catch (failure) {
      if (mounted.current)
        setFreezeError(
          failure instanceof Error
            ? failure.message
            : "Không thể đóng băng từ này. Hãy thử lại.",
        );
    } finally {
      if (mounted.current) setFreezeBusy(false);
    }
  };
  const shareWordReport = async () => {
    if (!reportReason || reportSharing) return;
    const reasonLabel =
      REPORT_REASONS.find((reason) => reason.id === reportReason)?.label ??
      "Khác";
    setReportSharing(true);
    setReportError(null);
    try {
      const message = [
        "Báo lỗi từ VocabFlow",
        `Từ: ${word.term}`,
        `Loại lỗi: ${reasonLabel}`,
        word.meaning ? `Nghĩa hiện tại: ${word.meaning}` : "",
        word.ipa ? `Phiên âm: ${word.ipa}` : "",
        word.example ? `Câu ví dụ: ${word.example}` : "",
        word.dictionaryEntryId
          ? `Mã mục từ điển: ${word.dictionaryEntryId}`
          : "",
        word.dictionarySenseId
          ? `Mã nghĩa từ điển: ${word.dictionarySenseId}`
          : "",
        reportNote.trim() ? `Ghi chú: ${reportNote.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const result = await Share.share({
        title: `Báo lỗi từ ${word.term}`,
        message,
      });
      if (result.action !== Share.dismissedAction) {
        setReportDialogOpen(false);
        setReportReason(null);
        setReportNote("");
      }
    } catch {
      setReportError("Không mở được bảng chia sẻ. Bạn thử lại nhé.");
    } finally {
      setReportSharing(false);
    }
  };

  const tone = graded?.correct
    ? c.vocabCardAccent
    : graded
      ? c.destructiveForeground
      : c.vocabCardForeground;
  const resultMuted = graded?.correct === false
    ? c.destructiveForeground
    : c.vocabCardMuted;
  const hintPattern =
    exercise.hint ??
    Array.from(word.term)
      .map((char) => (/[\p{L}\p{N}]/u.test(char) ? "_" : char))
      .join("");
  const dialogueAnswer =
    exercise.kind === "idiom-dialogue" ||
    exercise.kind === "idiom-listening";
  const sentenceAnswer = exercise.kind === "cloze" || dialogueAnswer;
  const choiceAnswer = exercise.kind === "multiple-choice";
  const characters = Array.from(displayReviewAnswer(word.term));
  const hintCharacters = Array.from(displayReviewAnswer(hintPattern));
  const typedCharacters = Array.from(compactReviewAnswer(typed));
  const letterCount = characters.filter((char) => char !== " ").length;
  let cursorIndex = -1;
  const lastLetterIndex = characters.reduce(
    (lastIndex, char, index) => (char === " " ? lastIndex : index),
    -1,
  );
  if (inputFocused && characters.length > 0) {
    if (typedCharacters.length >= letterCount) {
      cursorIndex = lastLetterIndex;
    } else {
      let lettersBefore = 0;
      cursorIndex = characters.findIndex((char) => {
        if (char === " ") return false;
        return lettersBefore++ === typedCharacters.length;
      });
    }
  }
  const cellWidth = sentenceAnswer ? 25 : 32;
  const cellHeight = sentenceAnswer ? 36 : 44;
  const cellGap = sentenceAnswer ? 3 : 4;
  const spaceGap = sentenceAnswer ? 8 : 12;
  const spaceCount = characters.filter((char) => char === " ").length;
  const answerWidth = Math.max(
    cellWidth + 8,
    Math.min(
      310,
      letterCount * cellWidth +
        Math.max(0, letterCount - 1) * cellGap +
        spaceCount * spaceGap +
        8,
    ),
  );
  let typedSlotIndex = 0;
  const answerCells = characters.map((char, index) => {
    if (char === " ")
      return (
        <View
          key={`space-${index}`}
          style={{ width: spaceGap, height: cellHeight }}
        />
      );
    const typedChar = typedCharacters[typedSlotIndex++];
    const hintChar = hintCharacters[index];
    const isTypedChar = typedChar !== undefined;
    const visibleChar = isTypedChar
      ? typedChar
      : hintChar && hintChar !== "_"
        ? hintChar
        : "";
    return (
      <View
        key={`slot-${index}`}
        testID={`review-letter-slot-${index}`}
        style={[
          styles.letterSlot,
          {
            width: cellWidth,
            height: cellHeight,
            borderColor: answered ? tone : c.border,
            backgroundColor: c.input,
          },
        ]}
      >
        <Text
          testID={`review-letter-value-${index}`}
          style={[
            styles.letterValue,
            {
              color: isTypedChar ? c.foreground : c.mutedForeground,
              opacity: isTypedChar ? 1 : 0.62,
            },
          ]}
        >
          {visibleChar}
        </Text>
        {cursorIndex === index ? (
          <View
            testID={`review-cursor-${index}`}
            style={[
              styles.visibleCursor,
              cursorIndex === lastLetterIndex &&
                typedCharacters.length >= letterCount &&
                styles.cursorAtEnd,
              { backgroundColor: c.primary },
            ]}
          />
        ) : null}
      </View>
    );
  });
  const answerInput = (
    <View
      testID="review-answer-slots"
      style={[
        styles.answerSlots,
        {
          width: answerWidth,
          minHeight: cellHeight + 8,
          rowGap: cellGap,
          columnGap: cellGap,
        },
      ]}
    >
      {answerCells}
      <TextInput
        testID="review-answer-input"
        value={typed}
        selection={{ start: typed.length, end: typed.length }}
        onChangeText={(value) => {
          const compact = compactReviewAnswer(value);
          typedRef.current = compact;
          setTyped(compact);
        }}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        editable={!answered && !blocked}
        placeholder=""
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        maxLength={Math.min(200, letterCount)}
        returnKeyType="done"
        onSubmitEditing={check}
        blurOnSubmit
        caretHidden
        selectionColor="transparent"
        accessibilityLabel={
          exercise.hint
            ? `Điền từng chữ vào ô. Gợi ý: ${Array.from(exercise.hint).join(" ")}`
            : "Điền từng chữ vào các ô trống"
        }
        accessibilityHint="Chữ đã gõ sẽ thay gợi ý ở đúng ô đó; các gợi ý còn lại vẫn giữ nguyên."
        style={styles.hiddenInput}
      />
    </View>
  );

  const inlinePrompt = () => {
    let inputInserted = false;
    return exercise.prompt.split(/(_{6,})/g).map((part, index) => {
      if (/^_{6,}$/.test(part)) {
        if (choiceAnswer) {
          return (
            <Text
              key={`choice-blank-${index}`}
              style={[styles.extraBlank, { color: c.reviewHint }]}
            >
              ________
            </Text>
          );
        }
        if (inputInserted) {
          return (
            <Text
              key={`extra-blank-${index}`}
              style={[styles.extraBlank, { color: c.reviewHint }]}
            >
              _____
            </Text>
          );
        }
        inputInserted = true;
        return (
          <React.Fragment key={`answer-${index}`}>{answerInput}</React.Fragment>
        );
      }

      return part
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token, tokenIndex) => (
          <Text
            key={`${index}-${tokenIndex}`}
            style={[styles.sentenceToken, { color: c.foreground }]}
          >
            {token}
          </Text>
        ));
    });
  };

  return (
    <View style={[styles.root, styles.inlineRoot]}>
      <View
        testID={
          dialogueAnswer
            ? "review-dialogue-question"
            : sentenceAnswer
              ? "review-inline-question"
              : choiceAnswer
                ? "review-choice-question"
                : "review-inline-meaning"
        }
        style={styles.inlineQuestion}
      >
        {!choiceAnswer ? (
          <Pressable
            testID="review-speak-word"
            accessibilityRole="button"
            accessibilityLabel={`Phát âm ${word.term}`}
            onPress={() => {
              void speech.speakWord(word.term, word.dictionaryEntryId);
            }}
            hitSlop={10}
            style={styles.speakerButton}
          >
            <Feather name="volume-2" size={23} color={c.primary} />
          </Pressable>
        ) : null}
        {dialogueAnswer ? (
          <View testID="review-dialogue" style={styles.dialogue}>
            <View style={styles.dialogueMessage}>
              <Image
                testID="review-dialogue-corvi-avatar"
                source={require("../assets/images/corvi-dialogue-avatar.png")}
                accessibilityLabel="Corvi"
                style={[styles.dialogueAvatar, { borderColor: c.accent }]}
                resizeMode="cover"
                resizeMethod="scale"
              />
              <View
                style={[
                  styles.dialogueBubble,
                  styles.dialogueCorviBubble,
                  { backgroundColor: c.secondary, borderColor: c.border },
                ]}
              >
                <Text style={[styles.dialogueSpeaker, { color: c.primary }]}>
                  Corvi
                </Text>
                <Text style={[styles.dialogueText, { color: c.secondaryForeground }]}>
                  {exercise.dialoguePrompt}
                </Text>
              </View>
            </View>
            <View testID="review-dialogue-reply-row" style={styles.dialogueReplyRow}>
              <View
                testID="review-dialogue-reply"
                style={[
                  styles.dialogueBubble,
                  styles.dialogueReplyBubble,
                  { backgroundColor: c.card, borderColor: c.border },
                ]}
              >
                <Text style={[styles.dialogueSpeaker, { color: c.primary }]}>
                  Pan
                </Text>
                <View style={styles.sentenceFlow}>{inlinePrompt()}</View>
              </View>
              <Image
                testID="review-dialogue-pan-avatar"
                source={require("../assets/images/pan-dialogue-avatar.png")}
                accessibilityLabel="Cừu Pan"
                style={[styles.dialogueAvatar, styles.dialogueReplyAvatar]}
                resizeMode="cover"
                resizeMethod="scale"
              />
            </View>
          </View>
        ) : sentenceAnswer || choiceAnswer ? (
          <View testID="review-inline-sentence" style={styles.sentenceFlow}>
            {inlinePrompt()}
          </View>
        ) : (
          <>
            <Text style={[styles.meaning, { color: c.foreground }]}>
              {exercise.prompt}
            </Text>
            {answerInput}
          </>
        )}
        {choiceAnswer ? (
          <View testID="review-choice-options" style={styles.choiceGrid}>
            {(exercise.choices ?? []).map((choice, index) => {
              const isSelected = graded?.typed === choice;
              const isCorrect = checkReviewChoiceAnswer(choice, word.term);
              const revealRight = answered && !speedMode && isCorrect;
              const revealWrong =
                answered && !speedMode && isSelected && !isCorrect;
              const backgroundColor = revealRight
                ? c.successSoft
                : revealWrong
                  ? c.destructiveSoft
                  : c.card;
              const borderColor = revealRight
                ? c.success
                : revealWrong
                  ? c.destructive
                  : c.border;
              const textColor = revealRight
                ? c.successText
                : revealWrong
                  ? c.destructiveText
                  : c.foreground;
              return (
                <Pressable
                  key={`${word.id}:${index}:${choice}`}
                  testID={`review-choice-${index}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: answered || blocked,
                    selected: isSelected,
                  }}
                  onPress={() => choose(choice)}
                  disabled={answered || blocked}
                  style={({ pressed }) => [
                    styles.choiceButton,
                    {
                      backgroundColor,
                      borderColor,
                      opacity: pressed && !answered ? 0.78 : 1,
                      shadowColor: c.shade,
                      shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                      shadowOpacity: pressed ? 0.06 : answered ? 0.04 : 0.13,
                      shadowRadius: pressed ? 2 : 5,
                      elevation: pressed ? 1 : answered ? 0 : 2,
                    },
                  ]}
                >
                  <MaterialSheen radius={12} />
                  <Text style={[styles.choiceLabel, { color: textColor }]}>
                    {choice}
                  </Text>
                  {revealRight ? (
                    <Feather name="check-circle" size={17} color={c.success} />
                  ) : null}
                  {revealWrong ? (
                    <Feather name="x-circle" size={17} color={c.destructive} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {exercise.fallback ? (
          <Text style={[styles.small, { color: c.mutedForeground }]}>
            {exercise.fallbackNote ??
              "Chưa có câu ví dụ phù hợp, ôn theo nghĩa."}
          </Text>
        ) : null}
      </View>

      {answered && !speedMode ? (
        <View
          testID="review-result"
          accessibilityLiveRegion="polite"
          style={[
            styles.resultPanel,
            {
              height: resultPanelHeight,
              backgroundColor:
                graded?.correct === true
                  ? c.success
                  : graded?.correct === false
                    ? c.destructive
                    : c.vocabCard,
              borderRadius: c.radius + 6,
            },
          ]}
        >
          <MaterialSheen radius={c.radius + 6} />
          <ScrollView
            testID="review-result-details-scroll"
            style={styles.resultPanelScroll}
            contentContainerStyle={styles.resultDetailsContent}
            showsVerticalScrollIndicator
          >
            {graded ? (
              <View testID="review-result-details" style={styles.resultInfo}>
                <View style={styles.resultHeader}>
                  <View style={[styles.labelRow, styles.resultStatus]}>
                    <Feather
                      name={graded.correct ? "check-circle" : "x-circle"}
                      size={20}
                      color={tone}
                    />
                    <Text
                      testID="review-result-status"
                      style={[styles.resultTitle, { color: tone }]}
                    >
                      {graded.correct ? "Chính xác!" : "Sai"}
                    </Text>
                  </View>
                  <View testID="review-result-actions" style={styles.resultActions}>
                    <Pressable
                      testID="review-result-freeze"
                      accessibilityRole="button"
                      accessibilityLabel={
                        frozenAfterAnswer ? "Từ đã đóng băng" : "Đóng băng từ này"
                      }
                      accessibilityState={{
                        disabled:
                          blocked ||
                          phase !== "saved" ||
                          freezeBusy ||
                          frozenAfterAnswer,
                      }}
                      onPress={() => setFreezeDialogOpen(true)}
                      disabled={
                        blocked ||
                        phase !== "saved" ||
                        freezeBusy ||
                        frozenAfterAnswer
                      }
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.resultFreezePressable,
                        {
                          opacity:
                            blocked ||
                            phase !== "saved" ||
                            freezeBusy ||
                            frozenAfterAnswer
                              ? 0.45
                              : pressed
                                ? 0.65
                                : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.resultFreezeCircle,
                          { borderColor: c.vocabCardMuted },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="snowflake"
                          size={20}
                          color={frozenAfterAnswer ? c.vocabCardAccent : c.vocabCardMuted}
                        />
                      </View>
                    </Pressable>
                    <Pressable
                      testID="review-result-report"
                      accessibilityRole="button"
                      accessibilityLabel="Báo lỗi từ này"
                      accessibilityState={{
                        disabled: blocked || phase !== "saved",
                      }}
                      onPress={() => {
                        setReportError(null);
                        setReportReason(null);
                        setReportNote("");
                        setReportDialogOpen(true);
                      }}
                      disabled={blocked || phase !== "saved"}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.resultFreezePressable,
                        {
                          opacity:
                            blocked || phase !== "saved"
                              ? 0.45
                              : pressed
                                ? 0.65
                                : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.resultFreezeCircle,
                          { borderColor: c.vocabCardMuted },
                        ]}
                      >
                        <Feather
                          name="flag"
                          size={18}
                          color={c.vocabCardMuted}
                        />
                      </View>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.resultDetailsGroup}>
                  <Text
                    testID="review-answer-correct"
                    style={[styles.answer, { color: c.vocabCardForeground }]}
                  >
                    {word.term}
                  </Text>
                  {!graded.correct ? (
                    <>
                      <Text
                        style={[
                          styles.resultDetailsLabel,
                          { color: resultMuted },
                        ]}
                      >
                        BẠN ĐÃ TRẢ LỜI
                      </Text>
                      <Text
                        testID="review-answer-user"
                        style={[
                          styles.resultDetailsValue,
                          { color: c.vocabCardForeground },
                        ]}
                      >
                        {graded.typed.trim() || "Mình không thuộc từ này"}
                      </Text>
                    </>
                  ) : null}
                </View>
                <View style={styles.resultDetailsGroup}>
                  <Text
                    style={[
                      styles.resultDetailsLabel,
                      { color: resultMuted },
                    ]}
                  >
                    PHIÊN ÂM
                  </Text>
                  <View style={styles.ipaRows}>
                    <View style={styles.ipaRow}>
                      <Text
                        style={[
                          styles.ipaAccent,
                          {
                            color: resultMuted,
                            borderColor: resultMuted,
                          },
                        ]}
                        accessibilityLabel="Phiên âm Anh-Mỹ"
                      >
                        US
                      </Text>
                      <Text
                        testID="review-result-ipa-us"
                        style={[
                          styles.small,
                          styles.ipaValue,
                          { color: resultMuted },
                        ]}
                      >
                        {pronunciationLines.us.join(" · ") || "Chưa có dữ liệu"}
                      </Text>
                      <Pressable
                        testID="review-result-speak-word"
                        accessibilityRole="button"
                        accessibilityLabel={`Phát âm ${word.term}`}
                        onPress={() => {
                          void speech.speakWord(word.term, word.dictionaryEntryId);
                        }}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.resultAudioButton,
                          { opacity: pressed ? 0.55 : 1 },
                        ]}
                      >
                        <Feather
                          name="volume-2"
                          size={20}
                          color={c.vocabCardAccent}
                        />
                      </Pressable>
                    </View>
                    <View style={styles.ipaRow}>
                      <Text
                        style={[
                          styles.ipaAccent,
                          {
                            color: resultMuted,
                            borderColor: resultMuted,
                          },
                        ]}
                        accessibilityLabel="Phiên âm Anh-Anh"
                      >
                        UK
                      </Text>
                      <Text
                        testID="review-result-ipa-uk"
                        style={[
                          styles.small,
                          styles.ipaValue,
                          { color: resultMuted },
                        ]}
                      >
                        {pronunciationLines.uk.join(" · ") ||
                          (pronunciationState === "loading"
                            ? "Đang tra cứu IPA Anh-Anh…"
                            : pronunciationState === "not-found"
                              ? "Gói đã cài nhưng không có mục Anh-Anh cho từ này"
                              : pronunciationState === "damaged"
                                ? "Gói IPA bị lỗi · hãy cài lại trong Cài đặt"
                                : pronunciationState === "failed"
                                  ? "Tra cứu IPA Anh-Anh thất bại · hãy thử lại"
                                  : pronunciationState === "not-needed"
                                    ? "Chưa có dữ liệu Anh-Anh"
                                    : "Chưa cài gói IPA Anh-Anh · tải gói trong Cài đặt")}
                      </Text>
                    </View>
                    {pronunciationLines.unspecified.length ? (
                      <View style={styles.ipaRow}>
                        <Text
                          style={[
                            styles.ipaAccent,
                            {
                              color: resultMuted,
                              borderColor: resultMuted,
                            },
                          ]}
                          accessibilityLabel="Phiên âm chưa xác định vùng"
                        >
                          —
                        </Text>
                        <Text
                          testID="review-result-ipa-unspecified"
                          style={[
                            styles.small,
                            styles.ipaValue,
                            { color: resultMuted },
                          ]}
                        >
                          {pronunciationLines.unspecified.join(" · ")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.resultDetailsGroup}>
                  <Text
                    style={[
                      styles.resultDetailsLabel,
                      { color: resultMuted },
                    ]}
                  >
                    NGHĨA TIẾNG VIỆT
                  </Text>
                  <Text
                    testID="review-result-meaning"
                    style={[
                      styles.resultDetailsValue,
                      { color: c.vocabCardForeground },
                    ]}
                  >
                    {word.meaning}
                  </Text>
                </View>
                {isReviewExampleUsable(word.example) ? (
                  <View style={styles.resultDetailsGroup}>
                    <Text
                      style={[
                        styles.resultDetailsLabel,
                        { color: resultMuted },
                      ]}
                    >
                      CÂU VÍ DỤ
                    </Text>
                    <Text
                      testID="review-result-example"
                      style={[
                        styles.resultDetailsExample,
                        { color: c.vocabCardForeground },
                      ]}
                    >
                      {word.example}
                    </Text>
                    {exampleTranslation ? (
                      <View style={styles.resultDetailsGroup}>
                        <Text
                          style={[
                            styles.resultDetailsLabel,
                            { color: resultMuted },
                          ]}
                        >
                          DỊCH NGHĨA
                        </Text>
                        <Text
                          testID="review-result-example-translation"
                          style={[
                            styles.resultDetailsValue,
                            { color: c.vocabCardForeground },
                          ]}
                        >
                          {exampleTranslation}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                <Text style={[styles.small, { color: resultMuted }]}>
                  {phase === "saved"
                    ? graded.correct
                      ? word.level === 6
                        ? "Đã lưu: hoàn tất 6 cấp."
                        : `Đã lưu: lên cấp ${word.level + 1}.`
                      : `Đã lưu: ${word.level === 1 ? "giữ cấp 1" : `lùi về cấp ${word.level - 1}`}, ôn lại ngày mai.`
                    : phase === "saving"
                      ? "Đang lưu…"
                      : "Chưa lưu được kết quả."}
                </Text>
                {saveError ? <ErrorBanner message={saveError} /> : null}
                {freezeError ? <ErrorBanner message={freezeError} /> : null}
                {frozenAfterAnswer ? (
                  <Text
                    testID="review-result-frozen"
                    style={[styles.small, { color: c.vocabCardAccent }]}
                  >
                    Đã đóng băng từ này.
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.resultInfo}>
                <View style={styles.labelRow}>
                  <Feather
                    name="pause-circle"
                    size={20}
                    color={c.vocabCardMuted}
                  />
                  <Text
                    style={[
                      styles.resultTitle,
                      { color: c.vocabCardForeground, flex: 1 },
                    ]}
                  >
                    {phase === "saved"
                      ? "Đã đóng băng từ này. Bỏ đóng băng trong Cài đặt."
                      : phase === "saving"
                        ? "Đang đóng băng…"
                        : "Chưa đóng băng được."}
                  </Text>
                </View>
                {saveError ? <ErrorBanner message={saveError} /> : null}
                {freezeError ? <ErrorBanner message={freezeError} /> : null}
              </View>
            )}
          </ScrollView>
          {phase === "failed" ? (
            <Button
              testID="review-retry-save"
              label="Thử lưu lại"
              icon="refresh-cw"
              onPress={retry}
              disabled={blocked}
            />
          ) : (
            <Button
              testID="review-continue"
              label={isLast ? "Kết thúc" : "Tiếp tục"}
              icon={isLast ? "flag" : "arrow-right"}
              onPress={() => {
                if (phase === "saved" && !blocked && !inFlight.current)
                  cb.current.onNext();
              }}
              loading={phase === "saving"}
              disabled={phase !== "saved" || blocked || freezeBusy}
              style={styles.continueButton}
            />
          )}
        </View>
      ) : null}

      {speedMode && answered && phase !== "saved" ? (
        <View
          testID="review-speed-save-state"
          accessibilityLiveRegion="polite"
          style={{
            minHeight: 58,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {phase === "saving" ? (
            <>
              <ActivityIndicator color={c.primary} />
              <Text style={[styles.small, { color: c.mutedForeground }]}>
                Đang lưu, chuyển sang câu tiếp theo…
              </Text>
            </>
          ) : (
            <>
              {saveError ? <ErrorBanner message={saveError} /> : null}
              <Button
                testID="review-retry-save"
                label="Thử lưu lại"
                icon="refresh-cw"
                onPress={retry}
                disabled={blocked}
              />
            </>
          )}
        </View>
      ) : null}

      {!answered ? (
        <View style={[styles.actions, styles.inlineActions]}>
          <>
            <Button
              testID="review-check"
              label="Kiểm tra"
              icon="check"
              onPress={check}
              disabled={!typed.trim() || blocked}
            />
            <Pressable
              testID="review-dont-know"
              accessibilityRole="button"
              onPress={dontKnow}
              disabled={blocked}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.link,
                  { color: blocked ? c.mutedForeground : c.primary },
                ]}
              >
                Mình không thuộc từ này
              </Text>
            </Pressable>
            <Pressable
              testID="review-freeze"
              accessibilityRole="button"
              accessibilityLabel="Đóng băng từ này"
              onPress={freeze}
              disabled={blocked}
              hitSlop={8}
              style={({ pressed }) => [
                styles.freezeAction,
                { opacity: blocked ? 0.4 : pressed ? 0.55 : 1 },
              ]}
            >
              <Feather
                name="pause-circle"
                size={16}
                color={c.mutedForeground}
              />
              <Text style={[styles.freezeText, { color: c.mutedForeground }]}>
                Đóng băng từ này
              </Text>
            </Pressable>
          </>
        </View>
      ) : null}

      {freezeDialogOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setFreezeDialogOpen(false)}
        >
          <View
            style={[styles.freezeModalOverlay, { backgroundColor: c.overlay }]}
          >
            <View
              testID="review-freeze-dialog"
              style={[
                styles.freezeDialog,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  borderRadius: c.radius + 6,
                },
              ]}
            >
              <View
                style={[
                  styles.resultFreezeCircle,
                  { borderColor: c.border, alignSelf: "flex-start" },
                ]}
              >
                <MaterialCommunityIcons
                  name="snowflake"
                  size={20}
                  color={c.primary}
                />
              </View>
              <Text style={[styles.freezeDialogTitle, { color: c.foreground }]}>
                Bạn có muốn đóng băng từ này?
              </Text>
              <Text
                style={[
                  styles.freezeDialogMessage,
                  { color: c.mutedForeground },
                ]}
              >
                Từ sẽ không xuất hiện trong ôn tập cho đến khi bạn bỏ đóng băng.
              </Text>
              <View style={styles.freezeDialogActions}>
                <Button
                  testID="review-freeze-cancel"
                  label="Không"
                  variant="ghost"
                  onPress={() => setFreezeDialogOpen(false)}
                  disabled={freezeBusy}
                  style={{ flex: 1 }}
                />
                <Button
                  testID="review-freeze-confirm"
                  label="Có"
                  icon="check"
                  onPress={() => {
                    setFreezeDialogOpen(false);
                    void freezeAnsweredWord();
                  }}
                  disabled={freezeBusy}
                  loading={freezeBusy}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {reportDialogOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setReportDialogOpen(false)}
        >
          <KeyboardAvoidingView
            style={[styles.reportModalOverlay, { backgroundColor: c.overlay }]}
            behavior="padding"
            keyboardVerticalOffset={0}
          >
            <ScrollView
              contentContainerStyle={styles.reportScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                testID="review-report-dialog"
                style={[
                  styles.reportDialog,
                  { backgroundColor: c.card, borderColor: c.border },
                ]}
              >
                <View style={styles.reportHeading}>
                  <View style={[styles.reportIcon, { backgroundColor: c.accent }]}>
                    <Feather name="flag" size={19} color={c.accentForeground} />
                  </View>
                  <View style={styles.reportHeadingText}>
                    <Text style={[styles.freezeDialogTitle, { color: c.foreground }]}>
                      Báo lỗi từ này
                    </Text>
                    <Text style={[styles.reportTerm, { color: c.primary }]}>
                      {word.term}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.reportPrompt, { color: c.mutedForeground }]}>
                  Bạn gặp vấn đề gì? Báo cáo sẽ kèm nghĩa và câu ví dụ để dễ kiểm tra.
                </Text>
                <View style={styles.reportReasons}>
                  {REPORT_REASONS.map((reason) => {
                    const selected = reportReason === reason.id;
                    return (
                      <Pressable
                        key={reason.id}
                        testID={`review-report-reason-${reason.id}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setReportReason(reason.id)}
                        style={[
                          styles.reportReason,
                          {
                            backgroundColor: selected ? c.accentSoft : c.background,
                            borderColor: selected ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.reportReasonText,
                            { color: selected ? c.primary : c.foreground },
                          ]}
                        >
                          {reason.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  testID="review-report-note"
                  value={reportNote}
                  onChangeText={setReportNote}
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  placeholderTextColor={c.mutedForeground}
                  maxLength={400}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.reportNote,
                    {
                      backgroundColor: c.background,
                      borderColor: c.border,
                      color: c.foreground,
                    },
                  ]}
                />
                <Text style={[styles.reportShareHint, { color: c.mutedForeground }]}>
                  Chọn email hoặc ứng dụng nhắn tin trong bảng chia sẻ của điện thoại.
                </Text>
                {reportError ? (
                  <Text testID="review-report-error" style={[styles.freezeDialogMessage, { color: c.destructive }]}>
                    {reportError}
                  </Text>
                ) : null}
                <View style={styles.freezeDialogActions}>
                  <Button
                    testID="review-report-cancel"
                    label="Hủy"
                    variant="ghost"
                    onPress={() => setReportDialogOpen(false)}
                    disabled={reportSharing}
                    style={{ flex: 1 }}
                  />
                  <Button
                    testID="review-report-share"
                    label="Chia sẻ báo cáo"
                    icon="share-2"
                    onPress={() => void shareWordReport()}
                    disabled={!reportReason || reportSharing}
                    loading={reportSharing}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  inlineRoot: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  inlineQuestion: {
    flexGrow: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 20,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  dialogue: { width: "100%", gap: 12, alignItems: "stretch" },
  dialogueMessage: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },
  dialogueAvatar: {
    width: 44,
    height: 44,
    borderRadius: 9,
    borderWidth: 2,
  },
  dialogueReplyRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 9,
  },
  dialogueReplyAvatar: { borderColor: "transparent" },
  dialogueBubble: {
    flexShrink: 1,
    padding: 14,
    borderWidth: 1,
    borderRadius: 18,
  },
  dialogueCorviBubble: { flex: 1, borderBottomLeftRadius: 5 },
  dialogueReplyBubble: {
    maxWidth: "82%",
    borderBottomRightRadius: 5,
  },
  dialogueSpeaker: { fontFamily: F.b, fontSize: 12, marginBottom: 4 },
  dialogueText: { fontFamily: F.m, fontSize: 15, lineHeight: 22 },
  speakerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  sentenceFlow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  sentenceToken: { fontFamily: F.m, fontSize: 18, lineHeight: 28 },
  extraBlank: {
    fontFamily: F.s,
    fontSize: 18,
    letterSpacing: 2,
    paddingHorizontal: 4,
  },
  choiceGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  choiceButton: {
    position: "relative",
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  choiceLabel: {
    flexShrink: 1,
    fontFamily: F.s,
    fontSize: 16,
    lineHeight: 21,
    textAlign: "center",
  },
  answerSlots: {
    position: "relative",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
    padding: 4,
  },
  letterSlot: {
    borderWidth: 1.5,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  visibleCursor: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 2,
    height: 22,
    borderRadius: 1,
    transform: [{ translateX: -1 }, { translateY: -11 }],
  },
  cursorAtEnd: { left: undefined, right: 4, transform: [{ translateY: -11 }] },
  letterValue: { fontFamily: F.b, fontSize: 18, textAlign: "center" },
  hiddenInput: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    opacity: 0.01,
    color: "transparent",
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  meaning: {
    fontFamily: F.b,
    fontSize: 24,
    lineHeight: 32,
    textAlign: "center",
  },
  small: { fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  resultPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 12,
    padding: 16,
    gap: 10,
    overflow: "hidden",
  },
  resultPanelScroll: { flex: 1, minHeight: 0 },
  resultInfo: { gap: 14 },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  resultStatus: { flex: 1 },
  resultActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  resultFreezePressable: { padding: 2 },
  resultFreezeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ipaRows: { gap: 3 },
  ipaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ipaAccent: {
    minWidth: 48,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 6,
    fontFamily: F.b,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    overflow: "hidden",
  },
  ipaValue: { flex: 1, flexWrap: "wrap" },
  resultAudioButton: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  resultDetailsContent: { gap: 15, paddingBottom: 4 },
  resultDetailsGroup: { gap: 6 },
  resultDetailsLabel: {
    fontFamily: F.b,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  resultDetailsValue: { fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  resultDetailsExample: {
    fontFamily: F.s,
    fontSize: 15,
    lineHeight: 23,
    fontStyle: "italic",
  },
  freezeModalOverlay: { flex: 1, justifyContent: "center", padding: 24 },
  freezeDialog: { padding: 22, gap: 12, borderWidth: 1 },
  freezeDialogTitle: { fontFamily: F.b, fontSize: 19 },
  freezeDialogMessage: { fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  freezeDialogActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  reportModalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  reportScrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 20 },
  reportDialog: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 480,
    gap: 13,
    padding: 20,
    borderWidth: 1,
    borderRadius: 22,
  },
  reportHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  reportHeadingText: { flex: 1, gap: 3 },
  reportIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTerm: { fontFamily: F.s, fontSize: 14 },
  reportPrompt: { fontFamily: F.r, fontSize: 13, lineHeight: 19 },
  reportReasons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reportReason: {
    width: "48%",
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 13,
  },
  reportReasonText: { fontFamily: F.s, fontSize: 12, lineHeight: 17 },
  reportNote: {
    minHeight: 82,
    maxHeight: 132,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontFamily: F.r,
    fontSize: 14,
    lineHeight: 20,
  },
  reportShareHint: { fontFamily: F.r, fontSize: 11, lineHeight: 16 },
  resultTitle: { fontFamily: F.b, fontSize: 17 },
  answer: { fontFamily: F.b, fontSize: 26 },
  actions: { gap: 12 },
  inlineActions: { marginTop: 8 },
  continueButton: { minHeight: 68, paddingVertical: 16, paddingHorizontal: 24 },
  freezeAction: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  freezeText: { fontFamily: F.m, fontSize: 13 },
  link: {
    fontFamily: F.s,
    fontSize: 15,
    textAlign: "center",
    textDecorationLine: "underline",
    paddingVertical: 6,
  },
});
