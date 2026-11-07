import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DICTIONARY, type DictionaryStage } from '@/domain/dictionary';
import { useColors } from '@/hooks/useColors';
import { Button, ErrorBanner, F } from './ui';

const STAGE_TEXT: Record<DictionaryStage, string> = {
  checking: 'Đang kiểm tra kho từ điển trên máy…',
  'awaiting-consent': 'Tải kho từ điển về máy?',
  downloading: `Đang tải kho từ điển (${(DICTIONARY.bytes / 1048576).toFixed(1)} MiB). Chỉ tải một lần, cần có mạng.`,
  verifying: 'Đang kiểm tra tính toàn vẹn của tệp…',
  ready: 'Sẵn sàng tra cứu ngoại tuyến.',
};

export function DictionaryGate({ stage, error, retry, approveDownload }: { stage: DictionaryStage; error: string | null; retry: () => void; approveDownload: () => void }) {
  const c = useColors();
  const needsConsent = stage === 'awaiting-consent';
  return (
    <View style={{ padding: 20, gap: 14 }} testID="dictionary-gate">
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
              <Button testID="dictionary-approve-download" label="Đồng ý tải" icon="download" onPress={approveDownload} />
              <Button testID="dictionary-download-later" label="Để sau" variant="ghost" onPress={() => router.replace('/')} />
            </>
          ) : null}
        </View>
      ) : null}
      {error && !needsConsent ? <Button testID="dictionary-retry" label="Kiểm tra lại" icon="refresh-cw" onPress={retry} /> : null}
    </View>
  );
}
