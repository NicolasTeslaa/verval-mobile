// components/recorrencia/GestorPagamentosModal.tsx
import { FontAwesome } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { Recorrencia } from '@/services/recorrenciaService';

type Props = {
  visible: boolean;
  rec: Recorrencia;
  ano: number;
  setAno: (y: number) => void;
  onClose: () => void;
  onSave: (mapa: Record<string, boolean>) => void;
  locale: string;
  currency: string;
};

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const ymToDate = (ymStr: string) => { const [y, m] = ymStr.split('-').map(Number); return new Date(y, (m || 1) - 1, 1); };
const clampToMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthsBetween = (from: Date, to: Date) => {
  const start = clampToMonthStart(from), end = clampToMonthStart(to);
  const out: string[] = []; const cur = new Date(start);
  while (cur <= end) { out.push(ym(cur)); cur.setMonth(cur.getMonth() + 1); }
  return out;
};

function formatMonthKey(key: string, locale: string) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  const s = d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  return s.replace(/\s*de\s*/i, ' ').replace(/\./g, '').replace(/\s+/g, ' ').replace(' ', '/');
}

export default function GestorPagamentosModal({ visible, rec, ano, setAno, onClose, onSave, locale, currency }: Props) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const C = Colors[scheme ?? 'light'];
  const s = useMemo(() => makeStyles(C), [C]);

  const [mapa, setMapa] = useState<Record<string, boolean>>({ ...rec.pagamentos });
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);

  const toggle = (key: string) => setMapa(prev => ({ ...prev, [key]: !prev[key] }));
  const marcarTodos = (valor: boolean) => {
    const novo = { ...mapa }; for (const k of meses) novo[k] = valor; setMapa(novo);
  };

  const relevantes = useMemo(() => {
    return meses.filter(m => ymToDate(m) >= ymToDate(ym(new Date(rec.inicio))) && (!rec.fim || ymToDate(m) <= ymToDate(ym(new Date(rec.fim)))));
  }, [meses, rec.inicio, rec.fim]);

  const stats = useMemo(() => {
    const pagos = relevantes.filter(m => mapa[m]).length;
    const devidos = relevantes.length;
    const perc = devidos ? (pagos / devidos) * 100 : 100;
    return { pagos, devidos, perc };
  }, [relevantes, mapa]);

  const fmtMoney = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n || 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop} onStartShouldSetResponder={() => true}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{t('recorrencia.manage.title', { defaultValue: 'Gerir Pagamentos' })}</Text>
            <Pressable onPress={onClose} style={s.iconBtn}>
              <FontAwesome name="close" size={20} color={C.textStrong} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Top chips / resumo */}
            <View style={s.topBox}>
              <View style={{ flex: 1 }}>
                <Text style={s.metaLabel}>{t('recorrencia.table.client', { defaultValue: 'Cliente' })}</Text>
                <Text numberOfLines={1} style={s.client}>{rec.cliente}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.metaLabel}>{t('recorrencia.kpi.monthly', { defaultValue: 'Mensal' })}</Text>
                <Text style={s.client}>{fmtMoney(rec.valor)}</Text>
              </View>
            </View>

            {/* Ano + ações em linha */}
            <View style={s.controlsRow}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[...Array(5)].map((_, idx) => {
                  const y = new Date().getFullYear() - 2 + idx;
                  const active = y === ano;
                  return (
                    <Pressable key={y} onPress={() => setAno(y)} style={[s.yearChip, active && s.yearChipActive]}>
                      <Text style={[s.yearChipText, active && s.yearChipTextActive]}>{y}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable style={[s.btn, s.btnOutline]} onPress={() => marcarTodos(true)}>
                  <Text style={s.btnText}>{t('recorrencia.manage.markAll', { defaultValue: 'Marcar todos' })}</Text>
                </Pressable>
                <Pressable style={[s.btn, s.btnOutline]} onPress={() => marcarTodos(false)}>
                  <Text style={s.btnText}>{t('recorrencia.manage.unmarkAll', { defaultValue: 'Limpar' })}</Text>
                </Pressable>
              </View>
            </View>

            {/* Grid de meses */}
            <View style={s.monthGrid}>
              {meses.map((key) => {
                const disabled = ymToDate(key) < ymToDate(ym(new Date(rec.inicio))) || (!!rec.fim && ymToDate(key) > ymToDate(ym(new Date(rec.fim))));
                const checked = !!mapa[key];
                return (
                  <Pressable
                    key={key}
                    disabled={disabled}
                    onPress={() => !disabled && toggle(key)}
                    style={[
                      s.monthBox,
                      disabled && { opacity: 0.45 },
                      checked && { borderColor: C.primary, backgroundColor: C.surface },
                    ]}
                  >
                    <Text style={s.monthText}>{formatMonthKey(key, locale)}</Text>
                    <FontAwesome name={checked ? 'check-circle' : 'circle-o'} size={14} color={C.textStrong} />
                  </Pressable>
                );
              })}
            </View>

            {/* Stats e Ações */}
            <View style={s.footer}>
              <Text style={s.meta}>
                {t('recorrencia.table.paid', { defaultValue: 'Pagos/Devidos' })}: {stats.pagos}/{stats.devidos} • {t('recorrencia.table.ontime', { defaultValue: 'Adimplência' })}: {stats.perc.toFixed(0)}%
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={[s.btn, s.btnGhost]} onPress={onClose}>
                  <Text style={s.btnText}>{t('lanc.common.cancel', { defaultValue: 'Cancelar' })}</Text>
                </Pressable>
                <Pressable style={[s.btn, s.btnPrimary]} onPress={() => onSave(mapa)}>
                  <Text style={[s.btnText, { color: C.primaryText }]}>{t('recorrencia.actions.save', { defaultValue: 'Salvar' })}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'flex-end' },
    card: { backgroundColor: C.card, width: '100%', maxHeight: '90%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    title: { fontSize: 18, fontWeight: '700', color: C.textStrong },
    iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },

    topBox: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    client: { fontWeight: '600', color: C.textStrong },
    metaLabel: { fontSize: 11, color: C.textMuted },

    controlsRow: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    yearChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border },
    yearChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    yearChipText: { fontSize: 12, fontWeight: '600', color: C.chipText },
    yearChipTextActive: { color: C.primaryText },

    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
    monthBox: { width: '31%', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthText: { fontSize: 12, fontWeight: '600', color: C.textStrong },

    footer: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
    meta: { fontSize: 12, color: C.textMuted },

    btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    btnGhost: { backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border },
    btnOutline: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    btnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
    btnText: { fontWeight: '700', color: C.textStrong, fontSize: 12 },
  });
}
