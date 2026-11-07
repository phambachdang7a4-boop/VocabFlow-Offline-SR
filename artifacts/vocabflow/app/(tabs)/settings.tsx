import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useColors } from '@/hooks/useColors';
import { ErrorBanner, F } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';

export default function SettingsScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const bottom = useBottomPad();

  const facts: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
    { icon: 'smartphone', title: 'Lưu trên thiết bị này', body: 'Sổ từ được lưu trong bộ nhớ cục bộ của ứng dụng trên máy bạn.' },
    { icon: 'wifi-off', title: 'Không cần mạng', body: 'Ứng dụng không gửi từ vựng của bạn lên máy chủ nào. Không có tài khoản, không đồng bộ.' },
    { icon: 'alert-triangle', title: 'Cần lưu ý', body: 'Gỡ cài đặt ứng dụng hoặc xoá dữ liệu ứng dụng sẽ xoá sổ từ. Hiện chưa có tính năng sao lưu.' },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="VocabFlow" title="Cài đặt" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom, gap: 16 }}>
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        <View style={[styles.stat, { backgroundColor: c.primary, borderRadius: c.radius + 6 }]}>
          <Text style={[styles.statLabel, { color: c.accentSoft }]}>SỐ TỪ ĐÃ LƯU</Text>
          <Text style={[styles.statNum, { color: c.primaryForeground }]}>{loading && words.length === 0 ? '—' : words.length}</Text>
          <Text style={[styles.statSub, { color: c.primaryForeground }]}>từ trong sổ của bạn</Text>
        </View>
        <Text style={[styles.section, { color: c.mutedForeground }]}>DỮ LIỆU CỦA BẠN</Text>
        <View style={[styles.group, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius }]}>
          {facts.map((f, i) => (
            <View key={f.title} style={[styles.fact, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
              <View style={[styles.factIcon, { backgroundColor: c.secondary }]}>
                <Feather name={f.icon} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.factTitle, { color: c.foreground }]}>{f.title}</Text>
                <Text style={[styles.factBody, { color: c.mutedForeground }]}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stat: { padding: 22, gap: 2 },
  statLabel: { fontFamily: F.b, fontSize: 11, letterSpacing: 2 },
  statNum: { fontFamily: F.b, fontSize: 56, letterSpacing: -2 },
  statSub: { fontFamily: F.m, fontSize: 14, opacity: 0.85 },
  section: { fontFamily: F.b, fontSize: 12, letterSpacing: 1.6, marginTop: 6 },
  group: { borderWidth: 1 },
  fact: { flexDirection: 'row', gap: 14, padding: 16 },
  factIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  factTitle: { fontFamily: F.s, fontSize: 15 },
  factBody: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
});
