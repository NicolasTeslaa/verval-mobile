// src/constants/Colors.ts
const tintColorLight = '#2563eb';
const tintColorDark  = '#60a5fa';

export default {
  light: {
    // legado (React Navigation Tabs etc.)
    text: '#0f172a',
    background: '#f8fafc',
    tint: tintColorLight,
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,

    // semântico
    textStrong: '#111827',   // títulos e textos principais
    textMuted:  '#64748b',   // hints/legendas
    card: '#ffffff',         // cartões, inputs, modais
    surface: '#f8fafc',      // fundo de telas
    border: '#e5e7eb',       // bordas/padrões

    primary: '#2563eb',      // ações
    primaryText: '#ffffff',  // texto sobre "primary"

    success: '#10b981',
    warning: '#f59e0b',
    danger:  '#ef4444',

    chipBg: '#f3f4f6',
    chipText: '#111827',

    kpiPos: '#059669',
    kpiNeg: '#e11d48',
    kpiNeutral: '#334155',
  },

  dark: {
    // legado
    text: '#e5e7eb',
    background: '#0b1220',
    tint: tintColorDark,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorDark,

    // semântico — contraste reforçado p/ modal e textos
    textStrong: '#e5e7eb',   // texto principal claro
    textMuted:  '#94a3b8',
    card: '#0f172a',         // cartões/modais (um degrau acima do background)
    surface: '#0b1220',      // fundo geral
    border: '#1f2937',       // borda sutil no dark

    primary: '#60a5fa',
    primaryText: '#0b1220',  // texto escuro sobre azul claro → ótima leitura

    success: '#22c55e',
    warning: '#fbbf24',
    danger:  '#f87171',

    chipBg: '#111827',       // pill/chip mais escuro que o card
    chipText: '#e5e7eb',

    kpiPos: '#34d399',
    kpiNeg: '#fb7185',
    kpiNeutral: '#94a3b8',
  },
} as const;
