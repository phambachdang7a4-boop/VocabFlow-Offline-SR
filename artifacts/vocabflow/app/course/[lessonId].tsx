import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ErrorBanner, F, MaterialSheen } from '@/components/ui';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { displayCollocationType, displayCourseMeaning } from '@/data/basic-course';
import { courseForLesson } from '@/data/course-catalog';
import { exampleSegments as segmentExample } from '@/domain/dictionary';
import {
  finishCourseLesson, getCourseProgress, getCourseSelections,
  saveCourseProgress, saveCourseSelection, type CourseLessonProgress, type CourseLessonStage,
} from '@/data/vocabulary';
import { checkReviewAnswer } from '@/domain/review-exercises';
import { useColors } from '@/hooks/useColors';
import { useSpeechPreferences } from '@/contexts/SpeechPreferencesContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { createOutcomeGuard, soundCueFor, withSoundOutcome } from '@/domain/sound-cues';

export default function CourseLessonScreen() {
  const params = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : params.lessonId;
  const course = useMemo(() => lessonId ? courseForLesson(lessonId) : undefined, [lessonId]);
  const lesson = useMemo(() => course?.lessons.find(item => item.id === lessonId), [course, lessonId]);
  const lessonNumber = course?.lessons.findIndex(item => item.id === lessonId) ?? -1;
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { reload } = useVocabulary();
  const speech = useSpeechPreferences();
  const sound = useSoundEffects();
  const [progress, setProgress] = useState<CourseLessonProgress | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedRef = useRef<Set<string>>(new Set());
  const [answer, setAnswer] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const answerGuard = useRef(createOutcomeGuard());

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const playIfMounted = (cue: Parameters<typeof sound.play>[0]) => {
    if (mounted.current) sound.play(cue);
  };

  const load = useCallback(async () => {
    if (!lesson) {
      setError('Không tìm thấy bài học.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [savedProgress, savedSelections] = await Promise.all([
        getCourseProgress(lesson.id),
        getCourseSelections(lesson.id),
      ]);
      const choices = new Set(savedSelections);
      setProgress(savedProgress);
      setSelectedIds(choices);
      selectedRef.current = choices;
      setError(null);
    } catch {
      setError('Không thể đọc tiến độ bài học. Dữ liệu cũ vẫn được giữ nguyên.');
    } finally {
      setLoading(false);
    }
  }, [lesson]);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => () => { void speech.stopSpeaking(); }, [speech.stopSpeaking]));

  const stage: CourseLessonStage = progress?.stage ?? 'flashcard';
  const currentWord = lesson?.words[progress?.currentIndex ?? 0];
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  useEffect(() => {
    if (stage === 'flashcard' && currentWord && speech.ready && speech.autoRead) {
      void speech.speakWord(currentWord.term);
    }
    return () => { void speech.stopSpeaking(); };
  }, [stage, currentWord?.id, speech.ready, speech.autoRead, speech.speakWord, speech.stopSpeaking]);

  const persistProgress = async (index: number, nextStage: Exclude<CourseLessonStage, 'completed'>) => {
    if (!lesson) return false;
    setBusy(true);
    setError(null);
    try {
      await saveCourseProgress(lesson.id, index, nextStage);
      setProgress(previous => ({
        lessonId: lesson.id,
        currentIndex: index,
        stage: nextStage,
        completedAt: previous?.completedAt ?? null,
        updatedAt: new Date().toISOString(),
      }));
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể lưu tiến độ bài học.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const beginWriting = () => {
    if (currentWord) void persistProgress(progress?.currentIndex ?? 0, 'answer');
  };

  const checkAnswer = () => {
    if (!currentWord || !answer.trim()) return;
    if (!answerGuard.current.claim()) return;
    sound.unlockFromGesture();
    Keyboard.dismiss();
    const correct = checkReviewAnswer(answer, currentWord.term);
    setAnswerResult(correct ? 'correct' : 'incorrect');
    sound.play(soundCueFor(correct ? 'courseAnswerCorrect' : 'courseAnswerIncorrect'));
  };

  const advanceWord = async () => {
    if (!lesson || !progress || !currentWord) return;
    const atEnd = progress.currentIndex >= lesson.words.length - 1;
    const nextIndex = atEnd ? progress.currentIndex : progress.currentIndex + 1;
    const nextStage = atEnd ? 'selection' : 'flashcard';
    const saved = await persistProgress(nextIndex, nextStage);
    if (saved) {
      answerGuard.current.reset();
      setAnswer('');
      setAnswerResult(null);
      setShowExample(false);
    }
  };

  const toggleSelection = async (wordId: string) => {
    if (!lesson) return;
    const next = new Set(selectedRef.current);
    const selected = !next.has(wordId);
    if (selected) next.add(wordId);
    else next.delete(wordId);
    selectedRef.current = next;
    setSelectedIds(next);
    setError(null);
    try {
      await saveCourseSelection(lesson.id, wordId, selected);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể lưu lựa chọn.');
      try {
        const refreshed = new Set(await getCourseSelections(lesson.id));
        selectedRef.current = refreshed;
        setSelectedIds(refreshed);
      } catch { /* Keep the current selection visible if the recovery read also fails. */ }
    }
  };

  const finish = async (addAll = false) => {
    if (!lesson || busy) return;
    sound.unlockFromGesture();
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const ids = addAll ? lesson.words.map(word => word.id) : [...selectedRef.current];
      const added = await withSoundOutcome(
        () => finishCourseLesson(lesson.id, ids),
        playIfMounted,
        soundCueFor('lessonCompleted'),
      );
      if (addAll) {
        const allSelected = new Set(ids);
        selectedRef.current = allSelected;
        setSelectedIds(allSelected);
      }
      setAddedCount(added);
      setProgress({
        lessonId: lesson.id,
        currentIndex: lesson.words.length - 1,
        stage: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể hoàn tất bài học. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    Keyboard.dismiss();
    router.back();
  };

  if (!lesson) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: topInset }]}>
        <ErrorBanner message="Không tìm thấy bài học." />
        <Button label="Quay lại khóa học" icon="arrow-left" onPress={goBack} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (loading || !progress) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: topInset }]}>
        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : <ActivityIndicator color={c.primary} />}
      </View>
    );
  }

  const progressPercent = stage === 'selection' || stage === 'completed'
    ? 1
    : Math.min(1, (progress.currentIndex + (stage === 'answer' ? 0.5 : 0)) / lesson.words.length);

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, {
        paddingTop: topInset + 7,
        backgroundColor: c.header,
        shadowColor: c.shade, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
      }]}>
        <MaterialSheen tone="navy" radius={0} />
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Thoát bài học" onPress={goBack} style={styles.closeButton}>
            <Feather name="x" size={23} color={c.headerForeground} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: c.headerForeground }]} numberOfLines={1}>{lesson.title}</Text>
            <Text style={[styles.headerSubtitle, { color: c.headerMuted }]}>
              Bài {lessonNumber + 1} · {lesson.words.length} mục từ-nghĩa
            </Text>
          </View>
          <Text style={[styles.counter, { color: c.headerForeground }]}>
            {stage === 'selection' || stage === 'completed' ? lesson.words.length : progress.currentIndex + 1}/{lesson.words.length}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: c.headerButton }]}>
          <View style={[styles.trackFill, { width: `${progressPercent * 100}%`, backgroundColor: c.accent }]} />
        </View>
      </View>

      {error ? <View style={styles.errorWrap}><ErrorBanner message={error} /></View> : null}

      {stage === 'selection' ? (
        <View style={styles.flex}>
          <View style={styles.selectionIntro}>
            <Text style={[styles.overline, { color: c.primary }]}>BÀI HỌC HOÀN TẤT</Text>
            <Text style={[styles.heading, { color: c.foreground }]}>Chọn từ muốn lưu</Text>
            <Text style={[styles.body, { color: c.mutedForeground }]}>
              Đã học {lesson.words.length} mục từ-nghĩa. Chỉ những mục được tích mới được thêm vào Sổ từ.
            </Text>
            <Text style={[styles.selectedCount, { color: c.primary }]}>{selectedIds.size} mục được chọn</Text>
          </View>
          <ScrollView style={styles.selectionList} contentContainerStyle={styles.selectionContent} keyboardShouldPersistTaps="handled">
            {lesson.words.map((word, index) => {
              const selected = selectedIds.has(word.id);
              const collocationType = displayCollocationType(word);
              return (
                <Pressable
                  key={word.id}
                  testID={`course-select-${word.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => void toggleSelection(word.id)}
                  style={[
                    styles.wordRow,
                    {
                      backgroundColor: selected ? c.accentSoft : c.card,
                      borderColor: selected ? c.primary : c.border,
                      shadowColor: c.shade, shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selected ? 0.12 : 0.08, shadowRadius: 4, elevation: 2,
                    },
                  ]}
                >
                  <MaterialSheen radius={14} />
                  <View style={[styles.checkbox, { backgroundColor: selected ? c.primary : 'transparent', borderColor: selected ? c.primary : c.border }]}>
                    {selected ? <Feather name="check" size={14} color={c.primaryForeground} /> : null}
                  </View>
                  <View style={styles.wordRowText}>
                    <Text style={[styles.wordTerm, { color: c.foreground }]}>{index + 1}. {word.term}</Text>
                    {collocationType ? (
                      <Text
                        testID={`course-select-collocation-type-${word.id}`}
                        style={[styles.selectionCollocationType, { color: c.primary }]}
                      >
                        {collocationType}
                      </Text>
                    ) : null}
                    <Text style={[styles.wordMeaning, { color: c.mutedForeground }]}>{displayCourseMeaning(word)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14), backgroundColor: c.background, borderColor: c.border }]}>
            <Button
              testID="course-finish"
              label={`Lưu ${selectedIds.size} mục vào Sổ từ`}
              icon="book-open"
              onPress={() => void finish()}
              loading={busy}
              style={{ minHeight: 56, borderRadius: 18 }}
            />
            <Pressable
              testID="course-add-all"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void finish(true)}
              style={[
                styles.addAllButton,
                {
                  backgroundColor: c.secondary, borderColor: c.border, opacity: busy ? 0.6 : 1,
                  shadowColor: c.shade, shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.14, shadowRadius: 6, elevation: 3,
                },
              ]}
            >
              <MaterialSheen tone="navy" radius={16} />
              <Feather name="plus-circle" size={18} color={c.primary} />
              <Text style={[styles.addAllText, { color: c.foreground }]}>Thêm tất cả từ</Text>
            </Pressable>
          </View>
        </View>
      ) : stage === 'completed' ? (
        <View style={styles.completedWrap}>
          <View style={[styles.completedIcon, { backgroundColor: c.successSoft }]}>
            <Feather name="check" size={38} color={c.success} />
          </View>
          <Text style={[styles.heading, { color: c.foreground }]}>Hoàn thành bài học</Text>
          <Text style={[styles.body, { color: c.mutedForeground, textAlign: 'center' }]}>
            {addedCount === null
              ? 'Bài này đã được hoàn thành trước đó.'
              : `Đã thêm ${addedCount} mục mới vào Sổ từ. Những mục đã có không bị thêm trùng.`}
          </Text>
          <Text style={[styles.body, { color: c.mutedForeground, textAlign: 'center' }]}>
            Đã chọn {selectedIds.size} / {lesson.words.length} mục.
          </Text>
          <Button label="Về danh sách khóa học" icon="arrow-left" onPress={goBack} style={{ marginTop: 14 }} />
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.lessonContent, { paddingBottom: Math.max(insets.bottom, 22) }]}
          keyboardShouldPersistTaps="handled"
        >
          {stage === 'flashcard' && currentWord ? (
            <>
              <Text style={[styles.overline, { color: c.primary }]}>THẺ TỪ {progress.currentIndex + 1}</Text>
              <View style={[
                styles.flashcard,
                {
                  backgroundColor: c.vocabCard, borderColor: c.vocabCard,
                  shadowColor: c.shade, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.22, shadowRadius: 12, elevation: 6,
                },
              ]}>
                <MaterialSheen tone="navy" radius={24} />
                {displayCollocationType(currentWord) ? (
                  <View style={[styles.collocationTypeBadge, { backgroundColor: c.vocabCardAccent }]}>
                    <Text testID="course-collocation-type" style={[styles.collocationTypeText, { color: c.buttonForeground }]}>
                      {displayCollocationType(currentWord)}
                    </Text>
                  </View>
                ) : null}
                {showExample ? (
                  <>
                    <Text style={[styles.exampleWord, { color: c.vocabCardMuted }]}>{currentWord.term}</Text>
                    <View style={[styles.divider, { backgroundColor: c.headerButton }]} />
                    <Text testID="course-example" style={[styles.flashExample, { color: c.vocabCardForeground }]}>
                      {segmentExample(currentWord.example, currentWord.term).map((segment, index) => (
                        <Text key={`${segment.text}-${index}`} style={segment.underline ? styles.exampleUnderline : undefined}>
                          {segment.text}
                        </Text>
                      ))}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.flashIcon, { backgroundColor: c.vocabCardAccent }]}>
                      <Feather name="bookmark" size={20} color={c.buttonForeground} />
                    </View>
                    <View style={styles.termWithSpeaker}>
                      <Text style={[styles.flashTerm, { color: c.vocabCardForeground }]}>{currentWord.term}</Text>
                      <Pressable testID="course-speak-word" accessibilityRole="button" accessibilityLabel={`Phát âm ${currentWord.term}`}
                        onPress={() => { void speech.speakWord(currentWord.term); }} hitSlop={10}
                        style={styles.speakerButton}>
                        <Feather name="volume-2" size={21} color={c.accent} />
                      </Pressable>
                    </View>
                    <View style={[styles.divider, { backgroundColor: c.headerButton }]} />
                    <Text style={[styles.flashMeaning, { color: c.vocabCardMuted }]}>{displayCourseMeaning(currentWord)}</Text>
                  </>
                )}
              </View>
              <Pressable
                testID="course-flip-example"
                accessibilityRole="button"
                accessibilityState={{ selected: showExample }}
                accessibilityLabel={showExample ? 'Lật lại từ và nghĩa' : 'Lật thẻ xem ví dụ'}
                onPress={() => setShowExample(value => !value)}
                style={[
                  styles.flipButton,
                  {
                    backgroundColor: c.secondary, borderColor: c.border,
                    shadowColor: c.shade, shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.14, shadowRadius: 6, elevation: 3,
                  },
                ]}
              >
                <MaterialSheen tone="navy" radius={14} />
                <Feather name={showExample ? 'rotate-ccw' : 'rotate-cw'} size={17} color={c.primary} />
                <Text style={[styles.flipText, { color: c.primary }]}>
                  {showExample ? 'Lật lại từ và nghĩa' : 'Lật thẻ xem ví dụ'}
                </Text>
              </Pressable>
              <Text style={[styles.helper, { color: c.mutedForeground }]}>
                Đọc từ và nghĩa, sau đó thử viết lại từ tiếng Anh.
              </Text>
              <Button testID="course-start-answer" label="Đã xem, viết lại từ" icon="edit-3" onPress={beginWriting} loading={busy} />
            </>
          ) : stage === 'answer' && currentWord ? (
            <>
              <Text style={[styles.overline, { color: c.primary }]}>VIẾT LẠI TỪ</Text>
              {displayCollocationType(currentWord) ? (
                <Text testID="course-collocation-type" style={[styles.answerCollocationType, { color: c.primary }]}>
                  {displayCollocationType(currentWord)}
                </Text>
              ) : null}
              <Text style={[styles.prompt, { color: c.foreground }]}>{displayCourseMeaning(currentWord)}</Text>
              <TextInput
                testID="course-answer"
                accessibilityLabel="Viết từ tiếng Anh"
                value={answer}
                onChangeText={value => { setAnswer(value); setAnswerResult(null); }}
                onSubmitEditing={checkAnswer}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                placeholder="Nhập từ tiếng Anh"
                placeholderTextColor={c.mutedForeground}
                editable={!busy && answerResult === null}
                style={[styles.answerInput, { color: c.foreground, backgroundColor: c.input, borderColor: answerResult === 'correct' ? c.success : c.border }]}
              />
              {answerResult ? (
                <View style={[
                  styles.answerFeedback,
                  { backgroundColor: answerResult === 'correct' ? c.successSoft : c.destructiveSoft },
                ]}>
                  <Feather
                    name={answerResult === 'correct' ? 'check-circle' : 'alert-circle'}
                    size={19}
                    color={answerResult === 'correct' ? c.success : c.destructive}
                  />
                  <Text style={[
                    styles.answerFeedbackText,
                    { color: answerResult === 'correct' ? c.successText : c.destructiveText },
                  ]}>
                    {answerResult === 'correct' ? 'Chính xác!' : `Từ đúng: ${currentWord.term}`}
                  </Text>
                </View>
              ) : null}
              {answerResult ? (
                <Button
                  testID="course-next-word"
                  label={progress.currentIndex === lesson.words.length - 1 ? 'Chọn từ muốn lưu' : 'Từ tiếp theo'}
                  icon="arrow-right"
                  onPress={() => void advanceWord()}
                  loading={busy}
                />
              ) : (
                <Button testID="course-check-answer" label="Kiểm tra" icon="check" onPress={checkAnswer} disabled={!answer.trim()} />
              )}
              {answerResult === 'incorrect' ? (
                <Pressable accessibilityRole="button" onPress={() => { answerGuard.current.reset(); setAnswer(''); setAnswerResult(null); }}>
                  <Text style={[styles.retry, { color: c.primary }]}>Thử viết lại</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={c.primary} />
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { position: 'relative', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontFamily: F.s, fontSize: 16 },
  headerSubtitle: { fontFamily: F.r, fontSize: 12 },
  counter: { fontFamily: F.s, fontSize: 13 },
  track: { height: 5, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 4 },
  errorWrap: { paddingHorizontal: 16, paddingTop: 8 },
  lessonContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 24, gap: 18 },
  overline: { fontFamily: F.s, fontSize: 12, letterSpacing: 1.1, textAlign: 'center' },
  flashcard: { position: 'relative', borderRadius: 24, borderWidth: 1, padding: 28, minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 18 },
  collocationTypeBadge: { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  collocationTypeText: { fontFamily: F.s, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  answerCollocationType: { fontFamily: F.s, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  flashIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  flashTerm: { fontFamily: F.b, fontSize: 34, textAlign: 'center' },
  termWithSpeaker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  speakerButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 52, height: 2, borderRadius: 2 },
  flashMeaning: { fontFamily: F.m, fontSize: 21, textAlign: 'center', lineHeight: 30 },
  exampleWord: { fontFamily: F.s, fontSize: 16, textAlign: 'center' },
  flashExample: { fontFamily: F.m, fontSize: 19, textAlign: 'center', lineHeight: 29 },
  exampleUnderline: { textDecorationLine: 'underline' },
  flipButton: { position: 'relative', alignSelf: 'center', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16 },
  flipText: { fontFamily: F.s, fontSize: 14 },
  helper: { fontFamily: F.r, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  prompt: { fontFamily: F.s, fontSize: 27, lineHeight: 37, textAlign: 'center', marginTop: 16 },
  answerInput: { minHeight: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 17, fontFamily: F.m, fontSize: 19 },
  answerFeedback: { minHeight: 48, borderRadius: 14, padding: 13, flexDirection: 'row', gap: 10, alignItems: 'center' },
  answerFeedbackText: { flex: 1, fontFamily: F.s, fontSize: 15 },
  retry: { fontFamily: F.s, fontSize: 15, textAlign: 'center', padding: 10 },
  selectionIntro: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 12, gap: 8 },
  heading: { fontFamily: F.b, fontSize: 24, textAlign: 'center' },
  body: { fontFamily: F.r, fontSize: 14, lineHeight: 21 },
  selectedCount: { fontFamily: F.s, fontSize: 13, textAlign: 'center' },
  selectionList: { flex: 1, paddingHorizontal: 14 },
  selectionContent: { gap: 8, paddingBottom: 16 },
  wordRow: { position: 'relative', minHeight: 66, borderWidth: 1, borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  checkbox: { width: 23, height: 23, borderWidth: 1.5, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  wordRowText: { flex: 1, gap: 3 },
  wordTerm: { fontFamily: F.s, fontSize: 14 },
  selectionCollocationType: { fontFamily: F.s, fontSize: 12 },
  wordMeaning: { fontFamily: F.r, fontSize: 13 },
  footer: { paddingHorizontal: 16, paddingTop: 11, borderTopWidth: 1, gap: 10 },
  addAllButton: { position: 'relative', minHeight: 48, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addAllText: { fontFamily: F.s, fontSize: 15 },
  completedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 15 },
  completedIcon: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
