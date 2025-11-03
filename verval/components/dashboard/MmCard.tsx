// src/components/dashboard/MmCard.tsx
import { currency, toneByValue } from '@/utils/format';
import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function MmCard({
  title, value, isCurrency, invert, locale, currencyCode,
}: {
  title: string;
  value: number | null;
  isCurrency?: boolean;
  invert?: boolean;
  locale?: string;
  currencyCode?: string;
}) {
  const tone = toneByValue(isCurrency ? value ?? 0 : (value ?? 0), { invert: !!invert });
  return (
    <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }}
      style={[s.cardThird, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{title}</Text>
        <Feather name="trending-up" size={16} color={tone.icon} />
      </View>
      <Text style={[s.mmValue, { color: tone.text }]}>
        {value == null ? '—' : isCurrency ? currency(value, locale!, currencyCode!) : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}
      </Text>
    </MotiView>
  );
}

const s = StyleSheet.create({
  cardThird: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  mmValue: { marginTop: 6, fontSize: 22, fontWeight: '800' },
});
