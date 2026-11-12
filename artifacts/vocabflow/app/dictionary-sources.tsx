import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DICTIONARY } from '@/domain/dictionary';
import {
  REGIONAL_IPA_ATTRIBUTION,
  REGIONAL_IPA_DICTIONARY,
} from '@/domain/regional-pronunciations';
import { useColors } from '@/hooks/useColors';
import { F } from '@/components/ui';
import notices from '@/assets/dictionary-notices.json';

function Block({ title, body, testID }: { title: string; body: string; testID: string }) {
  const c = useColors();
  return (
    <View testID={testID} style={[styles.block, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius }]}>
      <Text style={[styles.h, { color: c.foreground }]}>{title}</Text>
      <Text style={[styles.raw, { color: c.foreground }]} selectable>{body}</Text>
    </View>
  );
}

export default function DictionarySourcesScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const n = notices as { license: string; attribution: string; upstreamLicense: string };
  const row = (k: string, v: string) => (
    <View style={styles.kv} key={k}>
      <Text style={[styles.k, { color: c.mutedForeground }]}>{k}</Text>
      <Text style={[styles.v, { color: c.foreground }]} selectable>{v}</Text>
    </View>
  );
  return (
    <ScrollView testID="sources-scroll" style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 }}>
      <View style={{ gap: 6 }}>
        <Text style={[styles.title, { color: c.foreground }]}>Nguồn từ điển</Text>
        <Text style={[styles.p, { color: c.mutedForeground }]}>
          Nghĩa tiếng Việt lấy từ Skypedia English–Vietnamese Dictionary; IPA Anh-Mỹ/Anh-Anh bổ sung từ ipa-dict. Trang này hiển thị thông tin nguồn và giấy phép để đối chiếu.
        </Text>
      </View>
      <View style={[styles.block, { backgroundColor: c.secondary, borderColor: c.secondary, borderRadius: c.radius }]}>
        {row('Kho mã', DICTIONARY.repository)}
        {row('Phiên bản (commit)', DICTIONARY.commit)}
        {row('Số mục từ', DICTIONARY.wordCount.toLocaleString('vi-VN'))}
        {row('Số nghĩa', DICTIONARY.definitionCount.toLocaleString('vi-VN'))}
        {row('SHA-256', DICTIONARY.sha256)}
      </View>
      <View style={[styles.block, { backgroundColor: c.accentSoft, borderColor: c.accentSoft, borderRadius: c.radius }]}>
        <Text style={[styles.h, { color: c.foreground }]}>Lưu ý về giấy phép</Text>
        <Text style={[styles.p, { color: c.foreground }]}>
          Skypedia công bố kho dữ liệu theo CC BY-SA 4.0 và ghi nguồn tham khảo OVDP theo GPLv2. Kho upstream MinhQND có tệp LICENSE ghi MIT trong khi README dẫn CC BY-SA. VocabFlow chưa khẳng định quyền phân phối lại đã được làm rõ hoàn toàn; các văn bản bên dưới được giữ nguyên để đối chiếu.
        </Text>
        <Text style={[styles.p, { color: c.foreground }]}>
          VocabFlow chỉ thêm chỉ mục tìm kiếm và dấu hoàn tất khởi tạo trên máy; nội dung từ điển không bị sửa. Câu ví dụ được tạo tự động theo mô tả của nguồn và có thể chưa chính xác.
        </Text>
      </View>
      <Block testID="sources-attribution" title="Ghi công (nguyên văn)" body={n.attribution} />
      <Block testID="sources-license" title="Giấy phép (nguyên văn)" body={n.license} />
      <Block testID="sources-upstream-license" title="Tệp LICENSE của MinhQND (nguyên văn)" body={n.upstreamLicense} />
      <View style={[styles.block, { backgroundColor: c.secondary, borderColor: c.border, borderRadius: c.radius }]}>
        {row('Kho IPA', REGIONAL_IPA_DICTIONARY.repository)}
        {row('Phiên bản commit', REGIONAL_IPA_DICTIONARY.commit)}
        {row('IPA Anh-Mỹ', `MIT · SHA-256 ${REGIONAL_IPA_DICTIONARY.us.sha256}`)}
        {row('IPA Anh-Anh', `GPL-3.0 · SHA-256 ${REGIONAL_IPA_DICTIONARY.uk.sha256}`)}
      </View>
      <Block
        testID="sources-regional-ipa"
        title="Ghi công và giấy phép IPA"
        body={REGIONAL_IPA_ATTRIBUTION}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: F.b, fontSize: 24, letterSpacing: -0.4 },
  p: { fontFamily: F.r, fontSize: 14, lineHeight: 21 },
  block: { padding: 16, gap: 10, borderWidth: 1 },
  h: { fontFamily: F.s, fontSize: 15 },
  raw: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12.5, lineHeight: 19 },
  kv: { gap: 2 },
  k: { fontFamily: F.s, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  v: { fontFamily: F.m, fontSize: 14 },
});
