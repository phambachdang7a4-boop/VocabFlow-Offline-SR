import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export const F = {
  r: 'Inter_400Regular',
  m: 'Inter_500Medium',
  s: 'Inter_600SemiBold',
  b: 'Inter_700Bold',
} as const;

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'accent';
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style, testID }: BtnProps) {
  const c = useColors();
  const bg = { primary: c.button, accent: c.accent, danger: c.destructive, ghost: 'transparent' }[variant];
  const fg = { primary: c.buttonForeground, accent: c.accentForeground, danger: c.destructiveForeground, ghost: c.primary }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderRadius: c.radius, borderColor: variant === 'ghost' ? c.border : bg },
        { opacity: off ? 0.55 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Feather name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function ConfirmDialog({
  visible, title, message, confirmLabel, onCancel, onConfirm, busy,
}: { visible: boolean; title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void; busy?: boolean }) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={busy ? undefined : onCancel}>
        <Pressable style={[styles.dialog, { backgroundColor: c.card, borderRadius: c.radius + 6 }]} onPress={() => {}}>
          <View style={[styles.dialogIcon, { backgroundColor: c.destructiveSoft }]}>
            <Feather name="trash-2" size={20} color={c.destructive} />
          </View>
          <Text style={[styles.dialogTitle, { color: c.foreground }]}>{title}</Text>
          <Text style={[styles.dialogMsg, { color: c.mutedForeground }]}>{message}</Text>
          <View style={styles.dialogRow}>
            <Button label="Huỷ" variant="ghost" onPress={onCancel} disabled={busy} style={{ flex: 1 }} testID="confirm-cancel" />
            <Button label={confirmLabel} variant="danger" onPress={onConfirm} loading={busy} style={{ flex: 1 }} testID="confirm-ok" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; children?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyRing, { borderColor: c.border }]}>
        <View style={[styles.emptyDot, { backgroundColor: c.secondary }]}>
          <Feather name={icon} size={28} color={c.primary} />
        </View>
      </View>
      <Text style={[styles.emptyTitle, { color: c.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: c.mutedForeground }]}>{body}</Text>
      {children}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.banner, { backgroundColor: c.destructiveSoft, borderRadius: c.radius }]}>
      <Feather name="alert-circle" size={18} color={c.destructive} />
      <Text style={[styles.bannerText, { color: c.destructiveText }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.bannerAction, { color: c.destructiveText }]}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Skeleton({ h = 72 }: { h?: number }) {
  const c = useColors();
  return <View style={{ height: h, borderRadius: c.radius, backgroundColor: c.muted, marginBottom: 10 }} />;
}

const styles = StyleSheet.create({
  btn: { minHeight: 50, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  btnText: { fontFamily: F.s, fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  dialog: { padding: 22, gap: 8 },
  dialogIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dialogTitle: { fontFamily: F.b, fontSize: 19 },
  dialogMsg: { fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  dialogRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 10 },
  emptyRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyDot: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: F.b, fontSize: 20, textAlign: 'center' },
  emptyBody: { fontFamily: F.r, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 10 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  bannerText: { flex: 1, fontFamily: F.m, fontSize: 14, lineHeight: 20 },
  bannerAction: { fontFamily: F.b, fontSize: 14 },
});
