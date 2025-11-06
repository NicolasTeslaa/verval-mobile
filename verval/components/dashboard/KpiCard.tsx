// src/components/dashboard/KpiCard.tsx
import { currency, toneByValue } from '@/utils/format';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function KpiCard({
  title, value, locale, currencyCode, delta, trend,
}: {
  title: string;
  value: number;
  locale: string;
  currencyCode: string;
  delta?: number | null;
  trend?: number[];
}) {
  const tone = toneByValue(value);
  const deltaTone = toneByValue(delta ?? 0);
  return (
    <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }}
      style={[s.cardHalf, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      <Text style={[s.kpiValue, { color: tone.text }]}>{currency(value, locale, currencyCode)}</Text>
    </MotiView>
  );
}

const s = StyleSheet.create({
  cardHalf: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  deltaChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  deltaText: { marginLeft: 4, fontSize: 12, fontWeight: '700' },
  kpiValue: { marginTop: 6, fontSize: 20, fontWeight: '800' },
});
