import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type Tone = { bg: string; text: string; border: string };

export function toneByValue(v?: number | null, { invert = false }: { invert?: boolean } = {}): Tone {
  const n = Number(v || 0);
  const good = invert ? n < 0 : n > 0;
  const bad = invert ? n > 0 : n < 0;
  if (good) return { bg: '#ecfdf5', text: '#059669', border: '#34d399' }; // emerald
  if (bad) return { bg: '#fef2f2', text: '#e11d48', border: '#fca5a5' }; // rose
  return { bg: '#f5f5f5', text: '#6b7280', border: '#e5e7eb' };           // neutral
}

export function useLocale() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'pt-BR';
  const currency = i18n.language?.startsWith('en') ? 'USD' : 'BRL';

  const fmtMoney = useCallback(
    (v?: number | null) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(v || 0)),
    [locale, currency]
  );

  const fmtDate = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso)),
    [locale]
  );

  return { fmtMoney, fmtDate };
}
