import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { DICTIONARY, type DictionaryStage } from '@/domain/dictionary';
import { useColors } from '@/hooks/useColors';
import { Button, ErrorBanner, F } from './ui';

const STAGE_TEXT: Record<DictionaryStage, string> = {
  checking: 'Đang kiểm tra kho từ điển trên máy…',
  downloading: `Đang tải kho từ điển (${(DICTIONARY.bytes / 1048576).toFixed(1)} MiB). Chỉ tải một lần, cần có mạng.`,
  verifying: 'Đang kiểm tra tính toàn vẹn của tệp…',
  ready: 'Sẵn sàng tra cứu ngoại tuyến.',
};

export function DictionaryGate({ stage, error, retry }: { stage: DictionaryStage; error: string | null; retry: () => void }) {
  const c = useColors();
  return (
    <View style={{ padding: 20, gap: 14 }} testID="dictionary-gate">
      {error ? <ErrorBanner message={error} /> : (
        <View style={{ padding: 16, gap: 10, borderWidth: 1, backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ flex: 1, fontFamily: F.s, fontSize: 15, lineHeight: 21, color: c.foreground }}>{STAGE_TEXT[stage]}</Text>
          </View>
          <Text style={{ fontFamily: F.r, fontSize: 14, lineHeight: 20, color: c.mutedForeground }}>
            Lần đầu cần có mạng và đủ dung lượng trống để nạp {DICTIONARY.wordCount.toLocaleString('vi-VN')} mục từ. Sau đó tra cứu trên máy, không gửi từ bạn tra đi đâu.
          </Text>
        </View>
      )}
      {error ? <Button testID="dictionary-retry" label="Thử tải lại" icon="refresh-cw" onPress={retry} /> : null}
    </View>
  );
}
