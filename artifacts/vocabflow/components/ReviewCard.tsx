import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useColors } from '@/hooks/useColors';
import type { VocabularyWord } from '@/data/types';
import { checkReviewAnswer, type ReviewExercise } from '@/domain/review-exercises';
import { Button, ErrorBanner, F } from '@/components/ui';

export function calendarLabel(day: string) {
  return day.split('-').reverse().join('/');
}

type Outcome = { action: 'grade'; correct: boolean; typed: string } | { action: 'freeze' };
type Phase = 'answering' | 'saving' | 'saved' | 'failed';

export interface ReviewCardProps {
  /** Snapshot of the word captured when the question opened; never swapped mid-question. */
  word: VocabularyWord;
  exercise: ReviewExercise;
  /** Global context error: lock input/Continue until resolved. */
  blocked: boolean;
  isLast: boolean;
  onCommitted: (id: number) => void;
  onBusyChange: (busy: boolean) => void;
  onNext: () => void;
}

export function ReviewCard({ word, exercise, blocked, isLast, onCommitted, onBusyChange, onNext }: ReviewCardProps) {
  const c = useColors();
  const { recordReview, setWordFrozen } = useVocabulary();
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lock = useRef(false);
  const inFlight = useRef(false);
  const outcomeRef = useRef<Outcome | null>(null);
  const mounted = useRef(true);
  const cb = useRef({ onCommitted, onBusyChange, onNext });
  cb.current = { onCommitted, onBusyChange, onNext };
  const snap = useRef({ id: word.id, expected: word.reviewCount });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cb.current.onBusyChange(false); };
  }, []);

  const persist = async () => {
    const o = outcomeRef.current;
    if (!o || inFlight.current || !mounted.current) return;
    inFlight.current = true;
    if (mounted.current) { setPhase('saving'); setSaveError(null); }
    cb.current.onBusyChange(true);
    try {
      if (o.action === 'grade') await recordReview(snap.current.id, o.correct, snap.current.expected);
      else await setWordFrozen(snap.current.id, true);
      if (!mounted.current) return;
      setPhase('saved');
      cb.current.onCommitted(snap.current.id);
    } catch (failure) {
      if (!mounted.current) return;
      setSaveError(failure instanceof Error ? failure.message : 'Không thể lưu. Hãy thử lại.');
      setPhase('failed');
    } finally {
      inFlight.current = false;
      if (mounted.current) cb.current.onBusyChange(false);
    }
  };

  const commit = (o: Outcome) => {
    if (lock.current || blocked) return;
    if (o.action === 'grade' && o.typed !== '' && !o.typed.trim()) return;
    lock.current = true;
    outcomeRef.current = o;
    setOutcome(o);
    void persist();
  };

  const check = () => {
    if (!typed.trim()) return;
    Keyboard.dismiss();
    commit({ action: 'grade', correct: checkReviewAnswer(typed, word.term), typed });
  };
  const dontKnow = () => { Keyboard.dismiss(); commit({ action: 'grade', correct: false, typed: '' }); };
  const freeze = () => { Keyboard.dismiss(); commit({ action: 'freeze' }); };
  const retry = () => { if (phase === 'failed' && !blocked) void persist(); };

  const answered = outcome !== null;
  const graded = outcome?.action === 'grade' ? outcome : null;
  const tone = graded ? (graded.correct ? c.successText : c.destructiveText) : c.primary;
  const toneSoft = graded ? (graded.correct ? c.reviewRightSoft : c.destructiveSoft) : c.secondary;
  const hintPattern = exercise.hint ?? Array.from(word.term).map(char => /[\p{L}\p{N}]/u.test(char) ? '_' : char).join('');
  const sentenceAnswer = exercise.kind === 'cloze';
  const characters = Array.from(word.term.normalize('NFKC'));
  const hintCharacters = Array.from(hintPattern.normalize('NFKC'));
  const typedCharacters = Array.from(typed.normalize('NFKC').trim().replace(/\s+/g, ' '));
  const cellWidth = sentenceAnswer ? 25 : 32;
  const cellHeight = sentenceAnswer ? 36 : 44;
  const cellGap = sentenceAnswer ? 3 : 4;
  const spaceGap = sentenceAnswer ? 8 : 12;
  const letterCount = characters.filter(char => char !== ' ').length;
  const spaceCount = characters.filter(char => char === ' ').length;
  const answerWidth = Math.max(cellWidth + 8, Math.min(
    310,
    letterCount * cellWidth + Math.max(0, letterCount - 1) * cellGap + spaceCount * spaceGap + 8,
  ));
  const answerCells = characters.map((char, index) => {
    if (char === ' ') return <View key={`space-${index}`} style={{ width: spaceGap, height: cellHeight }} />;
    const typedChar = typedCharacters[index];
    const hintChar = hintCharacters[index];
    const isTypedChar = typedChar !== undefined;
    const visibleChar = isTypedChar ? typedChar : (hintChar && hintChar !== '_' ? hintChar : '');
    return (
      <View key={`slot-${index}`} testID={`review-letter-slot-${index}`}
        style={[styles.letterSlot, { width: cellWidth, height: cellHeight, borderColor: answered ? tone : c.border, backgroundColor: c.input }]}>
        <Text testID={`review-letter-value-${index}`} style={[
          styles.letterValue,
          { color: isTypedChar ? c.foreground : c.mutedForeground, opacity: isTypedChar ? 1 : 0.62 },
        ]}>
          {visibleChar}
        </Text>
      </View>
    );
  });
  const answerInput = (
    <View testID="review-answer-slots" style={[styles.answerSlots, { width: answerWidth, minHeight: cellHeight + 8, rowGap: cellGap, columnGap: cellGap }]}>
      {answerCells}
      <TextInput
        testID="review-answer-input"
        value={typed}
        selection={{ start: typed.length, end: typed.length }}
        onChangeText={setTyped}
        editable={!answered && !blocked}
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
        accessibilityLabel={exercise.hint
          ? `Điền từng chữ vào ô. Gợi ý: ${Array.from(exercise.hint).join(' ')}`
          : 'Điền từng chữ vào các ô trống'}
        accessibilityHint="Chữ đã gõ sẽ thay gợi ý ở đúng ô đó; các gợi ý còn lại vẫn giữ nguyên."
        style={styles.hiddenInput}
      />
    </View>
  );

  const inlinePrompt = () => {
    let inputInserted = false;
    return exercise.prompt.split(/(_{6,})/g).map((part, index) => {
      if (/^_{6,}$/.test(part)) {
        if (inputInserted) {
          return <Text key={`extra-blank-${index}`} style={[styles.extraBlank, { color: c.reviewHint }]}>_____</Text>;
        }
        inputInserted = true;
        return <React.Fragment key={`answer-${index}`}>{answerInput}</React.Fragment>;
      }

      return part.trim().split(/\s+/).filter(Boolean).map((token, tokenIndex) => (
        <Text key={`${index}-${tokenIndex}`} style={[styles.sentenceToken, { color: c.foreground }]}>{token}</Text>
      ));
    });
  };

  return (
    <View style={[styles.root, styles.inlineRoot]}>
      <View testID={sentenceAnswer ? 'review-inline-question' : 'review-inline-meaning'} style={styles.inlineQuestion}>
        {sentenceAnswer ? (
          <View testID="review-inline-sentence" style={styles.sentenceFlow}>{inlinePrompt()}</View>
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

      {answered ? (
        <View testID="review-result" accessibilityLiveRegion="polite" style={[styles.result, { backgroundColor: toneSoft, borderRadius: c.radius }]}>
          {graded ? (
            <>
              <View style={styles.labelRow}>
                <Feather name={graded.correct ? 'check-circle' : 'x-circle'} size={20} color={tone} />
                <Text style={[styles.resultTitle, { color: tone }]}>
                  {graded.correct ? 'Chính xác!' : graded.typed ? 'Chưa đúng' : 'Đã đánh dấu chưa thuộc'}
                </Text>
              </View>
              <Text style={[styles.small, { color: c.mutedForeground }]}>Đáp án</Text>
              <Text testID="review-answer-correct" style={[styles.answer, { color: c.foreground }]}>{word.term}</Text>
              {word.ipa ? <Text style={[styles.small, { color: c.mutedForeground }]}>{word.ipa}</Text> : null}
              {exercise.kind === 'cloze' ? <Text style={[styles.small, { color: c.foreground }]}>{word.meaning}</Text>
                : word.example ? <Text style={[styles.small, { color: c.foreground, fontStyle: 'italic' }]}>{word.example}</Text> : null}
              <Text style={[styles.small, { color: c.mutedForeground }]}>
                {phase === 'saved'
                  ? graded.correct ? (word.level === 6 ? 'Đã lưu: hoàn tất 6 cấp.' : `Đã lưu: lên cấp ${word.level + 1}.`)
                    : `Đã lưu: ${word.level === 1 ? 'giữ cấp 1' : `lùi về cấp ${word.level - 1}`}, ôn lại ngày mai.`
                  : phase === 'saving' ? 'Đang lưu…' : 'Chưa lưu được kết quả.'}
              </Text>
            </>
          ) : (
            <View style={styles.labelRow}>
              <Feather name="pause-circle" size={20} color={c.primary} />
              <Text style={[styles.resultTitle, { color: c.primary, flex: 1 }]}>
                {phase === 'saved' ? 'Đã đóng băng từ này. Bỏ đóng băng trong Cài đặt.' : phase === 'saving' ? 'Đang đóng băng…' : 'Chưa đóng băng được.'}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {saveError ? <ErrorBanner message={saveError} /> : null}

      <View style={[styles.actions, styles.inlineActions]}>
        {!answered ? (
          <>
            <Button testID="review-check" label="Kiểm tra" icon="check" onPress={check} disabled={!typed.trim() || blocked} />
            <Pressable testID="review-dont-know" accessibilityRole="button" onPress={dontKnow} disabled={blocked} hitSlop={8}>
              <Text style={[styles.link, { color: blocked ? c.mutedForeground : c.primary }]}>Mình không thuộc từ này</Text>
            </Pressable>
            <Pressable testID="review-freeze" accessibilityRole="button" accessibilityLabel="Đóng băng từ này"
              onPress={freeze} disabled={blocked} hitSlop={8}
              style={({ pressed }) => [styles.freezeAction, { opacity: blocked ? 0.4 : pressed ? 0.55 : 1 }]}>
              <Feather name="pause-circle" size={16} color={c.mutedForeground} />
              <Text style={[styles.freezeText, { color: c.mutedForeground }]}>Đóng băng từ này</Text>
            </Pressable>
          </>
        ) : phase === 'failed' ? (
          <Button testID="review-retry-save" label="Thử lưu lại" icon="refresh-cw" onPress={retry} disabled={blocked} />
        ) : (
          <Button testID="review-continue" label={isLast ? 'Kết thúc' : 'Tiếp tục'} icon={isLast ? 'flag' : 'arrow-right'}
            onPress={() => { if (phase === 'saved' && !blocked && !inFlight.current) cb.current.onNext(); }}
            loading={phase === 'saving'} disabled={phase !== 'saved' || blocked} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  inlineRoot: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: 12 },
  inlineQuestion: { flexGrow: 1, minHeight: 250, alignItems: 'center', justifyContent: 'flex-start', gap: 28, paddingHorizontal: 4, paddingTop: 14 },
  sentenceFlow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  sentenceToken: { fontFamily: F.m, fontSize: 18, lineHeight: 28 },
  extraBlank: { fontFamily: F.s, fontSize: 18, letterSpacing: 2, paddingHorizontal: 4 },
  answerSlots: { position: 'relative', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', padding: 4 },
  letterSlot: { borderWidth: 1.5, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  letterValue: { fontFamily: F.b, fontSize: 18, textAlign: 'center' },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 2, opacity: 0.01, color: 'transparent', backgroundColor: 'transparent', borderWidth: 0, padding: 0, margin: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meaning: { fontFamily: F.b, fontSize: 24, lineHeight: 32, textAlign: 'center' },
  small: { fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  result: { padding: 16, gap: 6 },
  resultTitle: { fontFamily: F.b, fontSize: 17 },
  answer: { fontFamily: F.b, fontSize: 26 },
  actions: { gap: 12 },
  inlineActions: { marginTop: 20 },
  freezeAction: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  freezeText: { fontFamily: F.m, fontSize: 13 },
  link: { fontFamily: F.s, fontSize: 15, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 6 },
});
