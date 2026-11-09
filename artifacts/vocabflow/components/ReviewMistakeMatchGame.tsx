import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, F } from '@/components/ui';
import type { VocabularyWord } from '@/data/types';
import { useSpeechPreferences } from '@/contexts/SpeechPreferencesContext';
import { useColors } from '@/hooks/useColors';
import {
  createWordMatchGame,
  selectWordMatch,
  type WordMatchGameState,
  type WordMatchSide,
} from '@/domain/word-match-game';

interface ReviewMistakeMatchGameProps {
  words: VocabularyWord[];
  onReturnToReview: () => void;
}

function vibrate(correct: boolean) {
  if (Platform.OS === 'web') return;
  const feedback = correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error;
  void Haptics.notificationAsync(feedback).catch(() => {});
}

export function ReviewMistakeMatchGame({ words, onReturnToReview }: ReviewMistakeMatchGameProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const speech = useSpeechPreferences();
  const [game, setGame] = useState<WordMatchGameState>(() => createWordMatchGame(words));
  const gameRef = useRef(game);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [stoppedEarly, setStoppedEarly] = useState(false);
  const wordById = useMemo(() => new Map(game.active.map(word => [word.id, word])), [game.active]);
  const isFinished = stoppedEarly || (game.active.length === 0 && game.queue.length === 0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setExitPrompt(true);
      return true;
    });
    return () => {
      subscription.remove();
      void speech.stopSpeaking();
    };
  }, [speech.stopSpeaking]);

  const choose = (side: WordMatchSide, id: number) => {
    if (isFinished) return;
    if (side === 'term') {
      const word = wordById.get(id);
      if (word) void speech.speakWord(word.term);
    }
    const selection = selectWordMatch(gameRef.current, side, id);
    if (selection.result === 'correct') vibrate(true);
    else if (selection.result === 'incorrect') vibrate(false);
    else if (selection.result === 'selected' && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    gameRef.current = selection.state;
    setGame(selection.state);
  };

  const requestExit = () => {
    setExitPrompt(false);
    setStoppedEarly(game.active.length > 0 || game.queue.length > 0);
    void speech.stopSpeaking();
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const orderedTerms = game.termOrder.map(id => (id === null ? undefined : wordById.get(id)));
  const orderedMeanings = game.meaningOrder.map(id => (id === null ? undefined : wordById.get(id)));
  const progress = words.length ? game.correctCount / words.length : 1;

  const renderOption = (word: VocabularyWord, side: WordMatchSide, slotIndex: number) => {
    const id = word.id;
    const selected = side === 'term' ? game.selectedTermId === id : game.selectedMeaningId === id;
    const wrong = side === 'term' ? game.lastWrongTermId === id : game.lastWrongMeaningId === id;
    const backgroundColor = wrong ? c.destructiveSoft : selected ? c.accentSoft : c.card;
    const borderColor = wrong ? c.destructive : selected ? c.primary : c.border;
    const textColor = wrong ? c.destructiveText : c.foreground;
    const label = side === 'term' ? word.term : word.meaning;
    return (
      <Animated.View
        key={`${side}-slot-${slotIndex}-word-${id}`}
        entering={FadeIn.delay(150).duration(240)}
        exiting={FadeOut.duration(140)}
        style={styles.optionMotion}
      >
        <Pressable
          testID={`match-${side}-${id}`}
          accessibilityRole="button"
          accessibilityLabel={side === 'term' ? `Từ ${word.term}` : `Nghĩa ${word.meaning}`}
          accessibilityState={{ selected }}
          onPress={() => choose(side, id)}
          style={({ pressed }) => [
            styles.option,
            { backgroundColor, borderColor, opacity: pressed ? 0.76 : 1, borderRadius: c.radius },
          ]}
        >
          <Text
            style={[styles.optionText, { color: textColor }]}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {label}
          </Text>
          {selected ? <Feather name="check" size={17} color={c.primary} /> : null}
          {wrong ? <Feather name="x" size={17} color={c.destructive} /> : null}
        </Pressable>
      </Animated.View>
    );
  };

  const renderSlot = (word: VocabularyWord | undefined, side: WordMatchSide, slotIndex: number) => (
    <View
      key={`${side}-slot-${slotIndex}`}
      testID={`match-${side}-slot-${slotIndex}`}
      style={styles.optionWrap}
    >
      {word ? renderOption(word, side, slotIndex) : null}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: c.border }]}>
        <Pressable
          testID="match-exit"
          accessibilityRole="button"
          accessibilityLabel="Thoát trò Nối từ"
          onPress={() => setExitPrompt(true)}
          hitSlop={8}
          style={styles.headerButton}
        >
          <Feather name="x" size={23} color={c.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Nối từ sai</Text>
        <Text testID="match-progress-count" style={[styles.headerCount, { color: c.mutedForeground }]}>
          {game.correctCount}/{words.length}
        </Text>
      </View>

      {isFinished ? (
        <View testID="match-result" accessibilityLiveRegion="polite" style={styles.result}>
          <Animated.View entering={FadeInDown.duration(260)} style={[styles.resultIcon, { backgroundColor: c.accentSoft }]}>
            <Feather name={stoppedEarly ? 'pause' : 'check'} size={36} color={c.primary} />
          </Animated.View>
          <Text testID="match-result-title" style={[styles.resultTitle, { color: c.foreground }]}>
            {stoppedEarly ? 'Đã dừng trò chơi' : 'Nối từ hoàn tất!'}
          </Text>
          <Text testID="match-result-count" style={[styles.resultText, { color: c.mutedForeground }]}>
            Đã nối đúng {game.correctCount}/{words.length} cặp
          </Text>
          <Text testID="match-result-mistakes" style={[styles.resultText, { color: c.mutedForeground }]}>
            Số lần nối sai: {game.mistakes}
          </Text>
          <Button
            testID="match-return-review"
            label="Về kết quả ôn tập"
            icon="arrow-right"
            onPress={onReturnToReview}
            style={styles.returnButton}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 16) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.instruction, { color: c.mutedForeground }]}>
            Chọn từ tiếng Anh rồi chọn nghĩa tương ứng.
          </Text>
          <View
            testID="match-progress-track"
            accessibilityLabel={`Đã nối ${game.correctCount} trên ${words.length} cặp`}
            style={[styles.progressTrack, { backgroundColor: c.reviewTrack }]}
          >
            <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.columns}>
            <View style={styles.column}>
              <Text style={[styles.columnTitle, { color: c.mutedForeground }]}>TỪ</Text>
              {orderedTerms.map((word, slotIndex) => renderSlot(word, 'term', slotIndex))}
            </View>
            <View style={styles.column}>
              <Text style={[styles.columnTitle, { color: c.mutedForeground }]}>NGHĨA</Text>
              {orderedMeanings.map((word, slotIndex) => renderSlot(word, 'meaning', slotIndex))}
            </View>
          </View>
          <Text testID="match-mistake-count" style={[styles.mistakeCount, { color: c.mutedForeground }]}>
            Lần nối sai: {game.mistakes}
          </Text>
        </ScrollView>
      )}

      <Modal
        transparent
        visible={exitPrompt}
        animationType="fade"
        onRequestClose={() => setExitPrompt(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View testID="match-exit-dialog" style={[styles.dialog, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 6 }]}>
            <View style={[styles.dialogIcon, { backgroundColor: c.accentSoft }]}>
              <Feather name="help-circle" size={21} color={c.primary} />
            </View>
            <Text style={[styles.dialogTitle, { color: c.foreground }]}>
              {isFinished ? 'Về kết quả ôn?' : 'Thoát trò Nối từ?'}
            </Text>
            <Text style={[styles.dialogBody, { color: c.mutedForeground }]}>
              {isFinished
                ? 'Kết quả trò chơi đã sẵn sàng. Bạn có thể quay lại kết quả ôn tập.'
                : 'Tiến độ nối sẽ dừng tại đây. Kết quả ôn tập vẫn được giữ nguyên.'}
            </Text>
            <View style={styles.dialogActions}>
              <Button
                testID="match-exit-cancel"
                label={isFinished ? 'Ở lại' : 'Tiếp tục chơi'}
                variant="ghost"
                onPress={() => setExitPrompt(false)}
                style={styles.dialogButton}
              />
              <Button
                testID="match-exit-confirm"
                label={isFinished ? 'Về Ôn tập' : 'Thoát'}
                icon={isFinished ? 'arrow-right' : 'x'}
                onPress={isFinished ? onReturnToReview : requestExit}
                style={styles.dialogButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: { width: 44, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: F.b, fontSize: 20, textAlign: 'center' },
  headerCount: { width: 44, fontFamily: F.s, fontSize: 13, textAlign: 'right' },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  instruction: { fontFamily: F.r, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  column: { flex: 1, gap: 8 },
  columnTitle: { fontFamily: F.s, fontSize: 11, letterSpacing: 0.6, textAlign: 'center', paddingVertical: 2 },
  optionWrap: { height: 62 },
  optionMotion: { flex: 1 },
  option: {
    height: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  optionText: { flexShrink: 1, fontFamily: F.m, fontSize: 14, lineHeight: 15, textAlign: 'center' },
  mistakeCount: { fontFamily: F.m, fontSize: 13, textAlign: 'center', paddingVertical: 2 },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  resultIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontFamily: F.b, fontSize: 24, textAlign: 'center' },
  resultText: { fontFamily: F.m, fontSize: 15, textAlign: 'center' },
  returnButton: { alignSelf: 'stretch', minHeight: 54, marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  dialog: { padding: 20, gap: 12, borderWidth: 1 },
  dialogIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { fontFamily: F.b, fontSize: 19 },
  dialogBody: { fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  dialogActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  dialogButton: { flex: 1, minHeight: 48, paddingHorizontal: 10 },
});
