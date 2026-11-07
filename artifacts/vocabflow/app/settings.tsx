import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useColors } from '@/hooks/useColors';
import { Button, ErrorBanner, F } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppearance, type AppearanceMode } from '@/contexts/AppearanceContext';

export default function SettingsScreen() {
  const c = useColors();
  const { words, frozenWords, loading, error, reload } = useVocabulary();
  const appearance = useAppearance();
  const insets = useSafeAreaInsets();
  const bottom = (Platform.OS === 'web' ? 34 : insets.bottom) + 24;

  const facts: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
    { icon: 'smartphone', title: 'Lưu trên thiết bị này', body: 'Sổ từ được lưu trong bộ nhớ cục bộ của ứng dụng trên máy bạn.' },
    { icon: 'wifi-off', title: 'Không cần mạng', body: 'Ứng dụng không gửi từ vựng của bạn lên máy chủ nào. Không có tài khoản, không đồng bộ.' },
    { icon: 'alert-triangle', title: 'Cần lưu ý', body: 'Gỡ cài đặt ứng dụng hoặc xoá dữ liệu ứng dụng sẽ xoá sổ từ. Hiện chưa có tính năng sao lưu.' },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: bottom, gap: 16 }}>
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        <Text style={[styles.section, { color: c.mutedForeground }]}>GIAO DIỆN</Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>Bản sáng là mặc định. Lựa chọn áp dụng cho toàn bộ ứng dụng và được lưu trên thiết bị.</Text>
        <View style={[styles.appearanceGroup, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius }]}>
          {([
            { mode: 'light' as AppearanceMode, title: 'Sáng', detail: 'Kem giấy · navy · vàng kính', icon: 'sun' as const },
            { mode: 'dark' as AppearanceMode, title: 'Tối', detail: 'Xanh đen · navy · vàng', icon: 'moon' as const },
          ]).map(option => {
            const selected = appearance.mode === option.mode;
            return (
              <Pressable key={option.mode} testID={`appearance-${option.mode}`} accessibilityRole="radio"
                accessibilityLabel={`Giao diện ${option.title}`}
                accessibilityState={{ checked: selected, disabled: appearance.loading || appearance.saving }}
                disabled={appearance.loading || appearance.saving}
                onPress={() => { void appearance.setMode(option.mode); }}
                style={({ pressed }) => [styles.appearanceOption, {
                  backgroundColor: selected ? c.button : c.headerButton,
                  borderColor: selected ? c.button : c.navigationBorder,
                  opacity: pressed ? 0.75 : appearance.loading || appearance.saving ? 0.55 : 1,
                }]}>
                <Feather name={option.icon} size={19} color={selected ? c.buttonForeground : c.headerForeground} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.appearanceTitle, { color: selected ? c.buttonForeground : c.headerForeground }]}>{option.title}</Text>
                  <Text style={[styles.appearanceDetail, { color: selected ? c.buttonForeground : c.headerMuted }]}>{option.detail}</Text>
                </View>
                {selected ? <Feather name="check-circle" size={19} color={c.buttonForeground} /> : null}
              </Pressable>
            );
          })}
        </View>
        {appearance.error ? <ErrorBanner message={appearance.error} onRetry={() => { void appearance.retryLoad(); }} /> : null}
        {appearance.loading ? <Text accessibilityLiveRegion="polite" style={[styles.appearanceHint, { color: c.mutedForeground }]}>Đang tải lựa chọn giao diện…</Text> : null}
        {appearance.saving ? <Text accessibilityLiveRegion="polite" style={[styles.appearanceHint, { color: c.mutedForeground }]}>Đang lưu giao diện…</Text> : null}
        <View style={[styles.stat, { backgroundColor: c.vocabCard, borderRadius: c.radius + 6 }]}>
          <Text style={[styles.statLabel, { color: c.accentSoft }]}>SỐ TỪ ĐÃ LƯU</Text>
          <Text style={[styles.statNum, { color: c.primaryForeground }]}>{loading && words.length === 0 ? '—' : words.length}</Text>
          <Text style={[styles.statSub, { color: c.primaryForeground }]}>từ trong sổ của bạn</Text>
        </View>
        <Button testID="open-frozen-words" label={`Từ đã đóng băng (${frozenWords.length})`} icon="pause-circle"
          variant="ghost" onPress={() => router.push('/frozen')} />
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
  appearanceHint: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  appearanceGroup: { borderWidth: 1, padding: 10, gap: 10 },
  appearanceOption: { minHeight: 66, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  appearanceTitle: { fontFamily: F.b, fontSize: 16 },
  appearanceDetail: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  group: { borderWidth: 1 },
  fact: { flexDirection: 'row', gap: 14, padding: 16 },
  factIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  factTitle: { fontFamily: F.s, fontSize: 15 },
  factBody: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
});
