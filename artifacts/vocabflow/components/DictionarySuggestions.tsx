import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { type DictionarySuggestion } from '@/domain/dictionary';
import { useColors } from '@/hooks/useColors';
import { Button, F } from '@/components/ui';

type Props = { items: DictionarySuggestion[]; onPick: (s: DictionarySuggestion) => void; bottomPad: number; onAddManual?: () => void };

export function DictionarySuggestions({ items, onPick, bottomPad, onAddManual }: Props) {
  const c = useColors();
  return (
    <ScrollView testID="dictionary-suggestions" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: bottomPad + 16 }}>
      <Text style={[styles.ask, { color: c.dictInk }]}>Có phải bạn đang tìm từ này?</Text>
      {items.map((s) => (
        <Pressable key={s.id} testID={`dictionary-suggestion-${s.id}`} accessibilityRole="link"
          accessibilityLabel={`Tra từ ${s.term}`} onPress={() => onPick(s)} hitSlop={6}
          style={({ pressed }) => [styles.item, { opacity: pressed ? 0.55 : 1 }]}>
          <Text style={[styles.word, { color: c.dictSuggest, borderBottomColor: c.dictSuggest }]}>{s.term}</Text>
        </Pressable>
      ))}
      {onAddManual ? <Button testID="dictionary-add-manual" label="Tự ghi từ mới" variant="ghost" icon="edit-3"
        style={{ marginTop: 20 }} onPress={onAddManual} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ask: { fontFamily: F.m, fontStyle: 'italic', fontSize: 18, marginBottom: 14 },
  item: { alignSelf: 'flex-start', paddingVertical: 9 },
  word: { fontFamily: F.s, fontSize: 17, paddingBottom: 2, borderBottomWidth: 1.5 },
});
