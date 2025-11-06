import { Feather } from '@expo/vector-icons';
import { AnimatePresence, MotiView } from 'moti';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import {
  lancamentoService,
  type Indicadores,
  type IndicadoresFiltro,
  type TipoLancamento,
} from '@/services/lancamentoService';

import { ChartCard } from '@/components/dashboard/ChartCard';
import { DualBars, type DualPoint } from '@/components/dashboard/DualBars';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { MmCard } from '@/components/dashboard/MmCard';
import { EditLancamentoModal } from '@/components/lancamentos/EditLancamentoModal';

import { mapPeriodo, type Periodo } from '@/utils/format';

// tema
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// ===== Helpers de data (3M, 6M, 12M, YTD) =====
type PeriodoExtra = Periodo | '3m' | '6m' | '12m' | 'ytd';

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function firstDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, d.getDate());
}
function rangeForExtra(p: PeriodoExtra | undefined): { inicio?: string; fim?: string } {
  if (!p) return {};
  const today = new Date();
  if (p === '3m' || p === '6m' || p === '12m') {
    const n = p === '3m' ? 3 : p === '6m' ? 6 : 12;
    const startMonth = addMonths(firstDayOfMonth(today), -(n - 1));
    return { inicio: toISO(startMonth), fim: toISO(today) };
  }
  if (p === 'ytd') {
    const start = new Date(today.getFullYear(), 0, 1);
    return { inicio: toISO(start), fim: toISO(today) };
  }
  return mapPeriodo(p as Periodo);
}

export default function DashboardScreen() {
  const { t, i18n } = useTranslation('index');
  const locale = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en-US';
  const currencyCode = i18n.language?.startsWith('pt') ? 'BRL' : 'USD';

  const scheme = useColorScheme();
  const C = Colors[scheme ?? 'light'];
  const s = useMemo(() => makeStyles(C), [C]);

  const [isLoading, setIsLoading] = useState(true);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoExtra | undefined>('mtd');
  const [tipo, setTipo] = useState<TipoLancamento | undefined>(undefined);

  // modal novo lançamento
  const [showEditor, setShowEditor] = useState(false);

  const { usuario, isLoading: isAuthLoading } = useAuth();
  const userId = usuario?.id;

  function notify(title: string, message: string) {
    console.log('[UI]', title, message);
    if (Platform.OS === 'web') {
      window.alert?.(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }

  async function carregar() {
    if (!userId) return;
    try {
      setIsLoading(true);

      const range = rangeForExtra(periodo);
      const filtro: IndicadoresFiltro = {
        ...(range.inicio ? { inicio: range.inicio } : {}),
        ...(range.fim ? { fim: range.fim } : {}),
        ...(tipo ? { tipo } : {}),
      } as IndicadoresFiltro;

      const data = await lancamentoService.listarIndicadoresFiltrado(userId, filtro);
      data.comparacaoMeses = (data.comparacaoMeses || []).map((m) => ({
        ...m,
        saidas: typeof m.saidas === 'number' ? m.saidas : (m as any).saias ?? 0,
      }));
      setIndicadores(data);
    } catch (e) {
      console.error(e);
      notify('Erro', 'Não foi possível carregar os dados agora.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [periodo, tipo, userId]);

  const comps = indicadores?.comparacaoMeses || [];
  const sparkValues = useMemo(() => comps.map((c) => c.entradas - c.saidas), [comps]);

  const { crescimentoEntradas, crescimentoSaidas, margemAtual, crescimentoMargem } = useMemo(() => {
    if (comps.length < 2) {
      return {
        crescimentoEntradas: null as number | null,
        crescimentoSaidas: null as number | null,
        margemAtual: (indicadores?.totalEntradas || 0) - (indicadores?.totalSaidas || 0),
        crescimentoMargem: null as number | null,
      } as const;
    }
    const curr = comps[comps.length - 1];
    const prev = comps[comps.length - 2];
    const entMoM = prev.entradas === 0 ? null : ((curr.entradas - prev.entradas) / prev.entradas) * 100;
    const saiMoM = prev.saidas === 0 ? null : ((curr.saidas - prev.saidas) / prev.saidas) * 100;
    const margemCurr = curr.entradas - curr.saidas;
    const margemPrev = prev.entradas - prev.saidas;
    const margMoM = margemPrev === 0 ? null : ((margemCurr - margemPrev) / Math.abs(margemPrev)) * 100;
    return { crescimentoEntradas: entMoM, crescimentoSaidas: saiMoM, margemAtual: margemCurr, crescimentoMargem: margMoM } as const;
  }, [indicadores, comps]);

  const barsData: DualPoint[] = useMemo(
    () =>
      comps.map((x) => ({
        label: (x.mes || '').substring(5),
        entradas: Number(x.entradas || 0),
        saidas: Number(typeof x.saidas === 'number' ? x.saidas : (x as any).saias || 0),
      })),
    [comps]
  );

  if (isAuthLoading) {
    return <View style={s.loading}><Text style={s.loadingText}>Carregando...</Text></View>;
  }
  if (!userId) {
    return <View style={s.loading}><Text style={s.loadingText}>Faça login para ver o dashboard.</Text></View>;
  }
  if (isLoading) {
    return (
      <View style={s.loading}>
        <MotiView from={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <View style={s.pulse} />
        </MotiView>
        <Text style={s.loadingText}>{t('common:loading', 'Carregando...')}</Text>
      </View>
    );
  }

  const periodChips: { key: PeriodoExtra; label: string }[] = [
    { key: 'hoje', label: t('dashboard.filters.presets.today', 'Hoje') },
    { key: '7d', label: t('dashboard.filters.presets.7d', '7d') },
    { key: '30d', label: t('dashboard.filters.presets.30d', '30d') },
    { key: 'mtd', label: t('dashboard.filters.presets.mtd', 'Mês atual') },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '12m', label: '12M' },
    { key: 'ytd', label: 'Ano' },
  ];

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Header + ações */}
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }}>
          <Text style={s.subtitle}>{t('dashboard.subtitle', 'Visão geral do seu negócio')}</Text>
          
          <View style={s.actions}>
            <Pressable onPress={() => setShowFilters(v => !v)} style={[s.actionBtn, showFilters && s.actionBtnActive]}>
              <Feather name="sliders" size={16} color={showFilters ? C.primaryText : C.textStrong} />
              <Text style={[s.actionBtnText, showFilters && { color: C.primaryText }]}>
                {showFilters ? t('dashboard.actions.hideFilters', 'Esconder Filtros') : t('dashboard.actions.showFilters', 'Mostrar Filtros')}
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={showFilters ? C.primaryText : C.textStrong}
                style={{ marginLeft: 6, transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
              />
            </Pressable>

            <Pressable onPress={() => setShowEditor(true)} style={[s.actionBtn, s.primaryBtn]}>
              <Feather name="plus" size={16} color={C.primaryText} />
              <Text style={[s.actionBtnText, { color: C.primaryText }]}>{t('dashboard.actions.newEntry', 'Novo Lançamento')}</Text>
            </Pressable>
          </View>
        </MotiView>

        {/* Filtros */}
        <AnimatePresence>
          {showFilters && (
            <MotiView
              key="filters"
              from={{ opacity: 0, translateY: -6 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -6 }}
              transition={{ type: 'timing', duration: 180 }}
              style={s.filtersBox}
            >
              <Text style={s.filtersTitle}>{t('dashboard.filters.title', 'Filtros')}</Text>

              {/* Periodo: toggle remove se clicar no mesmo */}
              <View style={s.pills}>
                {periodChips.map(({ key, label }) => {
                  const active = periodo === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setPeriodo(active ? undefined : key)}
                      style={[s.pill, active && s.pillActive]}
                    >
                      <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Tipo */}
              <View style={{ marginTop: 8 }}>
                <Text style={s.filterLabel}>Tipo</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {(['Entrada', 'Saida'] as TipoLancamento[]).map((tp) => {
                    const active = tipo === tp;
                    return (
                      <Pressable key={tp} onPress={() => setTipo(active ? undefined : tp)} style={[s.chip, active && s.chipActive]}>
                        <Text style={[s.chipText, active && s.chipTextActive]}>{tp}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* KPIs */}
        <View style={s.gridTwo}>
          <KpiCard title={t('dashboard.kpi.today', 'Entrou Hoje')} value={indicadores?.entrouDia || 0} locale={locale} currencyCode={currencyCode} delta={crescimentoEntradas} trend={sparkValues} />
          <KpiCard title={t('dashboard.kpi.week', 'Entrou na Semana')} value={indicadores?.entrouSemana || 0} locale={locale} currencyCode={currencyCode} delta={crescimentoEntradas} trend={sparkValues} />
          <KpiCard title={t('dashboard.kpi.month', 'Entrou no Mês')} value={indicadores?.entrouMes || 0} locale={locale} currencyCode={currencyCode} delta={crescimentoEntradas} trend={sparkValues} />
          <KpiCard title={t('dashboard.kpi.totalBalance', 'Saldo Total')} value={indicadores?.saldoTotal || 0} locale={locale} currencyCode={currencyCode} delta={crescimentoMargem} trend={sparkValues} />
        </View>

        {/* M/M */}
        <View style={s.gridThree}>
          <MmCard title={t('dashboard.mm.incomeGrowth', 'Crescimento Entradas (M/M)')} value={crescimentoEntradas} />
          <MmCard title={t('dashboard.mm.expenseGrowth', 'Crescimento Saídas (M/M)')} value={crescimentoSaidas} invert />
        </View>

        {/* Gráfico: Entradas x Saídas */}
        <ChartCard title={t('dashboard.charts.monthlyIncome.title', 'Entradas x Saídas por mês')}>
          <DualBars
            data={barsData}
            locale={locale}
            currencyCode={currencyCode}
            labelIn={t('dashboard.charts.monthlyComparison.headers.income', 'Income')}
            labelOut={t('dashboard.charts.monthlyComparison.headers.expense', 'Expenses')}
          />
        </ChartCard>
      </ScrollView>

      {/* Modal Novo Lançamento */}
      <EditLancamentoModal
        visible={showEditor}
        initial={null}
        onClose={() => setShowEditor(false)}
        onSaved={() => {
          setShowEditor(false);
          carregar();
        }}
      />
    </>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    content: { padding: 16, paddingBottom: 32 },
    title: { fontSize: 22, fontWeight: '700', color: C.textStrong },
    subtitle: { marginTop: 2, fontSize: 13, color: C.textMuted },

    actions: { marginTop: 12, flexDirection: 'row' },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: C.chipBg,
      borderWidth: 1,
      borderColor: C.border,
      marginRight: 8,
      gap: 10
    },
    actionBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    primaryBtn: { backgroundColor: C.primary, borderColor: C.primary },
    actionBtnText: { fontSize: 13, color: C.textStrong, fontWeight: '600' },

    filtersBox: {
      marginTop: 12,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      padding: 12,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    filtersTitle: { fontSize: 13, fontWeight: '600', color: C.textStrong, marginBottom: 8 },

    pills: { flexDirection: 'row', flexWrap: 'wrap' },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      marginRight: 8,
      marginBottom: 8,
    },
    pillActive: { backgroundColor: C.primary, borderColor: C.primary },
    pillText: { fontSize: 12, color: C.textStrong, fontWeight: '600' },
    pillTextActive: { color: C.primaryText },

    filterLabel: { fontSize: 12, color: C.textMuted, fontWeight: '700' },

    chip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
      marginRight: 8,
      marginBottom: 8,
    },
    chipActive: { backgroundColor: C.primary, borderColor: C.primary },
    chipText: { color: C.textStrong, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: C.primaryText },

    gridTwo: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridThree: { marginTop: 6, flexDirection: 'row', gap: 11 },

    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
    pulse: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.primary, opacity: 0.15 },
    loadingText: { color: C.textMuted, marginTop: 8 },
  });
}
