// app/(tabs)/recorrencia.tsx
import { FontAwesome } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { Kpi } from '@/components/lancamentos/Kpi';
import { toneByValue, useLocale } from '@/components/lancamentos/utils';
import { Text } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';

import recorrenciaService, {
  type Recorrencia,
  monthsBetween,
  ym as ymKey,
  ymToDate,
} from '@/services/recorrenciaService';

// usar o mesmo usuário atual que o http usa
import { setUsuarioAtual } from '@/services/lancamentoService';

// === tema ===
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// === modais ===
import GestorPagamentosModal from '@/components/recorrencia/GestorPagamentosModal';
import RecorrenciaFormModal from '@/components/recorrencia/RecorrenciaFormModal';

type StatusFiltro = 'todas' | 'ativas' | 'inativas' | 'vencidas';

function rgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function RecorrenciaScreen() {
  const { t, i18n } = useTranslation();
  const { usuario } = useAuth();
  const { fmtMoney } = useLocale();

  const scheme = useColorScheme();
  const C = Colors[scheme ?? 'light'];
  const styles = useMemo(() => makeStyles(C), [C]);

  // estado base
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Recorrencia[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todas');

  // === estados dos modais ===
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Recorrencia | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payRec, setPayRec] = useState<Recorrencia | null>(null);
  const [payYear, setPayYear] = useState<number>(new Date().getFullYear());

  // sincroniza usuarioId com o http (igual outras telas)
  useEffect(() => {
    setUsuarioAtual(usuario?.id ?? null);
  }, [usuario?.id]);

  // data helpers (iguais à página web)
  const hoje = useRef(new Date()).current;
  const currentMonthKey = ymKey(hoje);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'pt-BR';

  // ====== Helpers de data ======
  function parseISO(isoYMD: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYMD);
    if (!m) return new Date(isoYMD);
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  }

  function compactPtBr(s: string) {
    return s.replace(/\sde\s/gi, ' ').replace(/\.$/, '');
  }

  function formatDatePretty(isoYMD: string) {
    const d = parseISO(isoYMD);
    const opts: Intl.DateTimeFormatOptions =
      locale === 'pt-BR'
        ? { day: '2-digit', month: 'short', year: 'numeric' }
        : { month: 'short', day: '2-digit', year: 'numeric' };
    const raw = d.toLocaleDateString(locale, opts);
    return locale === 'pt-BR' ? compactPtBr(raw) : raw;
  }

  function computeDueISO(ym: string, vencimento_dia?: number | null): string {
    const m = /^(\d{4})-(\d{2})$/.exec(ym);
    if (!m) return ym + '-01';
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const lastDay = new Date(y, mm, 0).getDate();
    const dia = Math.max(1, Math.min(Number(vencimento_dia ?? 1), lastDay));
    return `${y}-${String(mm).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  const dueMonthsUntilToday = (r: Recorrencia) => {
    const start = new Date(r.inicio);
    const limite = r.fim ? new Date(r.fim) : hoje;
    const keys = monthsBetween(start, limite);
    return keys.filter((k) => parseISO(computeDueISO(k, r.vencimento_dia)) <= hoje);
  };

  const isOverdue = (r: Recorrencia) => {
    const dues = dueMonthsUntilToday(r);
    return dues.some((m) => !r.pagamentos[m]);
  };

  const currentMonthInRange = (r: Recorrencia) => {
    const cur = ymToDate(currentMonthKey);
    const start = ymToDate(ymKey(new Date(r.inicio)));
    const end = r.fim ? ymToDate(ymKey(new Date(r.fim))) : undefined;
    const afterStart = cur >= start;
    const beforeEnd = end ? cur <= end : true;
    return afterStart && beforeEnd;
  };

  const nextDue = (r: Recorrencia) => {
    const start = new Date(r.inicio);
    const futureLimit = r.fim ? new Date(r.fim) : new Date(hoje.getFullYear(), hoje.getMonth() + 6, 1);
    const candidates = monthsBetween(start, futureLimit);
    for (const k of candidates) {
      const iso = computeDueISO(k, r.vencimento_dia);
      const dueDate = parseISO(iso);
      if (dueDate >= hoje && !r.pagamentos[k]) return iso;
    }
    const atrasados = dueMonthsUntilToday(r).filter((m) => !r.pagamentos[m]);
    if (atrasados.length > 0) return computeDueISO(atrasados[0], r.vencimento_dia);
    return '-';
  };

  const duePaidStats = (r: Recorrencia) => {
    const dues = dueMonthsUntilToday(r);
    const pagos = dues.filter((m) => r.pagamentos[m]).length;
    return { pagos, devidos: dues.length, perc: dues.length ? (pagos / dues.length) * 100 : 100 };
  };

  const canMarkCurrent = (r: Recorrencia) => {
    if (!currentMonthInRange(r) || r.pagamentos[currentMonthKey]) return false;
    const dueDate = parseISO(computeDueISO(currentMonthKey, r.vencimento_dia));
    return dueDate <= hoje;
  };

  // carregar lista
  const load = useCallback(async () => {
    const usuarioId = usuario?.id;
    if (!usuarioId) return;
    try {
      setIsLoading(true);
      const data = await recorrenciaService.list(usuarioId);
      setItems(data);
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        t('error', { defaultValue: 'Erro' }),
        t('recorrencia.loadError', { defaultValue: 'Falha ao carregar recorrências.' })
      );
    } finally {
      setIsLoading(false);
    }
  }, [usuario?.id, t]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  // ====== Derivados (filtros + métricas) ======
  const derivado = useMemo(() => {
    let arr = items
      .filter((r) =>
        statusFiltro === 'todas'
          ? true
          : statusFiltro === 'ativas'
            ? r.ativo
            : statusFiltro === 'inativas'
              ? !r.ativo
              : isOverdue(r)
      )
      .filter((r) => r.cliente.toLowerCase().includes(busca.trim().toLowerCase()));

    const ativas = arr.filter((r) => r.ativo);

    const mrrContratual = ativas.reduce((acc, r) => acc + (r.valor || 0), 0);
    const mrrRecebido = ativas.reduce((acc, r) => {
      const inRange = currentMonthInRange(r);
      const pago = !!r.pagamentos[currentMonthKey];
      return inRange && pago ? acc + (r.valor || 0) : acc;
    }, 0);

    const arrAnnual = mrrContratual * 12;

    const adimplencias = arr.map((r) => {
      const dues = dueMonthsUntilToday(r);
      const pagos = dues.filter((m) => r.pagamentos[m]).length;
      return dues.length > 0 ? pagos / dues.length : 1;
    });
    const adimplenciaMedia = adimplencias.length
      ? (adimplencias.reduce((a, b) => a + b, 0) / adimplencias.length) * 100
      : 100;
    const inadimplenciaMedia = Math.max(0, 100 - adimplenciaMedia);

    const progresso = mrrContratual > 0 ? Math.min(100, (mrrRecebido / mrrContratual) * 100) : 100;

    return {
      arr,
      ativas: ativas.length,
      mrrContratual,
      mrrRecebido,
      arrAnnual,
      progresso,
      inadimplenciaMedia,
    };
  }, [items, statusFiltro, busca]);

  // ====== Ações base ======
  const marcarPagoMesAtual = async (r: Recorrencia) => {
    if (!usuario?.id) return;
    if (!canMarkCurrent(r)) {
      Alert.alert(
        t('info', { defaultValue: 'Info' }),
        t('recorrencia.outOfRange', { defaultValue: 'Mês fora do período, antes do vencimento ou já pago.' })
      );
      return;
    }
    try {
      const atualizado = await recorrenciaService.toggleMonth(r.id, currentMonthKey, true, usuario.id);
      setItems((prev) => prev.map((x) => (x.id === r.id ? atualizado : x)));
    } catch (e: any) {
      console.error(e);
      Alert.alert(t('error', { defaultValue: 'Erro' }), String(e?.message || t('saveError', { defaultValue: 'Falha ao salvar' })));
    }
  };

  const toggleAtivo = async (r: Recorrencia, ativo: boolean) => {
    if (!usuario?.id) return;
    try {
      const atualizado = await recorrenciaService.update(r.id, { ativo, usuarioId: usuario.id });
      setItems((prev) => prev.map((x) => (x.id === r.id ? atualizado : x)));
    } catch (e: any) {
      console.error(e);
      Alert.alert(t('error', { defaultValue: 'Erro' }), String(e?.message || t('common.failed', { defaultValue: 'Falhou' })));
    }
  };

  // ====== Ações dos modais ======
  const openGestor = (r: Recorrencia) => {
    setPayRec(r);
    setPayYear(new Date().getFullYear());
    setPayOpen(true);
  };

  const onCreateRec = async (data: Omit<Recorrencia, 'id' | 'pagamentos' | 'usuarioId'>) => {
    if (!usuario?.id) return;
    try {
      const novo = await recorrenciaService.create({ ...data, usuarioId: usuario.id });
      setItems(prev => [novo, ...prev]);
    } catch (e: any) {
      Alert.alert(t('error', { defaultValue: 'Erro' }), String(e?.message || t('common.failed', { defaultValue: 'Falhou' })));
    }
  };

  const onUpdateRec = async (patch: Partial<Omit<Recorrencia, 'id' | 'pagamentos'>>) => {
    if (!usuario?.id || !editing) return;
    try {
      const atualizado = await recorrenciaService.update(editing.id, { ...patch, usuarioId: usuario.id });
      setItems(prev => prev.map(x => (x.id === editing.id ? atualizado : x)));
    } catch (e: any) {
      Alert.alert(t('error', { defaultValue: 'Erro' }), String(e?.message || t('common.failed', { defaultValue: 'Falhou' })));
    }
  };

  const onSavePayments = async (mapa: Record<string, boolean>) => {
    if (!usuario?.id || !payRec) return;
    try {
      const atualizado = await recorrenciaService.setPayments(payRec.id, mapa, usuario.id);
      setItems(prev => prev.map(x => (x.id === payRec.id ? atualizado : x)));
    } catch (e: any) {
      Alert.alert(t('error', { defaultValue: 'Erro' }), String(e?.message || t('common.failed', { defaultValue: 'Falhou' })));
    }
  };

  // ====== UI ======
  return (
    <View style={styles.container}>
      {/* Header com botão "Lançar" */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={styles.subtitle}>
          {t('recorrencia.subtitle', { defaultValue: 'Controle de assinaturas e pagamentos mensais' })}
        </Text>
        <Pressable
          onPress={() => { setFormMode('create'); setEditing(null); setFormOpen(true); }}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary }}
        >
          <Text style={{ color: C.primaryText, fontWeight: '700' }}>
            {t('recorrencia.actions.new', { defaultValue: 'Lançar' })}
          </Text>
        </Pressable>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <TextInput
          placeholder={t('recorrencia.filters.searchPh', { defaultValue: 'Buscar cliente...' })}
          value={busca}
          onChangeText={setBusca}
          style={styles.search}
          placeholderTextColor={C.textMuted}
        />
        <View style={styles.segment}>
          {(['todas', 'ativas', 'inativas', 'vencidas'] as StatusFiltro[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatusFiltro(s)}
              style={[styles.segmentBtn, statusFiltro === s && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, statusFiltro === s && styles.segmentTextActive]}>
                {s === 'todas' ? t('recorrencia.filters.all', { defaultValue: 'Todas' })
                  : s === 'ativas' ? t('recorrencia.filters.active', { defaultValue: 'Ativas' })
                    : s === 'inativas' ? t('recorrencia.filters.inactive', { defaultValue: 'Inativas' })
                      : t('recorrencia.filters.overdue', { defaultValue: 'Vencidas' })}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpis}>
        <Kpi title={t('recorrencia.kpi.active', { defaultValue: 'Ativas' })} value={derivado.ativas} icon="check" tone={toneByValue(derivado.ativas)} size="sm" />
        <Kpi title={t('recorrencia.kpi.mrrContractual', { defaultValue: 'MRR Contratual' })} value={fmtMoney(derivado.mrrContratual)} icon="credit-card" tone={toneByValue(derivado.mrrContratual)} size="sm" />
      </View>
      <View style={styles.kpis}>
        <Kpi title={t('recorrencia.kpi.mrrCollected', { defaultValue: 'MRR Recebido' })} value={fmtMoney(derivado.mrrRecebido)} icon="dollar" tone={toneByValue(derivado.mrrRecebido)} size="sm" />
        <Kpi title={t('recorrencia.kpi.arr', { defaultValue: 'ARR (ano)' })} value={fmtMoney(derivado.arrAnnual)} icon="line-chart" tone={toneByValue(derivado.arrAnnual)} size="sm" />
      </View>

      <Text style={styles.kpiHint}>
        {t('recorrencia.kpi.collected', { defaultValue: 'Recebido no mês' })}: {derivado.progresso.toFixed(0)}% • {t('recorrencia.kpi.delinquency', { defaultValue: 'Inadimplência' })}: {derivado.inadimplenciaMedia.toFixed(0)}%
      </Text>

      {/* Lista */}
      <FlatList
        data={derivado.arr}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.list, !isLoading && derivado.arr.length === 0 && { flex: 1, justifyContent: 'center' }]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>{t('recorrencia.emptyTitle', { defaultValue: 'Nada por aqui ainda' })}</Text>
              <Text style={styles.emptyText}>
                {t('recorrencia.empty', { defaultValue: 'Cadastre sua primeira recorrência para ver métricas e acompanhar pagamentos.' })}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: r }) => {
          const stats = duePaidStats(r);
          const prox = nextDue(r);
          const overdue = isOverdue(r);
          const tone = toneByValue(r.valor);

          const inicioPretty = formatDatePretty(r.inicio);
          const proxPretty = prox === '-' ? '-' : formatDatePretty(prox);

          return (
            <View style={[styles.card, { borderLeftColor: tone.border }]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.badgesRow}>
                    {r.ativo ? (
                      <View style={[styles.badge, styles.badgeSuccess]}>
                        <FontAwesome name="check-circle" size={12} color={C.textStrong} />
                        <Text style={styles.badgeText}>{t('recorrencia.status.active', { defaultValue: 'Ativa' })}</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeMuted]}>
                        <FontAwesome name="ban" size={12} color={C.textStrong} />
                        <Text style={styles.badgeText}>{t('recorrencia.status.inactive', { defaultValue: 'Inativa' })}</Text>
                      </View>
                    )}
                    {overdue && (
                      <View style={[styles.badge, styles.badgeWarn]}>
                        <Text style={styles.badgeText}>{t('recorrencia.badges.overdue', { defaultValue: 'Vencida' })}</Text>
                      </View>
                    )}
                    {r.categoria ? (
                      <View style={[styles.badge, styles.badgeNeutral]}>
                        <Text style={styles.badgeText}>{r.categoria}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text numberOfLines={1} style={styles.cardTitle}>{r.cliente}</Text>
                  <Text style={styles.cardMeta}>
                    <FontAwesome name="calendar" /> {inicioPretty}
                    {' • '}
                    {t('recorrencia.table.next', { defaultValue: 'Próx. venc.' })}: {proxPretty}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardValue}>{fmtMoney(r.valor)}</Text>
                  <Text style={styles.cardMeta}>
                    {t('recorrencia.table.paid', { defaultValue: 'Pagos/Devidos' })}: {stats.pagos}/{stats.devidos}
                  </Text>
                </View>
              </View>

              {/* Ações: grid 2x2 responsiva */}
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.btn, styles.btnOutline, styles.btnHalf, !canMarkCurrent(r) && styles.btnDisabled]}
                  onPress={() => marcarPagoMesAtual(r)}
                  disabled={!canMarkCurrent(r)}
                >
                  <FontAwesome name="money" size={14} color={C.textStrong} />
                  <Text style={styles.btnText}>{t('recorrencia.actions.payThisMonth', { defaultValue: 'Pagar mês atual' })}</Text>
                </Pressable>

                <Pressable
                  style={[styles.btn, styles.btnGhost, styles.btnHalf]}
                  onPress={() => toggleAtivo(r, !r.ativo)}
                >
                  <FontAwesome name={r.ativo ? 'toggle-on' : 'toggle-off'} size={16} color={C.textStrong} />
                  <Text style={styles.btnText}>
                    {r.ativo
                      ? t('recorrencia.actions.deactivate', { defaultValue: 'Desativar' })
                      : t('recorrencia.actions.activate', { defaultValue: 'Ativar' })}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.btn, styles.btnOutline, styles.btnHalf]}
                  onPress={() => openGestor(r)}
                >
                  <FontAwesome name="calendar" size={14} color={C.textStrong} />
                  <Text style={styles.btnText}>{t('recorrencia.actions.manage', { defaultValue: 'Pagamentos' })}</Text>
                </Pressable>

                {/* Botão EDITAR solicitado */}
                <Pressable
                  style={[styles.btn, styles.btnGhost, styles.btnHalf]}
                  onPress={() => { setFormMode('edit'); setEditing(r); setFormOpen(true); }}
                >
                  <FontAwesome name="pencil" size={14} color={C.textStrong} />
                  <Text style={styles.btnText}>{t('recorrencia.actions.edit', { defaultValue: 'Editar' })}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* Modal Criar/Editar */}
      <RecorrenciaFormModal
        visible={formOpen}
        mode={formMode}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onCreate={(data) => { onCreateRec(data); setFormOpen(false); }}
        onUpdate={(patch) => { onUpdateRec(patch); setFormOpen(false); }}
      />

      {/* Modal Gestor de Pagamentos */}
      {payRec && (
        <GestorPagamentosModal
          visible={payOpen}
          rec={payRec}
          ano={payYear}
          setAno={setPayYear}
          onClose={() => setPayOpen(false)}
          onSave={(mapa) => { onSavePayments(mapa); setPayOpen(false); }}
          locale={locale}
          currency={i18n.language?.startsWith('en') ? 'USD' : 'BRL'}
        />
      )}
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
    title: { fontSize: 20, fontWeight: '700', color: C.textStrong },
    subtitle: { marginTop: 2, fontSize: 12, color: C.textMuted },

    filters: { paddingHorizontal: 16, gap: 8, paddingTop: 6, paddingBottom: 10 },
    search: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.textStrong,
      backgroundColor: C.card,
    },
    segment: { flexDirection: 'row', gap: 8 },
    segmentBtn: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999,
      backgroundColor: C.chipBg,
    },
    segmentBtnActive: { backgroundColor: C.textStrong },
    segmentText: { color: C.chipText, fontWeight: '600', fontSize: 12 },
    segmentTextActive: { color: C.background },

    kpis: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
    kpiHint: { paddingHorizontal: 16, fontSize: 11, color: C.textMuted, marginBottom: 8 },

    list: { paddingHorizontal: 12, paddingBottom: 16 },

    card: {
      backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 10,
      borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
    badgeText: { fontSize: 11, fontWeight: '600', color: C.textStrong },
    badgeSuccess: { backgroundColor: rgba(C.success, 0.14) },
    badgeMuted: { backgroundColor: rgba(C.danger, 0.14) },
    badgeWarn: { backgroundColor: rgba(C.warning, 0.14) },
    badgeNeutral: { backgroundColor: rgba(C.textMuted, 0.16) },

    cardTitle: { fontSize: 16, fontWeight: '600', color: C.textStrong, marginTop: 2 },
    cardMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    cardValue: { fontSize: 16, fontWeight: '700', color: C.textStrong },

    // Ações: grade 2x2 com wrap e tamanhos iguais
    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    btn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    },
    btnHalf: { flexBasis: '48%', flexGrow: 1 }, // duas colunas
    btnOutline: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    btnGhost: { backgroundColor: C.chipBg },
    btnDisabled: { opacity: 0.5 },
    btnText: { fontWeight: '700', color: C.textStrong, fontSize: 12, includeFontPadding: false },

    emptyBox: { alignItems: 'center', paddingHorizontal: 24, gap: 6 },
    emptyIcon: { width: 48, height: 48, borderRadius: 9999, backgroundColor: rgba(C.primary, 0.15) },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4, color: C.textStrong },
    emptyText: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  });
}
