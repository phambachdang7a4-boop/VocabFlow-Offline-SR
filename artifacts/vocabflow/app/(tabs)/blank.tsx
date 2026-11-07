import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function BlankScreen() {
  const c = useColors();
  return (
    <View testID="blank-screen" style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="VocabFlow" title="Trống" />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
