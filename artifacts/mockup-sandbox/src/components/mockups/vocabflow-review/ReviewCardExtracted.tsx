import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native-web";
import { Button, checkReviewAnswer, colors as c, ErrorBanner, F, Icon, type ReviewExercise, type VocabularyWord, useVocabulary } from "./support";

type Outcome = { action: "grade"; correct: boolean; typed: string } | { action: "freeze" };
type Phase = "answering" | "saving" | "saved" | "failed";
type Layout = "separate" | "inline";

export function ReviewCardExtracted({
  word,
  exercise,
  layout,
}: {
  word: VocabularyWord;
  exercise: ReviewExercise;
  layout: Layout;
}) {
  const { recordReview, setWordFrozen } = useVocabulary();
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lock = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const outcomeRef = useRef<Outcome | null>(null);
  const answered = outcome !== null;
  const graded = outcome?.action === "grade" ? outcome : null;

  useEffect(() => () => { mounted.current = false; }, []);

  const persist = async () => {
    const current = outcomeRef.current;
    if (!current || inFlight.current || !mounted.current) return;
    inFlight.current = true;
    setPhase("saving");
    setSaveError(null);
    try {
      if (current.action === "grade") await recordReview(word.id, current.correct, word.reviewCount);
      else await setWordFrozen(word.id, true);
      if (mounted.current) setPhase("saved");
    } catch (error) {
      if (mounted.current) {
        setSaveError(error instanceof Error ? error.message : "Không thể lưu. Hãy thử lại.");
        setPhase("failed");
      }
    } finally {
      inFlight.current = false;
    }
  };

  const commit = (next: Outcome) => {
    if (lock.current) return;
    lock.current = true;
    outcomeRef.current = next;
    setOutcome(next);
    void persist();
  };

  const check = () => {
    if (typed.trim()) commit({ action: "grade", correct: checkReviewAnswer(typed, word.term), typed });
  };
  const dontKnow = () => commit({ action: "grade", correct: false, typed: "" });
  const freeze = () => commit({ action: "freeze" });
  const retry = () => {
    if (phase === "failed") void persist();
  };

  const tone = graded ? (graded.correct ? c.successText : c.destructiveText) : c.primary;
  const toneSoft = graded ? (graded.correct ? c.reviewRightSoft : c.destructiveSoft) : c.secondary;
  const hint = exercise.hint ?? Array.from(word.term).map((char) => (/[a-z0-9]/i.test(char) ? "_" : char)).join("");
  const characters = Array.from(word.term.normalize("NFKC"));
  const hintCharacters = Array.from(hint.normalize("NFKC"));
  const typedCharacters = Array.from(typed.normalize("NFKC").trim().replace(/\s+/g, " "));
  const sentenceAnswer = layout === "inline" && exercise.kind === "cloze";
  const cellWidth = sentenceAnswer ? 25 : 32;
  const cellHeight = sentenceAnswer ? 36 : 44;
  const cellGap = sentenceAnswer ? 3 : 4;
  const spaceGap = sentenceAnswer ? 8 : 12;
  const letterCount = characters.filter((char) => char !== " ").length;
  const spaceCount = characters.filter((char) => char === " ").length;
  const answerWidth = Math.max(cellWidth + 8, Math.min(
    310,
    letterCount * cellWidth + Math.max(0, letterCount - 1) * cellGap + spaceCount * spaceGap + 8,
  ));
  const answerCells = characters.map((char, index) => {
    if (char === " ") return <View key={`space-${index}`} style={{ width: spaceGap, height: cellHeight }} />;
    const typedChar = typedCharacters[index];
    const hintChar = hintCharacters[index];
    const visibleChar = typedChar ?? (hintChar && hintChar !== "_" ? hintChar : "");
    return (
      <View key={`slot-${index}`} testID={`review-letter-slot-${index}`} style={[
        styles.letterSlot,
        { width: cellWidth, height: cellHeight, borderColor: answered ? tone : c.border, backgroundColor: c.input },
      ]}>
        <Text testID={`review-letter-value-${index}`} style={[styles.letterValue, { color: visibleChar ? c.primary : c.mutedForeground }]}>
          {visibleChar}
        </Text>
      </View>
    );
  });

  const answerInput = layout === "inline" ? (
    <View testID="review-answer-slots" style={[
      styles.answerSlots,
      { width: answerWidth, minHeight: cellHeight + 8, rowGap: cellGap, columnGap: cellGap },
    ]}>
      {answerCells}
      <TextInput
        testID="review-answer-input"
        value={typed}
        selection={{ start: typed.length, end: typed.length }}
        onChangeText={setTyped}
        editable={!answered}
        placeholder=""
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        maxLength={Math.min(200, characters.length)}
        returnKeyType="done"
        onSubmitEditing={check}
        blurOnSubmit
        caretHidden
        selectionColor="transparent"
        accessibilityLabel={exercise.hint ? `Điền từng chữ vào ô. Gợi ý: ${Array.from(exercise.hint).join(" ")}` : "Điền từng chữ vào các ô trống"}
        accessibilityHint="Chữ đã gõ sẽ thay gợi ý ở đúng ô đó; các gợi ý còn lại vẫn giữ nguyên."
        style={styles.hiddenInput}
      />
    </View>
  ) : (
    <TextInput
      testID="review-answer-input"
      value={answered && graded ? graded.typed : typed}
      onChangeText={setTyped}
      editable={!answered}
      placeholder={hint}
      placeholderTextColor={c.mutedForeground}
      autoCorrect={false}
      spellCheck={false}
      autoCapitalize="none"
      autoComplete="off"
      maxLength={200}
      returnKeyType="done"
      onSubmitEditing={check}
      blurOnSubmit
      accessibilityLabel={exercise.kind === "cloze" ? "Điền từ vào chỗ trống trong câu" : "Điền từ theo nghĩa"}
      style={[styles.input, { backgroundColor: c.input, color: c.foreground, borderColor: answered ? tone : c.border }]}
    />
  );

  const inlinePrompt = () => {
    let inserted = false;
    return exercise.prompt.split(/(________)/g).map((part, index) => {
      if (part === "________") {
        if (inserted) {
          return <Text key={`blank-${index}`} style={[styles.extraBlank, { color: c.reviewHint }]}>_____</Text>;
        }
        inserted = true;
        return <React.Fragment key={`input-${index}`}>{answerInput}</React.Fragment>;
      }
      return part.trim().split(/\s+/).filter(Boolean).map((token, tokenIndex) => (
        <Text key={`${index}-${tokenIndex}`} style={[styles.sentenceToken, { color: c.foreground }]}>{token}</Text>
      ));
    });
  };

  return (
    <View style={[styles.root, layout === "inline" && styles.inlineRoot]}>
      {layout === "inline" ? (
      <View style={styles.inlineQuestion}>
          {exercise.kind === "cloze" ? (
            <View style={styles.sentenceFlow}>{inlinePrompt()}</View>
          ) : (
            <>
              <Text style={[styles.meaning, { color: c.foreground }]}>{exercise.prompt}</Text>
              {answerInput}
            </>
          )}
          {exercise.fallback ? (
            <Text style={[styles.small, { color: c.mutedForeground }]}>Chưa có câu ví dụ phù hợp, ôn theo nghĩa.</Text>
          ) : null}
        </View>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: c.reviewPaper, borderColor: c.border }]}>
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: c.accent }]} />
              <Text style={[styles.label, { color: c.accent }]}>
                {exercise.kind === "cloze" ? "ĐIỀN TỪ VÀO CÂU" : "ĐIỀN TỪ THEO NGHĨA"}
              </Text>
              <Text style={[styles.level, { color: c.mutedForeground }]}>CẤP {word.level}/6</Text>
            </View>
            <Text style={[exercise.kind === "cloze" ? styles.sentence : styles.meaning, { color: c.foreground }]}>
              {exercise.prompt}
            </Text>
            {exercise.hint ? (
              <Text style={[styles.hint, { color: c.reviewHint }]}>{Array.from(exercise.hint).join(" ")}</Text>
            ) : null}
          </View>
          {answerInput}
        </>
      )}

      {answered ? (
        <View testID="review-result" accessibilityLiveRegion="polite" style={[styles.result, { backgroundColor: toneSoft }]}>
          {graded ? (
            <>
              <View style={styles.labelRow}>
                <Icon name={graded.correct ? "check-circle" : "x-circle"} size={20} color={tone} />
                <Text style={[styles.resultTitle, { color: tone }]}>
                  {graded.correct ? "Chính xác!" : graded.typed ? "Chưa đúng" : "Đã đánh dấu chưa thuộc"}
                </Text>
              </View>
              <Text style={[styles.small, { color: c.mutedForeground }]}>Đáp án</Text>
              <Text testID="review-answer-correct" style={[styles.answer, { color: c.foreground }]}>{word.term}</Text>
              {word.ipa ? <Text style={[styles.small, { color: c.mutedForeground }]}>{word.ipa}</Text> : null}
              {exercise.kind === "cloze" ? (
                <Text style={[styles.small, { color: c.foreground }]}>{word.meaning}</Text>
              ) : word.example ? (
                <Text style={[styles.small, { color: c.foreground, fontStyle: "italic" }]}>{word.example}</Text>
              ) : null}
              <Text style={[styles.small, { color: c.mutedForeground }]}>
                {phase === "saved"
                  ? graded.correct ? (word.level === 6 ? "Đã lưu: hoàn tất 6 cấp." : `Đã lưu: lên cấp ${word.level + 1}.`)
                    : `Đã lưu: ${word.level === 1 ? "giữ cấp 1" : `lùi về cấp ${word.level - 1}`}, ôn lại ngày mai.`
                  : phase === "saving" ? "Đang lưu…" : "Chưa lưu được kết quả."}
              </Text>
            </>
          ) : (
            <View style={styles.labelRow}>
              <Icon name="pause-circle" size={20} color={c.primary} />
              <Text style={[styles.resultTitle, { color: c.primary, flex: 1 }]}>
                {phase === "saved" ? "Đã đóng băng từ này. Bỏ đóng băng trong Cài đặt." : phase === "saving" ? "Đang đóng băng…" : "Chưa đóng băng được."}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {saveError ? <ErrorBanner message={saveError} /> : null}

      <View style={[styles.actions, layout === "inline" && styles.inlineActions]}>
        {!answered ? (
          <>
            <Button testID="review-check" label="Kiểm tra" icon="check" onPress={check} disabled={!typed.trim()} />
            <Pressable testID="review-dont-know" accessibilityRole="button" onPress={dontKnow} hitSlop={8} style={styles.linkHit}>
              <Text style={[styles.link, { color: c.primary }]}>Mình không thuộc từ này</Text>
            </Pressable>
            {layout === "inline" ? (
              <Pressable testID="review-freeze" accessibilityRole="button" accessibilityLabel="Đóng băng từ này" onPress={freeze} style={styles.freezeAction}>
                <Icon name="pause-circle" size={16} color={c.mutedForeground} />
                <Text style={[styles.freezeText, { color: c.mutedForeground }]}>Đóng băng từ này</Text>
              </Pressable>
            ) : (
              <Button testID="review-freeze" label="Đóng băng" icon="pause-circle" variant="ghost" onPress={freeze} />
            )}
          </>
        ) : phase === "failed" ? (
          <Button testID="review-retry-save" label="Thử lưu lại" icon="refresh-cw" onPress={retry} />
        ) : (
          <Button testID="review-continue" label="Tiếp tục" icon="arrow-right" onPress={() => {}} loading={phase === "saving"} disabled={phase !== "saved"} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  inlineRoot: { flexGrow: 1, justifyContent: "space-between", paddingBottom: 12 },
  inlineQuestion: { flexGrow: 1, minHeight: 260, alignItems: "center", justifyContent: "flex-start", gap: 28, paddingHorizontal: 6, paddingTop: 14 },
  sentenceFlow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  sentenceToken: { fontFamily: F.m, fontSize: 19, lineHeight: 30 },
  extraBlank: { fontFamily: F.s, fontSize: 19, letterSpacing: 2, paddingHorizontal: 4 },
  answerSlots: { position: "relative", flexDirection: "row", flexWrap: "wrap", alignItems: "center", alignContent: "center", justifyContent: "center", padding: 4 },
  letterSlot: { borderWidth: 1.5, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  letterValue: { fontFamily: F.b, fontSize: 18, textAlign: "center" },
  hiddenInput: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 2, opacity: 0.01, color: "transparent", backgroundColor: "transparent", borderWidth: 0, padding: 0, margin: 0 },
  card: { minHeight: 200, padding: 22, gap: 14, borderWidth: 1, borderRadius: 24, justifyContent: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: F.b, fontSize: 11, letterSpacing: 1.6, flex: 1 },
  level: { fontFamily: F.s, fontSize: 11, letterSpacing: 1 },
  meaning: { fontFamily: F.b, fontSize: 24, lineHeight: 32, textAlign: "center" },
  sentence: { fontFamily: F.m, fontSize: 18, lineHeight: 28, textAlign: "center" },
  hint: { fontFamily: F.s, fontSize: 20, letterSpacing: 2, textAlign: "center" },
  small: { fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  input: { width: "100%", minHeight: 58, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontFamily: F.s, fontSize: 20, textAlign: "center" },
  result: { padding: 16, gap: 6, borderRadius: 16 },
  resultTitle: { fontFamily: F.b, fontSize: 17 },
  answer: { fontFamily: F.b, fontSize: 26 },
  actions: { gap: 12 },
  inlineActions: { marginTop: 20 },
  freezeAction: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  freezeText: { fontFamily: F.m, fontSize: 13 },
  linkHit: { alignSelf: "center", paddingVertical: 6 },
  link: { fontFamily: F.s, fontSize: 15, textAlign: "center", textDecorationLine: "underline" },
});
