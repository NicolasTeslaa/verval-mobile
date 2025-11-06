import React from 'react';
import { View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryTheme } from 'victory-native';

type Item = { categoria: string; total: number };

export function TopCategoriesChart({ title, data }: { title: string; data: Item[] }) {
  // Victory não tem horizontal stacked simples com labels truncados,
  // então inverto e deixo margem à esquerda maior.
  const plot = [...data].reverse();
  return (
    <View style={{ height: 240 }}>
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={{ x: [24, 24], y: 16 }}
        padding={{ top: 16, bottom: 32, left: 120, right: 16 }}
      >
        <VictoryAxis
          dependentAxis
          tickFormat={(t) => t}
          style={{ tickLabels: { fontSize: 10 } }}
        />
        <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
        <VictoryBar
          horizontal
          data={plot}
          x="categoria"
          y="total"
          barRatio={0.8}
          cornerRadius={{ top: 4, bottom: 4 }}
        />
      </VictoryChart>
    </View>
  );
}
