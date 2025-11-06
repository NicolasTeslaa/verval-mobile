import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance } from 'react-native';

export type Scheme = 'light' | 'dark';
export type Pref = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  scheme: Scheme;                 // tema efetivo
  pref: Pref;                     // preferência do usuário
  setPref: (p: Pref) => Promise<void>;
  ready: boolean;
};

const KEY = '@theme.pref';
const _ThemeCtx = createContext<ThemeContextValue | undefined>(undefined);

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<Pref>('system');
  const [ready, setReady] = useState(false);
  const userChangedRef = useRef(false); // 👈 guarda se o usuário já mexeu

  const system = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const scheme: Scheme = pref === 'system' ? system : pref;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (mounted && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          // só aplica o salvo se o usuário ainda não alterou manualmente
          if (!userChangedRef.current) setPrefState(saved);
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();

    const sub = Appearance.addChangeListener(() => {
      if (userChangedRef.current) return; // usuário fixou algo; ignora variação do sistema se pref != system
      if (pref === 'system') {
        // força re-render para refletir o sistema
        setPrefState(p => p);
      }
    });

    return () => { mounted = false; sub.remove(); };
  }, [pref]);

  const setPref = async (p: Pref) => {
    userChangedRef.current = true;
    setPrefState(p);
    try { await AsyncStorage.setItem(KEY, p); } catch {}
  };

  const value = useMemo<ThemeContextValue>(() => ({ scheme, pref, setPref, ready }), [scheme, pref, ready]);

  return <_ThemeCtx.Provider value={value}>{children}</_ThemeCtx.Provider>;
}

export function useColorScheme(): Scheme {
  const ctx = useContext(_ThemeCtx);
  if (!ctx) return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  return ctx.scheme;
}

export function useThemePref(): { pref: Pref; setPref: (p: Pref) => Promise<void>; ready: boolean } {
  const ctx = useContext(_ThemeCtx);
  if (!ctx) return { pref: 'system', setPref: async () => {}, ready: true };
  return { pref: ctx.pref, setPref: ctx.setPref, ready: ctx.ready };
}
