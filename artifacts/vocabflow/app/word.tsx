import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVocabulary } from '@/contexts/VocabularyContext';
import type { VocabularyWord, WordInput } from '@/data/types';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button, ConfirmDialog, EmptyState, ErrorBanner, F, MaterialSheen, Skeleton } from '@/components/ui';
import { formatDate } from '@/utils/text';
import { getDictionaryDraft, getDictionaryEntry } from '@/data/dictionary';
import { sameWordSense, validDictionaryId } from '@/domain/dictionary';
import { useDictionary } from '@/hooks/useDictionary';
import { DictionaryGate } from '@/components/DictionaryGate';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { soundCueFor, withSoundOutcome } from '@/domain/sound-cues';
import { useSpeechPreferences } from '@/contexts/SpeechPreferencesContext';
import {
  getRegionalIpaLookupForTerm,
  type RegionalIpaLookupResult,
} from '@/data/offline-regional-pronunciations';
import type { DictionaryPronunciation } from '@/domain/dictionary';
import {
  groupReviewPronunciations,
  reviewExampleTranslation,
} from '@/domain/review-result-details';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Field({ label, required, error, hint, ...props }: TextInputProps & { ref?: React.Ref<any>; label: string; required?: boolean; error?: string; hint?: string }) {
  const c = useColors();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.foreground }]}>
        {label}
        {required ? <Text style={{ color: c.accent }}> *</Text> : <Text style={{ color: c.mutedForeground, fontFamily: F.r }}>  (không bắt buộc)</Text>}
      </Text>
      <TextInput
        {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        placeholderTextColor={c.mutedForeground}
        style={[
          styles.input,
          props.multiline && styles.multi,
          {
            color: c.foreground,
            backgroundColor: c.input,
            borderRadius: c.radius,
            borderColor: error ? c.destructive : focus ? c.primary : c.border,
            borderWidth: focus || error ? 2 : 1,
          },
        ]}
      />
      {error ? <Text style={[styles.err, { color: c.destructiveText }]}>{error}</Text> : hint ? <Text style={[styles.hint, { color: c.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

function SavedWordInfoCard({ word }: { word: VocabularyWord }) {
  const c = useColors();
  const speech = useSpeechPreferences();
  const lookupKey = `${word.id}:${word.dictionaryEntryId ?? ''}:${word.term}`;
  const [pronunciationLookup, setPronunciationLookup] = useState<{
    key: string;
    pronunciations: DictionaryPronunciation[];
    regionalState: RegionalIpaLookupResult['state'] | 'loading' | 'not-needed';
  } | null>(null);
  const pronunciationState =
    pronunciationLookup?.key === lookupKey
      ? pronunciationLookup.regionalState
      : 'loading';
  const pronunciationLines = groupReviewPronunciations(
    pronunciationLookup?.key === lookupKey
      ? pronunciationLookup.pronunciations
      : [],
    word.ipa,
  );
  const exampleTranslation = reviewExampleTranslation(word.example);

  useEffect(() => {
    let active = true;
    const loadPronunciations = async () => {
      let pronunciations: DictionaryPronunciation[] = [];
      let dictionaryLookupFailed = false;
      if (word.dictionaryEntryId != null) {
        try {
          pronunciations = (await getDictionaryEntry(word.dictionaryEntryId)).pronunciations;
        } catch {
          dictionaryLookupFailed = true;
        }
      }

      let regionalState: RegionalIpaLookupResult['state'] | 'not-needed' =
        'not-needed';
      if (
        word.dictionaryEntryId == null ||
        !groupReviewPronunciations(pronunciations, '').uk.length
      ) {
        try {
          const result = await getRegionalIpaLookupForTerm(word.term);
          regionalState =
            dictionaryLookupFailed && result.state !== 'found'
              ? 'failed'
              : result.state;
          if (result.state === 'found') {
            pronunciations = [...pronunciations, ...result.pronunciations];
          }
        } catch {
          regionalState = 'failed';
        }
      }

      if (active) {
        setPronunciationLookup({
          key: lookupKey,
          pronunciations,
          regionalState,
        });
      }
    };

    void loadPronunciations();
    return () => {
      active = false;
    };
  }, [lookupKey, word.dictionaryEntryId, word.term]);

  const ukIpa =
    pronunciationLines.uk.join(' · ') ||
    (pronunciationState === 'loading'
      ? 'Đang tra cứu IPA Anh-Anh…'
      : pronunciationState === 'not-found'
        ? 'Gói đã cài nhưng không có mục Anh-Anh cho từ này'
        : pronunciationState === 'damaged'
          ? 'Gói IPA bị lỗi · hãy cài lại trong Cài đặt'
          : pronunciationState === 'failed'
            ? 'Tra cứu IPA Anh-Anh thất bại · hãy thử lại'
            : pronunciationState === 'not-needed'
              ? 'Chưa có dữ liệu Anh-Anh'
              : 'Chưa cài gói IPA Anh-Anh · tải gói trong Cài đặt');

  return (
    <View
      testID="word-info-card"
      style={[
        styles.wordInfoCard,
        { backgroundColor: c.vocabCard, borderRadius: c.radius + 6 },
      ]}
    >
      <MaterialSheen tone="navy" radius={c.radius + 6} />
      <Text style={[styles.infoEyebrow, { color: c.vocabCardMuted }]}>
        THÔNG TIN TỪ
      </Text>
      <View style={styles.infoGroup}>
        <Text style={[styles.infoLabel, { color: c.vocabCardMuted }]}>
          TIẾN ĐỘ ÔN
        </Text>
        <Text
          testID="word-info-progress"
          style={[styles.infoValue, { color: c.vocabCardForeground }]}
        >
          {word.frozen
            ? 'Đã đóng băng — dừng ôn tập'
            : word.completed
              ? 'Đã hoàn tất 6 cấp ôn'
              : `Cấp ôn hiện tại: ${word.level} / 6`}
        </Text>
        <Text style={[styles.infoMuted, { color: c.vocabCardMuted }]}>
          {word.frozen
            ? 'Vẫn tra cứu được và vẫn tính vào tổng số từ đã lưu.'
            : word.nextReviewOn
              ? `Hạn ôn: ${word.nextReviewOn.split('-').reverse().join('/')}`
              : 'Không còn lịch ôn trong chu kỳ này.'}
        </Text>
        <Text style={[styles.infoMuted, { color: c.vocabCardMuted }]}>
          Đã trả lời {word.reviewCount} lần.
        </Text>
      </View>
      <View style={styles.infoGroup}>
        <Text style={[styles.infoLabel, { color: c.vocabCardMuted }]}>ĐÁP ÁN</Text>
        <Text
          testID="word-info-term"
          style={[styles.infoTerm, { color: c.vocabCardForeground }]}
        >
          {word.term}
        </Text>
      </View>
      <View style={styles.infoGroup}>
        <Text style={[styles.infoLabel, { color: c.vocabCardMuted }]}>
          PHIÊN ÂM
        </Text>
        <View style={styles.ipaRows}>
          <View style={styles.ipaRow}>
            <Text
              style={[
                styles.ipaAccent,
                { color: c.vocabCardMuted, borderColor: c.vocabCardMuted },
              ]}
              accessibilityLabel="Phiên âm Anh-Mỹ"
            >
              US
            </Text>
            <Text
              testID="word-info-ipa-us"
              style={[
                styles.infoMuted,
                styles.ipaValue,
                { color: c.vocabCardMuted },
              ]}
            >
              {pronunciationLines.us.join(' · ') || 'Chưa có dữ liệu'}
            </Text>
            <Pressable
              testID="word-info-speak"
              accessibilityRole="button"
              accessibilityLabel={`Phát âm ${word.term}`}
              onPress={() => {
                void speech.speakWord(word.term, word.dictionaryEntryId);
              }}
              hitSlop={10}
              style={styles.audioButton}
            >
              <Feather name="volume-2" size={20} color={c.vocabCardAccent} />
            </Pressable>
          </View>
          <View style={styles.ipaRow}>
            <Text
              style={[
                styles.ipaAccent,
                { color: c.vocabCardMuted, borderColor: c.vocabCardMuted },
              ]}
              accessibilityLabel="Phiên âm Anh-Anh"
            >
              UK
            </Text>
            <Text
              testID="word-info-ipa-uk"
              style={[
                styles.infoMuted,
                styles.ipaValue,
                { color: c.vocabCardMuted },
              ]}
            >
              {ukIpa}
            </Text>
          </View>
          {pronunciationLines.unspecified.length ? (
            <View style={styles.ipaRow}>
              <Text
                style={[
                  styles.ipaAccent,
                  { color: c.vocabCardMuted, borderColor: c.vocabCardMuted },
                ]}
                accessibilityLabel="Phiên âm chưa xác định vùng"
              >
                —
              </Text>
              <Text
                testID="word-info-ipa-unspecified"
                style={[
                  styles.infoMuted,
                  styles.ipaValue,
                  { color: c.vocabCardMuted },
                ]}
              >
                {pronunciationLines.unspecified.join(' · ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.infoGroup}>
        <Text style={[styles.infoLabel, { color: c.vocabCardMuted }]}>
          NGHĨA TIẾNG VIỆT
        </Text>
        <Text
          testID="word-info-meaning"
          style={[styles.infoValue, { color: c.vocabCardForeground }]}
        >
          {word.meaning}
        </Text>
      </View>
      {word.example.trim() ? (
        <View style={styles.infoGroup}>
          <Text style={[styles.infoLabel, { color: c.vocabCardMuted }]}>
            CÂU VÍ DỤ
          </Text>
          <Text
            testID="word-info-example"
            style={[styles.infoExample, { color: c.vocabCardForeground }]}
          >
            {word.example}
          </Text>
          {exampleTranslation ? (
            <View style={styles.infoGroup}>
              <Text style={[styles.infoLabel, { color: c.vocabCardMuted }]}>
                DỊCH NGHĨA
              </Text>
              <Text
                testID="word-info-example-translation"
                style={[styles.infoValue, { color: c.vocabCardForeground }]}
              >
                {exampleTranslation}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function WordForm({ existing, initial, fromDictionary }: { existing?: VocabularyWord; initial?: WordInput; fromDictionary?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { words, saveWord, deleteWord, setWordFrozen } = useVocabulary();
  const sound = useSoundEffects();
  const [form, setForm] = useState<WordInput>({
    term: initial?.term ?? '',
    meaning: initial?.meaning ?? '',
    ipa: initial?.ipa ?? '',
    example: initial?.example ?? '',
    note: '',
    // Source IDs are metadata, not editable fields; preserve them on first save.
    dictionaryEntryId: initial?.dictionaryEntryId ?? null,
    dictionarySenseId: initial?.dictionarySenseId ?? null,
  });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingFreeze, setChangingFreeze] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const conflict = !existing && submitError
    ? words.find((w) => sameWordSense(w, form))
    : undefined;
  const meaningRef = useRef<any>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const playIfMounted = (cue: Parameters<typeof sound.play>[0]) => {
    if (mounted.current) sound.play(cue);
  };

  const set = (k: keyof WordInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const termErr = touched && !form.term.trim() ? 'Hãy nhập từ tiếng Anh.' : undefined;
  const meaningErr = touched && !form.meaning.trim() ? 'Hãy nhập nghĩa tiếng Việt.' : undefined;

  const submit = async () => {
    if (existing || busyRef.current) return;
    setTouched(true);
    setSubmitError(null);
    if (!form.term.trim() || !form.meaning.trim()) return;
    busyRef.current = true;
    setSaving(true);
    sound.unlockFromGesture();
    try {
      await withSoundOutcome(
        () => saveWord(form),
        playIfMounted,
        soundCueFor('wordSaved'),
      );
      goBack();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Không thể lưu từ. Hãy thử lại.');
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!existing || busyRef.current) return;
    busyRef.current = true;
    setDeleting(true);
    sound.unlockFromGesture();
    try {
      await withSoundOutcome(
        () => deleteWord(existing.id),
        playIfMounted,
        soundCueFor('wordDeleted'),
      );
      setConfirm(false);
      goBack();
    } catch (e) {
      setConfirm(false);
      setSubmitError(e instanceof Error ? e.message : 'Không thể xoá từ. Hãy thử lại.');
    } finally {
      busyRef.current = false;
      setDeleting(false);
    }
  };

  const bottomPad = (Platform.OS === 'web' ? 34 : insets.bottom) + 24;
  const toggleFreeze = async () => {
    if (!existing || busyRef.current) return;
    busyRef.current = true;
    setChangingFreeze(true);
    setSubmitError(null);
    sound.unlockFromGesture();
    try {
      await withSoundOutcome(
        () => setWordFrozen(existing.id, !existing.frozen),
        playIfMounted,
        soundCueFor(existing.frozen ? 'freezeDisabled' : 'freezeEnabled'),
      );
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : 'Không thể đổi trạng thái đóng băng.');
    } finally {
      busyRef.current = false;
      setChangingFreeze(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Chi tiết từ' : 'Từ mới' }} />
      <KeyboardAwareScrollViewCompat
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPad, gap: 18 }}
        bottomOffset={24}
      >
        <View style={{ gap: 4 }}>
          <Text style={[styles.title, { color: c.foreground }]}>{existing ? 'Thông tin từ' : fromDictionary ? 'Xem lại trước khi lưu' : 'Ghi một từ vào sổ'}</Text>
          <Text style={[styles.sub, { color: c.mutedForeground }]}>
            {existing ? `Ghi lần đầu ngày ${formatDate(existing.createdAt)}` : fromDictionary ? 'Đã điền sẵn từ từ điển. Hãy kiểm tra nội dung trước khi lưu.' : 'Chỉ từ và nghĩa là bắt buộc.'}
          </Text>
        </View>
        {existing ? <SavedWordInfoCard word={existing} /> : (
          <Text style={[styles.sub, { color: c.mutedForeground }]}>Từ mới có thể học ngay sau khi lưu.</Text>
        )}
        {submitError ? <ErrorBanner message={submitError} /> : null}
        {conflict ? (
          <Button testID="word-open-conflict" label={`Mở “${conflict.term}” đã có trong sổ`} icon="book-open" variant="ghost"
            onPress={() => router.replace({ pathname: '/word', params: { id: String(conflict.id) } })} />
        ) : null}
        {existing && (existing.frozen || !existing.completed) ? (
          <View style={{ gap: 8 }}>
            <Button testID="word-toggle-freeze" label={existing.frozen ? 'Bỏ đóng băng' : 'Đóng băng'}
              icon={existing.frozen ? 'play-circle' : 'pause-circle'} variant="ghost"
              onPress={() => { void toggleFreeze(); }} loading={changingFreeze} disabled={saving || deleting} />
            <Text style={[styles.sub, { color: c.mutedForeground }]}>
              {existing.frozen ? 'Bỏ đóng băng: trở về cấp 6, giữ ngày học và số lần trả lời.' : 'Dừng ôn cho đến khi bạn bỏ đóng băng. Không xóa từ.'}
            </Text>
          </View>
        ) : null}
        {!existing ? (
          <>
            <Field testID="field-term" label="Từ tiếng Anh" required error={termErr} value={form.term} onChangeText={set('term')}
              autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => meaningRef.current?.focus()} editable={!saving} />
            <Field testID="field-meaning" ref={meaningRef} label="Nghĩa tiếng Việt" required error={meaningErr} value={form.meaning} onChangeText={set('meaning')} multiline editable={!saving} />
            <Field testID="field-ipa" label="Phiên âm IPA" value={form.ipa} onChangeText={set('ipa')} autoCapitalize="none" autoCorrect={false} editable={!saving} />
            <Field testID="field-example" label="Câu ví dụ" value={form.example} onChangeText={set('example')} multiline editable={!saving} />
            <Button testID="save" label="Lưu vào sổ" icon="check" onPress={submit} loading={saving} disabled={deleting || changingFreeze} />
          </>
        ) : null}
        {existing ? (
          <Button testID="delete" label="Xoá từ này" icon="trash-2" variant="ghost" onPress={() => setConfirm(true)} disabled={saving || deleting || changingFreeze}
            style={{ borderColor: c.destructiveSoft }} />
        ) : null}
      </KeyboardAwareScrollViewCompat>
      {existing ? (
        <ConfirmDialog
          visible={confirm}
          title="Xoá từ này?"
          message={`“${existing.term}” sẽ bị xoá khỏi sổ vĩnh viễn. Không thể hoàn tác.`}
          confirmLabel="Xoá"
          busy={deleting}
          onCancel={() => setConfirm(false)}
          onConfirm={doDelete}
        />
      ) : null}
    </>
  );
}

function parseDictId(v: unknown): number | null {
  if (typeof v !== 'string' || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return validDictionaryId(n) ? n : null;
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 20, gap: 12 }}>
      <Stack.Screen options={{ title }} />
      {children}
    </View>
  );
}

function DictionaryDraftScreen({ wordId, senseId }: { wordId: number; senseId: number }) {
  const c = useColors();
  const dict = useDictionary();
  const { words, loading: vocabLoading, error: vocabError, reload } = useVocabulary();
  const [draft, setDraft] = useState<WordInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Once the form is shown, keep it (even if a save adds this term to the list).
  const [formShown, setFormShown] = useState(false);

  useEffect(() => {
    if (!dict.ready) return;
    let active = true;
    setError(null);
    getDictionaryDraft(wordId, senseId).then(
      (d) => { if (active) setDraft(d); },
      (e) => { if (active) setError(e instanceof Error ? e.message : 'Không thể lấy nghĩa từ từ điển.'); },
    );
    return () => { active = false; };
  }, [wordId, senseId, dict.ready, tick]);

  const duplicate = draft && !formShown ? words.find((w) => sameWordSense(w, draft)) : undefined;
  const decided = !!draft && !vocabLoading;
  useEffect(() => {
    if (decided && !duplicate && !vocabError && !formShown) setFormShown(true);
  }, [decided, duplicate, vocabError, formShown]);

  if (formShown && draft) return <WordForm key={`dict-${wordId}-${senseId}`} initial={draft} fromDictionary />;
  if (!dict.ready) return (
    <Centered title="Kho từ điển">
      <DictionaryGate stage={dict.stage} error={dict.error} retry={dict.retry} approveDownload={dict.approveDownload} />
    </Centered>
  );
  const failure = dict.error ?? error;
  if (failure) {
    return (
      <Centered title="Lỗi từ điển">
        <ErrorBanner message={failure} onRetry={() => { if (dict.error) dict.retry(); else setTick((n) => n + 1); }} />
        <Button testID="draft-back" label="Quay lại" icon="arrow-left" variant="ghost" onPress={goBack} />
      </Centered>
    );
  }
  if (vocabError && draft) {
    return (
      <Centered title="Lỗi sổ từ">
        <ErrorBanner message={vocabError} onRetry={reload} />
        <Button testID="draft-back" label="Quay lại" icon="arrow-left" variant="ghost" onPress={goBack} />
      </Centered>
    );
  }
  if (duplicate) {
    return (
      <Centered title="Nghĩa đã có trong sổ">
        <EmptyState icon="book-open" title="Nghĩa này đã có trong sổ"
          body={`Nghĩa này của “${duplicate.term}” đã có trong sổ${duplicate.frozen ? ' (đang đóng băng)' : ''}. Trang cũ và tiến độ ôn được giữ nguyên.`}>
          <Button testID="draft-open-existing" label="Mở trang trong sổ" icon="book-open"
            onPress={() => router.replace({ pathname: '/word', params: { id: String(duplicate.id) } })} />
          <Button testID="draft-back" label="Quay lại" icon="arrow-left" variant="ghost" onPress={goBack} />
        </EmptyState>
      </Centered>
    );
  }
  return <View style={{ flex: 1, padding: 20, backgroundColor: c.background }}><Stack.Screen options={{ title: 'Từ mới' }} /><Skeleton h={56} /><Skeleton h={90} /><Skeleton h={56} /></View>;
}

export default function WordScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ id?: string; dictionaryWordId?: string; senseId?: string }>();
  const { words, loading, error, reload } = useVocabulary();
  const rawId = typeof params.id === 'string' ? params.id : undefined;

  if ((rawId === undefined || rawId === '') && (params.dictionaryWordId !== undefined || params.senseId !== undefined)) {
    const wordId = parseDictId(params.dictionaryWordId);
    const senseId = parseDictId(params.senseId);
    if (wordId === null || senseId === null) {
      return (
        <Centered title="Không hợp lệ">
          <EmptyState icon="alert-triangle" title="Liên kết từ điển không hợp lệ" body="Không xác định được mục từ hoặc nghĩa cần thêm. Hãy quay lại và chọn lại nghĩa.">
            <Button testID="draft-invalid-back" label="Quay lại" icon="arrow-left" onPress={goBack} />
          </EmptyState>
        </Centered>
      );
    }
    return <DictionaryDraftScreen key={`${wordId}-${senseId}`} wordId={wordId} senseId={senseId} />;
  }

  if (rawId === undefined || rawId === '') return <WordForm />;

  const id = Number(rawId);
  const valid = Number.isInteger(id) && id > 0;
  const word = valid ? words.find((w) => w.id === id) : undefined;

  if (valid && loading && !word) {
    return <View style={{ flex: 1, padding: 20, backgroundColor: c.background }}><Skeleton h={56} /><Skeleton h={56} /><Skeleton h={100} /></View>;
  }
  if (!word) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 20 }}>
        <Stack.Screen options={{ title: 'Không tìm thấy' }} />
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        <EmptyState icon="help-circle" title="Không tìm thấy từ này" body="Từ bạn muốn mở không có trong sổ. Có thể nó đã bị xoá hoặc đường dẫn không đúng.">
          <Button label="Quay lại sổ từ" icon="arrow-left" onPress={goBack} testID="notfound-back" />
        </EmptyState>
      </View>
    );
  }
  return <WordForm key={word.id} existing={word} />;
}

const styles = StyleSheet.create({
  title: { fontFamily: F.b, fontSize: 24, letterSpacing: -0.4 },
  sub: { fontFamily: F.r, fontSize: 14 },
  label: { fontFamily: F.s, fontSize: 14 },
  input: { fontFamily: F.r, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, minHeight: 50 },
  multi: { minHeight: 90, textAlignVertical: 'top' },
  wordInfoCard: { padding: 18, gap: 18, overflow: 'hidden' },
  infoEyebrow: { fontFamily: F.b, fontSize: 11, letterSpacing: 1.2 },
  infoGroup: { gap: 7 },
  infoLabel: { fontFamily: F.b, fontSize: 11, letterSpacing: 0.7 },
  infoValue: { fontFamily: F.r, fontSize: 16, lineHeight: 24 },
  infoMuted: { fontFamily: F.m, fontSize: 13, lineHeight: 20 },
  infoTerm: { fontFamily: F.b, fontSize: 28, lineHeight: 34 },
  infoExample: { fontFamily: F.s, fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
  ipaRows: { gap: 4 },
  ipaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ipaAccent: {
    minWidth: 48,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 6,
    fontFamily: F.b,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    overflow: 'hidden',
  },
  ipaValue: { flex: 1, flexWrap: 'wrap' },
  audioButton: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  err: { fontFamily: F.m, fontSize: 13 },
  hint: { fontFamily: F.r, fontSize: 13 },
});
