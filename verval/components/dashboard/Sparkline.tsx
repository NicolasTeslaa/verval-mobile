// src/components/dashboard/Sparkline.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function Sparkline({ values, width = 100, height = 32, stroke = '#111827' }: {
  values: number[]; width?: number; height?: number; stroke?: string;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const norm = (v: number) => max === min ? 0.5 : (v - min) / (max - min);
  let d = '';
  values.forEach((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * w;
    const y = pad + (1 - norm(v)) * h;
    d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });
  return (
    <Svg width={width} height={height}>
      <Path d={d} fill="none" stroke={stroke} strokeWidth={2} />
    </Svg>
  );
}
