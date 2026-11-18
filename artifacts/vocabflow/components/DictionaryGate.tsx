import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DICTIONARY, type DictionaryStage } from '@/domain/dictionary';
import { useColors } from '@/hooks/useColors';
import { Button, ErrorBanner, F } from './ui';
import { useBottomPad } from './ScreenHeader';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { soundCueFor, withSoundLoop } from '@/domain/sound-cues';

const DICTIONARY_LOOP_KEY = 'dictionary-download-import';

const STAGE_TEXT: Record<DictionaryStage, string> = {
  checking: 'Đang kiểm tra kho từ điển trên máy…',
  'awaiting-consent': 'Tải kho từ điển về máy?',
  downloading: `Đang tải kho từ điển (${(DICTIONARY.bytes / 1048576).toFixed(1)} MiB). Chỉ tải một lần, cần có mạng.`,
  verifying: 'Đang kiểm tra tính toàn vẹn của tệp…',
  importing: 'Đã tải xong. Đang nhập từ điển vào SQLite trên máy…',
  'indexing-courses': 'Đang thêm từ và nhãn của các khóa học vào từ điển…',
  ready: 'Sẵn sàng tra cứu ngoại tuyến.',
};

export function DictionaryGate({ stage, error, retry, approveDownload }: { stage: DictionaryStage; error: string | null; retry: () => void; approveDownload: () => Promise<boolean> }) {
  const c = useColors();
  const bottom = useBottomPad();
  const sound = useSoundEffects();
  const mounted = useRef(true);
  const approving = useRef(false);
  const needsConsent = stage === 'awaiting-consent';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sound.stopLoop(DICTIONARY_LOOP_KEY);
    };
  }, [sound.stopLoop]);

  const startDownload = () => {
    if (approving.current) return;
    approving.current = true;
    sound.unlockFromGesture();
  void withSoundLoop(
      () => sound.startLoop(DICTIONARY_LOOP_KEY, soundCueFor('dictionaryProcessing')),
      approveDownload,
      () => sound.stopLoop(DICTIONARY_LOOP_KEY),
    ).then(completed => {
      if (mounted.current) sound.play(soundCueFor(completed ? 'dictionaryReady' : 'dictionaryFailed'));
    }).catch(() => {
      if (mounted.current) sound.play(soundCueFor('dictionaryFailed'));
    }).finally(() => {
      approving.current = false;
    });
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: bottom, gap: 14 }}
      keyboardShouldPersistTaps="handled" testID="dictionary-gate">
      {error ? <ErrorBanner message={error} /> : null}
      {needsConsent || !error ? (
        <View style={{ padding: 16, gap: 10, borderWidth: 1, backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {!needsConsent ? <ActivityIndicator color={c.primary} /> : null}
            <Text style={{ flex: 1, fontFamily: F.s, fontSize: 15, lineHeight: 21, color: c.foreground }}>{STAGE_TEXT[stage]}</Text>
          </View>
          <Text style={{ fontFamily: F.r, fontSize: 14, lineHeight: 20, color: c.mutedForeground }}>
            Lần đầu cần có mạng và đủ dung lượng trống để nạp {DICTIONARY.wordCount.toLocaleString('vi-VN')} mục từ. Sau đó tra cứu trên máy, không gửi từ bạn tra đi đâu.
          </Text>
          {needsConsent ? (
            <>
              <Text testID="dictionary-mobile-data-warning" style={{ fontFamily: F.s, fontSize: 14, lineHeight: 21, color: c.foreground }}>
                Dung lượng tải: 42,2 MiB (khoảng 44,2 MB). Nếu dùng dữ liệu di động 3G/4G/5G, có thể phát sinh cước. Nên chuyển sang Wi-Fi trước khi tải.
              </Text>
              <Text style={{ fontFamily: F.r, fontSize: 14, lineHeight: 20, color: c.mutedForeground }}>App chỉ tải sau khi bạn đồng ý, kể cả khi không xác định được loại mạng.</Text>
              <Button testID="dictionary-approve-download" label="Đồng ý tải" icon="download" onPress={startDownload} />
              <Button testID="dictionary-download-later" label="Để sau" variant="ghost" onPress={() => router.replace('/')} />
            </>
          ) : null}
        </View>
      ) : null}
      {error && !needsConsent ? <Button testID="dictionary-retry" label="Kiểm tra lại" icon="refresh-cw" onPress={retry} /> : null}
    </ScrollView>
  );
}
