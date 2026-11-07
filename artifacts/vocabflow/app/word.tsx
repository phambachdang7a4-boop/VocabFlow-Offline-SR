import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVocabulary } from '@/contexts/VocabularyContext';
import type { VocabularyWord, WordInput } from '@/data/types';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button, ConfirmDialog, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { formatDate } from '@/utils/text';
import { normalizeTerm } from '@/data/vocabulary';
import { getDictionaryDraft } from '@/data/dictionary';
import { validDictionaryId } from '@/domain/dictionary';
import { useDictionary } from '@/hooks/useDictionary';

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
      {error ? <Text style={[styles.err, { color: c.destructive }]}>{error}</Text> : hint ? <Text style={[styles.hint, { color: c.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

function WordForm({ existing, initial, fromDictionary }: { existing?: VocabularyWord; initial?: WordInput; fromDictionary?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { words, saveWord, deleteWord, setWordFrozen } = useVocabulary();
  const [form, setForm] = useState<WordInput>({
    term: existing?.term ?? initial?.term ?? '',
    meaning: existing?.meaning ?? initial?.meaning ?? '',
    ipa: existing?.ipa ?? initial?.ipa ?? '',
    example: existing?.example ?? initial?.example ?? '',
    note: existing?.note ?? initial?.note ?? '',
  });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingFreeze, setChangingFreeze] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const conflict = !existing && submitError
    ? words.find((w) => normalizeTerm(w.term) === normalizeTerm(form.term))
    : undefined;
  const meaningRef = useRef<any>(null);

  const set = (k: keyof WordInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const termErr = touched && !form.term.trim() ? 'Hãy nhập từ tiếng Anh.' : undefined;
  const meaningErr = touched && !form.meaning.trim() ? 'Hãy nhập nghĩa tiếng Việt.' : undefined;

  const submit = async () => {
    if (busyRef.current) return;
    setTouched(true);
    setSubmitError(null);
    if (!form.term.trim() || !form.meaning.trim()) return;
    busyRef.current = true;
    setSaving(true);
    try {
      await saveWord(form, existing?.id);
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
    try {
      await deleteWord(existing.id);
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
    try {
      await setWordFrozen(existing.id, !existing.frozen);
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : 'Không thể đổi trạng thái đóng băng.');
    } finally {
      busyRef.current = false;
      setChangingFreeze(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Sửa từ' : 'Từ mới' }} />
      <KeyboardAwareScrollViewCompat
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPad, gap: 18 }}
        bottomOffset={24}
      >
        <View style={{ gap: 4 }}>
          <Text style={[styles.title, { color: c.foreground }]}>{existing ? 'Chỉnh lại trang này' : fromDictionary ? 'Xem lại trước khi lưu' : 'Ghi một từ vào sổ'}</Text>
          <Text style={[styles.sub, { color: c.mutedForeground }]}>
            {existing ? `Ghi lần đầu ngày ${formatDate(existing.createdAt)}` : fromDictionary ? 'Đã điền sẵn từ từ điển. Bạn có thể sửa mọi ô; chưa có gì được lưu.' : 'Chỉ từ và nghĩa là bắt buộc.'}
          </Text>
        </View>
        {existing ? (
          <View testID="word-srs-progress" style={{ backgroundColor: c.secondary, borderRadius: c.radius, padding: 14, gap: 6 }}>
            <Text style={[styles.label, { color: c.primary }]}>
              {existing.frozen ? 'Đã đóng băng — dừng ôn tập' : existing.completed ? 'Đã hoàn tất 6 cấp ôn' : `Cấp ôn hiện tại: ${existing.level} / 6`}
            </Text>
            <Text style={[styles.sub, { color: c.mutedForeground }]}>
              {existing.frozen ? 'Vẫn tra cứu được và vẫn tính vào tổng số từ đã lưu.' : existing.nextReviewOn
                ? `Hạn ôn: ${existing.nextReviewOn.split('-').reverse().join('/')}`
                : 'Không còn lịch ôn trong chu kỳ này.'}
            </Text>
            <Text style={[styles.sub, { color: c.mutedForeground }]}>
              Đã trả lời {existing.reviewCount} lần. Sửa nội dung không đặt lại tiến độ.
            </Text>
          </View>
        ) : (
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
        <Field testID="field-term" label="Từ tiếng Anh" required error={termErr} value={form.term} onChangeText={set('term')}
          autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => meaningRef.current?.focus()} editable={!saving} />
        <Field testID="field-meaning" ref={meaningRef} label="Nghĩa tiếng Việt" required error={meaningErr} value={form.meaning} onChangeText={set('meaning')} multiline editable={!saving} />
        <Field testID="field-ipa" label="Phiên âm IPA" value={form.ipa} onChangeText={set('ipa')} autoCapitalize="none" autoCorrect={false} editable={!saving} />
        <Field testID="field-example" label="Câu ví dụ" value={form.example} onChangeText={set('example')} multiline editable={!saving} />
        <Field testID="field-note" label="Ghi chú riêng" value={form.note} onChangeText={set('note')} multiline editable={!saving} />
        <Button testID="save" label={existing ? 'Lưu thay đổi' : 'Lưu vào sổ'} icon="check" onPress={submit} loading={saving} disabled={deleting || changingFreeze} />
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

  const duplicate = draft && !formShown ? words.find((w) => normalizeTerm(w.term) === normalizeTerm(draft.term)) : undefined;
  const decided = !!draft && !vocabLoading;
  useEffect(() => {
    if (decided && !duplicate && !vocabError && !formShown) setFormShown(true);
  }, [decided, duplicate, vocabError, formShown]);

  if (formShown && draft) return <WordForm key={`dict-${wordId}-${senseId}`} initial={draft} fromDictionary />;
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
      <Centered title="Đã có trong sổ">
        <EmptyState icon="book-open" title="Đã có trong sổ"
          body={`“${duplicate.term}” đã có trong sổ${duplicate.frozen ? ' (đang đóng băng)' : ''}. Trang cũ và tiến độ ôn được giữ nguyên.`}>
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
  err: { fontFamily: F.m, fontSize: 13 },
  hint: { fontFamily: F.r, fontSize: 13 },
});
