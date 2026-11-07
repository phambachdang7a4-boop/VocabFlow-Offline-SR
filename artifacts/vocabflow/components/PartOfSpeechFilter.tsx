import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DICTIONARY_PARTS, type DictionaryPartOfSpeech } from '@/domain/dictionary';
import { useColors } from '@/hooks/useColors';
import { F } from '@/components/ui';

/** Compact collapsible checklist. Empty selection means all parts of speech. */
export function PartOfSpeechFilter({ available, selected, onChange }: {
  available: DictionaryPartOfSpeech[] | null;
  selected: DictionaryPartOfSpeech[];
  onChange: (next: DictionaryPartOfSpeech[]) => void;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const options = [...DICTIONARY_PARTS].sort((a, b) => {
    const first = available?.indexOf(a.id) ?? -1;
    const second = available?.indexOf(b.id) ?? -1;
    return (first < 0 ? 99 : first) - (second < 0 ? 99 : second);
  });
  const summary = selected.length === 0
    ? 'Tất cả'
    : options.filter((p) => selected.includes(p.id)).map((p) => p.label).join(', ');

  const toggle = (id: DictionaryPartOfSpeech) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : options.map((p) => p.id).filter((p) => p === id || selected.includes(p)));
  };

  const box = (checked: boolean, disabled: boolean) => (
    <View style={[styles.box, { borderColor: disabled ? c.dictLine : c.dictHead, backgroundColor: checked ? c.dictHead : c.dictPage }]}>
      {checked ? <Feather name="check" size={13} color={c.dictPage} /> : null}
    </View>
  );

  return (
    <View testID="entry-pos-filter" style={[styles.wrap, { backgroundColor: c.dictPage, borderBottomColor: c.dictLine }]}>
      <Pressable testID="entry-pos-toggle" accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`Từ loại: ${summary}`} onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.bar, { backgroundColor: c.dictChip, opacity: pressed ? 0.75 : 1 }]}>
        <Feather name="filter" size={14} color={c.dictHead} />
        <Text style={[styles.barText, { color: c.dictHead }]} numberOfLines={1}>
          Từ loại: <Text style={{ fontFamily: F.r }}>{summary}</Text>
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.dictHead} />
      </Pressable>
      {open ? (
        <View style={styles.options}>
          <Pressable testID="entry-pos-all" accessibilityRole="checkbox" accessibilityState={{ checked: selected.length === 0 }}
            accessibilityLabel="Tất cả" onPress={() => onChange([])} style={styles.opt} hitSlop={4}>
            {box(selected.length === 0, false)}
            <Text style={[styles.optText, { color: c.dictInk }]}>Tất cả</Text>
          </Pressable>
          {options.map((p) => {
            const checked = selected.includes(p.id);
            const disabled = !checked && available !== null && !available.includes(p.id);
            return (
              <Pressable key={p.id} testID={`entry-pos-${p.id}`} accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }} accessibilityLabel={p.label} disabled={disabled}
                onPress={() => toggle(p.id)} style={[styles.opt, { opacity: disabled ? 0.4 : 1 }]} hitSlop={4}>
                {box(checked, disabled)}
                <Text style={[styles.optText, { color: c.dictInk }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 38, paddingHorizontal: 12, borderRadius: 19 },
  barText: { flex: 1, fontFamily: F.s, fontSize: 14 },
  options: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, minWidth: 96 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  optText: { fontFamily: F.s, fontSize: 14 },
});
