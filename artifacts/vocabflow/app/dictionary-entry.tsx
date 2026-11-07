import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validDictionaryId } from '@/domain/dictionary';
import { useDictionary } from '@/hooks/useDictionary';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState } from '@/components/ui';
import { DictionaryGate } from '@/components/DictionaryGate';
import { DictionaryEntryView } from '@/components/DictionaryEntryView';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/dictionary');
}

/** Deep-link wrapper: /dictionary-entry?id=123 */
export default function DictionaryEntryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = (Platform.OS === 'web' ? 34 : insets.bottom) + 24;
  const params = useLocalSearchParams<{ id?: string }>();
  const raw = typeof params.id === 'string' ? params.id : '';
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  const valid = validDictionaryId(id);
  const dict = useDictionary();

  if (!valid) {
    return (
      <View style={[styles.center, { backgroundColor: c.dictPage }]}>
        <Stack.Screen options={{ title: 'Không hợp lệ' }} />
        <EmptyState icon="alert-triangle" title="Đường dẫn không hợp lệ" body="Mục từ này không tồn tại. Hãy quay lại và tra lại.">
          <Button testID="entry-invalid-back" label="Quay lại" icon="arrow-left" onPress={goBack} />
        </EmptyState>
      </View>
    );
  }
  if (!dict.ready) return <View style={{ flex: 1, backgroundColor: c.background }}><DictionaryGate stage={dict.stage} error={dict.error} retry={dict.retry} approveDownload={dict.approveDownload} /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.dictPage }}>
      <DictionaryEntryView id={id} bottomPad={bottomPad} onBack={goBack} />
    </View>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, justifyContent: 'center' } });
