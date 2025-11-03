// src/components/dashboard/ChartCard.tsx
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} style={s.chartCard}>
      <Text style={s.chartTitle}>{title}</Text>
      {!!subtitle && <Text style={s.chartSubtitle}>{subtitle}</Text>}
      <View style={{ marginTop: 8 }}>{children}</View>
    </MotiView>
  );
}

const s = StyleSheet.create({
  chartCard: { marginTop: 14, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  chartTitle: { fontSize: 16, color: '#111827', fontWeight: '700' },
  chartSubtitle: { marginTop: 2, fontSize: 12, color: '#6B7280' },
});
