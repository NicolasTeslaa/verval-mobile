import React from 'react';
import { View } from 'react-native';
import { VictoryLegend, VictoryPie } from 'victory-native';

type Slice = { name: string; value: number };

export function ExpensesPieChart({ data }: { data: Slice[] }) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0) || 1;
  return (
    <View style={{ height: 260, flexDirection: 'row' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <VictoryPie
          data={data}
          x="name"
          y="value"
          innerRadius={55}
          labels={({ datum }) => `${Math.round((datum.value / total) * 100)}%`}
          padAngle={2}
          cornerRadius={3}
          style={{ labels: { fontSize: 11 } }}
        />
      </View>
      <View style={{ width: 140, justifyContent: 'center' }}>
        <VictoryLegend
          orientation="vertical"
          gutter={8}
          itemsPerRow={1}
          data={data.map((d) => ({ name: d.name }))}
          style={{ labels: { fontSize: 12 } }}
        />
      </View>
    </View>
  );
}
