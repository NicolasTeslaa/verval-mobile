import React from 'react';
import { View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryGroup, VictoryLegend, VictoryTheme } from 'victory-native';

type Item = { mes: string; Entradas: number; Saidas: number };

export function MonthlyTrendChart({ data }: { data: Item[] }) {
  return (
    <View style={{ height: 260 }}>
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={{ x: 24, y: 8 }}
        padding={{ top: 16, bottom: 40, left: 56, right: 16 }}
      >
        <VictoryLegend
          x={56}
          orientation="horizontal"
          gutter={20}
          data={[
            { name: 'Entradas' },
            { name: 'Saídas' },
          ]}
          style={{ labels: { fontSize: 12 } }}
        />
        <VictoryAxis tickFormat={(t) => t} style={{ tickLabels: { fontSize: 10 } }} />
        <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
        <VictoryGroup offset={14}>
          <VictoryBar
            data={data}
            x="mes"
            y="Entradas"
            cornerRadius={{ top: 4 }}
            barWidth={12}
          />
          <VictoryBar
            data={data}
            x="mes"
            y="Saidas"
            cornerRadius={{ top: 4 }}
            barWidth={12}
          />
        </VictoryGroup>
      </VictoryChart>
    </View>
  );
}
