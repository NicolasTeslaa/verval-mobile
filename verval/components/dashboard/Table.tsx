// src/components/dashboard/Table.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function ListHeader({ cols }: { cols: string[] }) {
  return (
    <View style={[s.row, s.rowHeader]}>
      {cols.map((c, i) => (
        <Text key={i} style={[s.cell, i === 0 ? s.cellStart : s.cellEnd, s.cellHeader]}>{c}</Text>
      ))}
    </View>
  );
}

export function ListRow({ cols }: { cols: (string | number)[] }) {
  return (
    <View style={s.row}>
      {cols.map((c, i) => (
        <Text key={i} style={[s.cell, i === 0 ? s.cellStart : s.cellEnd]}>{String(c)}</Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowHeader: { borderBottomColor: '#E5E7EB' },
  cell: { flex: 1, fontSize: 13, color: '#111827' },
  cellStart: { textAlign: 'left', fontWeight: '600' },
  cellEnd: { textAlign: 'right' },
  cellHeader: { color: '#6B7280', fontWeight: '700' },
});
