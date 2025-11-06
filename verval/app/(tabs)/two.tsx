import { FontAwesome } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Platform, Pressable, RefreshControl, SafeAreaView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/lancamentos/Badge';
import { EditLancamentoModal } from '@/components/lancamentos/EditLancamentoModal';
import { Kpi } from '@/components/lancamentos/Kpi';
import { toneByValue, useLocale } from '@/components/lancamentos/utils';
import { Text } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';

import {
  lancamentoService,
  setAuthToken,
  setUsuarioAtual,
  type Lancamento,
} from '@/services/lancamentoService';

export default function LancamentosScreen() {
  const { t } = useTranslation('lanc');
  const { usuario, accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Lancamento[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Lancamento | null>(null);

  const { fmtMoney, fmtDate } = useLocale();

  useEffect(() => { setUsuarioAtual(usuario?.id ?? null); }, [usuario?.id]);
  useEffect(() => { setAuthToken(accessToken ?? null); }, [accessToken]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await lancamentoService.list({ usuarioId: usuario?.id });
      setItems(data);
    } catch (e) {
      console.error('[LancamentosScreen] load', e);
      Alert.alert(t('error'), t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, t]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const { totalEntradas, totalSaidas, saldo } = useMemo(() => {
    const entradas = items.filter(i => i.tipo === 'Entrada');
    const saidas = items.filter(i => i.tipo === 'Saida');
    const sum = (arr: number[]) => arr.reduce((a, n) => a + (Number(n) || 0), 0);
    const totalEntradas = sum(entradas.map(i => i.valor));
    const custoEntradas = sum(entradas.map(i => i.custo || 0));
    const totalSaidas = sum(saidas.map(i => i.valor)) + custoEntradas;
    return { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas };
  }, [items]);

  const openEdit = useCallback((l: Lancamento) => { setCurrent(l); setEditOpen(true); }, []);
  const confirmDelete = useCallback((l: Lancamento) => {
    Alert.alert(
      t('deleteTitle'),
      t('deleteMessage', { nome: l.nome }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await lancamentoService.remove(l.id);
              await load();
            } catch (e: any) {
              Alert.alert(t('error'), String(e?.message || t('deleteError')));
            }
          }
        },
      ]
    );
  }, [load, t]);

  const toneIn = toneByValue(totalEntradas);
  const toneOut = toneByValue(totalSaidas, { invert: true });
  const toneBal = toneByValue(saldo);

  return (
    <SafeAreaView style={styles.safe}>

      {/* KPIs */}
      <View style={styles.kpis}>
        <Kpi title={t('kpi.in')}      value={fmtMoney(totalEntradas)} icon="arrow-up"   tone={toneIn} />
        <Kpi title={t('kpi.out')}     value={fmtMoney(totalSaidas)}   icon="arrow-down" tone={toneOut} />
        <Kpi title={t('kpi.balance')} value={fmtMoney(saldo)}         icon="money"      tone={toneBal} />
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.listContent, items.length === 0 && { flex: 1, justifyContent: 'center' }]}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('empty')}</Text>
            <Text style={styles.emptyHint}>{t('emptyHint')}</Text>
          </View>
        ) : null}
        renderItem={({ item }) => {
          const tone = item.tipo === 'Entrada' ? toneByValue(item.valor) : toneByValue(item.valor, { invert: true });
          return (
            <Pressable onPress={() => openEdit(item)} style={[styles.card, { borderLeftColor: tone.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text numberOfLines={1} style={styles.cardTitle}>{item.nome}</Text>
                  <Text style={styles.cardMeta}>{fmtDate(item.data)}{item.categoria ? ` • ${item.categoria}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.cardValue, { color: item.tipo === 'Saida' ? '#e11d48' : '#059669' }]}>{fmtMoney(item.valor)}</Text>
                  {item.lucro && item.lucro > 0 ? (
                    <Text style={styles.cardProfit}>{t('profit')}: {fmtMoney(item.lucro)}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.cardActions}>
                <Badge text={item.tipo === 'Entrada' ? t('entry') : t('exit')} toneBg={tone.bg} toneText={tone.text} />
                {item.categoria ? <Badge text={item.categoria} /> : null}
                <View style={{ flex: 1 }} />
                <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}><FontAwesome name="pencil" size={18} /></Pressable>
                <Pressable style={styles.iconBtn} onPress={() => confirmDelete(item)}><FontAwesome name="trash" size={18} /></Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setEditOpen(true)}>
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>

      {/* Modal */}
      <EditLancamentoModal
        visible={editOpen}
        initial={current}
        onClose={() => { setEditOpen(false); setCurrent(null); }}
        onSaved={async () => { setEditOpen(false); setCurrent(null); await load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kpis: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8, paddingTop: Platform.select({ ios: 4, android: 8, default: 8 }) },
  listContent: { padding: 12 },
  emptyBox: { alignItems: 'center', gap: 4 },
  emptyText: { fontSize: 14, color: '#6b7280' },
  emptyHint: { fontSize: 12, color: '#9ca3af' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardValue: { fontSize: 16, fontWeight: '700' },
  cardProfit: { fontSize: 12, color: '#059669', marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: '#111827', borderRadius: 9999, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});
