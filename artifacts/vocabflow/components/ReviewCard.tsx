import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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

  const check = () => { if (typed.trim()) commit({ action: 'grade', correct: checkReviewAnswer(typed, word.term), typed }); };
  const dontKnow = () => commit({ action: 'grade', correct: false, typed: '' });
  const freeze = () => commit({ action: 'freeze' });
  const retry = () => { if (phase === 'failed' && !blocked) void persist(); };

  const answered = outcome !== null;
  const graded = outcome?.action === 'grade' ? outcome : null;
  const label = exercise.kind === 'cloze' ? 'ĐIỀN TỪ VÀO CÂU' : 'ĐIỀN TỪ THEO NGHĨA';
  const tone = graded ? (graded.correct ? c.reviewRight : c.destructiveText) : c.primary;
  const toneSoft = graded ? (graded.correct ? c.reviewRightSoft : c.destructiveSoft) : c.secondary;

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { backgroundColor: c.reviewPaper, borderColor: c.border, borderRadius: c.radius + 10 }]}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: c.accent }]} />
          <Text style={[styles.label, { color: c.accent }]}>{label}</Text>
          <Text style={[styles.level, { color: c.mutedForeground }]}>CẤP {word.level}/6</Text>
        </View>
        <Text style={[exercise.kind === 'cloze' ? styles.sentence : styles.meaning, { color: c.foreground }]}>{exercise.prompt}</Text>
        {exercise.fallback ? <Text style={[styles.small, { color: c.mutedForeground }]}>Chưa có câu ví dụ phù hợp, ôn theo nghĩa.</Text> : null}
        {exercise.hint && !answered ? (
          <View testID="review-letter-hint" accessible accessibilityLabel={`Gợi ý: ${Array.from(exercise.hint).map(char => char === '_' ? 'trống' : char).join(' ')}`}>
            <Text style={[styles.hint, { color: c.reviewHint }]}>{Array.from(exercise.hint).join(' ')}</Text>
          </View>
        ) : null}
        {!exercise.hint && !answered ? <Text style={[styles.small, { color: c.mutedForeground }]}>Cấp {word.level}: không có gợi ý chữ cái.</Text> : null}
      </View>

      <TextInput
        testID="review-answer-input"
        value={answered && graded ? graded.typed : typed}
        onChangeText={setTyped}
        editable={!answered && !blocked}
        placeholder="Gõ đầy đủ từ tiếng Anh"
        placeholderTextColor={c.mutedForeground}
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        maxLength={200}
        returnKeyType="done"
        onSubmitEditing={check}
        blurOnSubmit={false}
        accessibilityLabel="Ô nhập câu trả lời"
        style={[styles.input, { backgroundColor: c.input, color: c.foreground, borderColor: answered ? tone : c.border, borderRadius: c.radius }]}
      />

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

      {!answered ? (
        <>
          <Button testID="review-check" label="Kiểm tra" icon="check" onPress={check} disabled={!typed.trim() || blocked} />
          <Pressable testID="review-dont-know" accessibilityRole="button" onPress={dontKnow} disabled={blocked} hitSlop={8}>
            <Text style={[styles.link, { color: blocked ? c.mutedForeground : c.primary }]}>Mình không thuộc từ này</Text>
          </Pressable>
          <Button testID="review-freeze" label="Đóng băng" icon="pause-circle" variant="ghost" onPress={freeze} disabled={blocked} />
        </>
      ) : phase === 'failed' ? (
        <Button testID="review-retry-save" label="Thử lưu lại" icon="refresh-cw" onPress={retry} disabled={blocked} />
      ) : (
        <Button testID="review-continue" label={isLast ? 'Kết thúc' : 'Tiếp tục'} icon={isLast ? 'flag' : 'arrow-right'}
          onPress={() => { if (phase === 'saved' && !blocked && !inFlight.current) cb.current.onNext(); }}
          loading={phase === 'saving'} disabled={phase !== 'saved' || blocked} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 200, padding: 22, gap: 14, borderWidth: 1, justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: F.b, fontSize: 11, letterSpacing: 1.6, flex: 1 },
  level: { fontFamily: F.s, fontSize: 11, letterSpacing: 1 },
  meaning: { fontFamily: F.b, fontSize: 24, lineHeight: 32, textAlign: 'center' },
  sentence: { fontFamily: F.m, fontSize: 18, lineHeight: 28, textAlign: 'center' },
  hint: { fontFamily: F.s, fontSize: 20, letterSpacing: 2, textAlign: 'center' },
  small: { fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  input: { borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontFamily: F.s, fontSize: 20, textAlign: 'center' },
  result: { padding: 16, gap: 6 },
  resultTitle: { fontFamily: F.b, fontSize: 17 },
  answer: { fontFamily: F.b, fontSize: 26 },
  link: { fontFamily: F.s, fontSize: 15, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 6 },
});
