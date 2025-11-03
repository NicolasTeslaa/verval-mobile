// app/(tabs)/index.tsx
import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { lancamentoService, type Conta, type Indicadores, type IndicadoresFiltro, type TipoLancamento } from '@/services/lancamentoService';

import { ChartCard } from '@/components/dashboard/ChartCard';
import { DualBars, type DualPoint } from '@/components/dashboard/DualBars';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { MmCard } from '@/components/dashboard/MmCard';

import { mapPeriodo, Periodo } from '@/utils/format';

export default function DashboardScreen() {
  const { t, i18n } = useTranslation('index');
  const locale = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en-US';
  const currencyCode = i18n.language?.startsWith('pt') ? 'BRL' : 'USD';

  const [isLoading, setIsLoading] = useState(true);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>('mtd');
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState<string | undefined>(undefined);
  const [tipo, setTipo] = useState<TipoLancamento | undefined>(undefined);

  const { usuario, isLoading: isAuthLoading } = useAuth();
  const userId = usuario?.id;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const cs = await lancamentoService.listarContas(userId).catch(() => []);
        setContas(cs || []);
      } catch { }
    })();
  }, [userId]);

  async function carregar() {
    if (!userId) return;
    try {
      setIsLoading(true);
      const range = mapPeriodo(periodo);
      const filtro: IndicadoresFiltro = { ...range, contaId, tipo };
      const data = await lancamentoService.listarIndicadoresFiltrado(userId, filtro);
      data.comparacaoMeses = (data.comparacaoMeses || []).map(m => ({
        ...m,
        saidas: typeof m.saidas === 'number' ? m.saidas : (m as any).saias ?? 0
      }));
      setIndicadores(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível carregar os dados agora.');
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => { carregar(); }, [periodo, contaId, tipo]);

  const comps = indicadores?.comparacaoMeses || [];
  const sparkValues = useMemo(() => comps.map(c => c.entradas - c.saidas), [comps]);

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
    () => comps.map(x => ({
      label: (x.mes || '').substring(5),
      entradas: Number(x.entradas || 0),
      saidas: Number(typeof x.saidas === 'number' ? x.saidas : (x as any).saias || 0),
    })),
    [comps]
  );

  if (isAuthLoading) {
    return <View style={s.loading}><Text>Carregando...</Text></View>;
  }
  if (!userId) {
    return <View style={s.loading}><Text>Faça login para ver o dashboard.</Text></View>;
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

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header + ações */}
      <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }}>
        <Text style={s.title}>{t('dashboard.title', 'Dashboard')}</Text>
        <Text style={s.subtitle}>{t('dashboard.subtitle', 'Visão geral do seu negócio')}</Text>

        <View style={s.actions}>
          <Pressable onPress={() => setShowFilters(v => !v)} style={[s.actionBtn, showFilters && s.actionBtnActive]}>
            <Feather name="sliders" size={16} color={showFilters ? '#fff' : '#111827'} />
            <Text style={[s.actionBtnText, showFilters && { color: '#fff' }]}>
              {showFilters ? t('dashboard.actions.hideFilters', 'Esconder Filtros') : t('dashboard.actions.showFilters', 'Mostrar Filtros')}
            </Text>
            <Feather name="chevron-down" size={16} color={showFilters ? '#fff' : '#111827'} style={{ marginLeft: 6, transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }} />
          </Pressable>

          <Pressable onPress={() => Alert.alert('Novo lançamento', 'Formulário mobile ainda não implementado.')} style={[s.actionBtn, s.primaryBtn]}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={[s.actionBtnText, { color: '#fff' }]}>{t('dashboard.actions.newEntry', 'Novo Lançamento')}</Text>
          </Pressable>
        </View>
      </MotiView>

      {/* Filtros */}
      <MotiView animate={{ height: showFilters ? undefined : 0, opacity: showFilters ? 1 : 0 }} style={[s.filtersBox, !showFilters && { overflow: 'hidden' }]} transition={{ type: 'timing', duration: 220 }}>
        <Text style={s.filtersTitle}>{t('dashboard.filters.title', 'Filtros')}</Text>

        <View style={s.pills}>
          {(['hoje', '7d', '30d', 'mtd'] as Periodo[]).map((p) => {
            const active = periodo === p;
            return (
              <Pressable key={p} onPress={() => setPeriodo(p)} style={[s.pill, active && s.pillActive]}>
                <Text style={[s.pillText, active && s.pillTextActive]}>
                  {p === 'hoje' ? t('dashboard.filters.presets.today', 'Hoje')
                    : p === '7d' ? t('dashboard.filters.presets.7d', '7d')
                      : p === '30d' ? t('dashboard.filters.presets.30d', '30d')
                        : t('dashboard.filters.presets.mtd', 'Mês atual')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={s.filterLabel}>Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
            <Pressable onPress={() => setContaId(undefined)} style={[s.chip, !contaId && s.chipActive]}>
              <Text style={[s.chipText, !contaId && s.chipTextActive]}>Todas</Text>
            </Pressable>
            {contas.map(c => (
              <Pressable key={c.id} onPress={() => setContaId(c.id)} style={[s.chip, contaId === c.id && s.chipActive]}>
                <Text style={[s.chipText, contaId === c.id && s.chipTextActive]}>{c.nome}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[s.filterLabel, { marginTop: 6 }]}>Tipo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(['Entrada', 'Saida'] as TipoLancamento[]).map(tp => {
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
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#6B7280' },
  actions: { marginTop: 12, flexDirection: 'row' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F3F4F6', marginRight: 8 },
  actionBtnActive: { backgroundColor: '#111827' },
  primaryBtn: { backgroundColor: '#111827' },
  actionBtnText: { fontSize: 13, color: '#111827', fontWeight: '600' },
  filtersBox: { marginTop: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  filtersTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#111827', borderColor: '#111827' },
  pillText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  filterLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', marginRight: 8 },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  gridTwo: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  gridThree: { marginTop: 6, flexDirection: 'row', gap: 11 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pulse: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#111827', opacity: 0.12 },
  loadingText: { color: '#6B7280', marginTop: 8 },
});
