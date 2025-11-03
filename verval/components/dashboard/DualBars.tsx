// src/components/dashboard/DualBars.tsx
import { currency, short } from '@/utils/format';
import React, { useState } from 'react';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

export type DualPoint = { label: string; entradas: number; saidas: number };

export function DualBars({
  data,
  width = 360,
  height = 260,
  locale,
  currencyCode,
  labelIn,
  labelOut,
}: {
  data: DualPoint[];
  width?: number;
  height?: number;
  locale: string;
  currencyCode: string;
  labelIn: string;
  labelOut: string;
}) {
  const margin = { top: 24, right: 12, bottom: 44, left: 48 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;
  const maxVal = Math.max(1, ...data.flatMap(d => [d.entradas, d.saidas]));
  const step = data.length ? iw / data.length : iw;
  const groupW = step * 0.7;
  const innerGap = 6;
  const barW = (groupW - innerGap) / 2;
  const ticks = 4;
  const yTickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxVal / ticks) * i));

  const [tip, setTip] = useState<{ x: number; y: number; value: number; label: string; color: string } | null>(null);

  const colorIn = '#2563EB';
  const colorOut = '#F43F5E';
  const fmt = (n: number) => currency(n, locale, currencyCode);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* legenda */}
      <G x={margin.left} y={8}>
        <Rect x={0} y={0} width={12} height={12} rx={2} fill={colorIn} />
        <SvgText x={18} y={10} fontSize={11} fill="#374151">{labelIn}</SvgText>
        <Rect x={90} y={0} width={12} height={12} rx={2} fill={colorOut} />
        <SvgText x={108} y={10} fontSize={11} fill="#374151">{labelOut}</SvgText>
      </G>

      <G x={margin.left} y={margin.top}>
        {yTickValues.map((tv, i) => {
          const y = ih - (tv / maxVal) * ih;
          return (
            <G key={`grid-${i}`}>
              <Line x1={0} y1={y} x2={iw} y2={y} stroke="#E5E7EB" strokeWidth={1} />
              <SvgText x={-8} y={y} fontSize={10} fill="#6B7280" textAnchor="end" alignmentBaseline="middle">
                {short(tv)}
              </SvgText>
            </G>
          );
        })}

        {data.map((d, idx) => {
          const baseX = step * idx + (step - groupW) / 2;

          const hIn = (d.entradas / maxVal) * ih;
          const yIn = ih - hIn;
          const xIn = baseX;

          const hOut = (d.saidas / maxVal) * ih;
          const yOut = ih - hOut;
          const xOut = baseX + barW + innerGap;

          return (
            <G key={`g-${idx}`}>
              <Rect
                x={xIn}
                y={yIn}
                width={barW}
                height={hIn}
                rx={4}
                fill={colorIn}
                onPressIn={() => setTip({ x: margin.left + xIn + barW / 2, y: margin.top + yIn - 8, value: d.entradas, label: `${d.label} · ${labelIn}`, color: colorIn })}
              />
              <Rect
                x={xOut}
                y={yOut}
                width={barW}
                height={hOut}
                rx={4}
                fill={colorOut}
                onPressIn={() => setTip({ x: margin.left + xOut + barW / 2, y: margin.top + yOut - 8, value: d.saidas, label: `${d.label} · ${labelOut}`, color: colorOut })}
              />
              <SvgText x={baseX + groupW / 2} y={ih + 18} fontSize={10} fill="#6B7280" textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </G>

      {tip && (() => {
        const pad = 8;
        const boxW = Math.max(80, tip.label.length * 6);
        const boxH = 34;
        const x = Math.min(Math.max(tip.x - boxW / 2, pad), width - boxW - pad);
        const y = Math.max(tip.y - boxH, 20);
        return (
          <G>
            <G x={x} y={y}>
              <Rect width={boxW} height={boxH} rx={8} fill="#111827" opacity={0.95} />
              <SvgText x={8} y={14} fontSize={10} fill="#E5E7EB">{tip.label}</SvgText>
              <SvgText x={8} y={28} fontSize={12} fill="#FFFFFF" fontWeight="bold">{fmt(tip.value)}</SvgText>
              <Rect x={boxW - 10} y={6} width={6} height={6} rx={1} fill={tip.color} />
            </G>
            <Rect x={0} y={0} width={width} height={height} fill="transparent" onPressIn={() => setTip(null)} />
          </G>
        );
      })()}
    </Svg>
  );
}
