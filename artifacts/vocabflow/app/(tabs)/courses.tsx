import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { F } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function CoursesScreen() {
  const c = useColors();
  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="VocabFlow" title="Khóa Học" />
      <Text testID="courses-empty" style={[styles.note, { color: c.mutedForeground }]}>Chưa có khóa học nào</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { paddingHorizontal: 20, fontFamily: F.m, fontSize: 15 },
});
