// components/recorrencia/RecorrenciaFormModal.tsx
import { FontAwesome } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { Recorrencia } from '@/services/recorrenciaService';

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  initial?: Recorrencia | null;
  onClose: () => void;
  onCreate?: (data: Omit<Recorrencia, 'id' | 'pagamentos' | 'usuarioId'>) => void;
  onUpdate?: (patch: Partial<Omit<Recorrencia, 'id' | 'pagamentos'>>) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toYMD = (d?: string | Date | null) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(+dt)) return '';
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const clampDay = (n: number) => Math.min(31, Math.max(1, Math.trunc(Number.isFinite(n) ? n : 1)));

export default function RecorrenciaFormModal({ visible, mode, initial, onClose, onCreate, onUpdate }: Props) {
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme();
  const C = Colors[scheme ?? 'light'];
  const s = useMemo(() => makeStyles(C), [C]);

  const [cliente, setCliente] = useState(initial?.cliente ?? '');
  const [valor, setValor] = useState<string>(initial?.valor != null ? String(initial.valor) : '');
  const [categoria, setCategoria] = useState(initial?.categoria ?? '');
  const [ativo, setAtivo] = useState<boolean>(initial ? !!initial.ativo : true);
  const [inicio, setInicio] = useState<string>(toYMD(initial?.inicio) || todayYMD());
  const [fim, setFim] = useState<string>(toYMD(initial?.fim) || '');
  const [diaVenc, setDiaVenc] = useState<number>(clampDay(initial?.vencimento_dia ?? new Date().getDate()));
  const [observacao, setObservacao] = useState(initial?.observacao ?? '');

  useEffect(() => {
    if (!visible) return;
    setCliente(initial?.cliente ?? '');
    setValor(initial?.valor != null ? String(initial.valor) : '');
    setCategoria(initial?.categoria ?? '');
    setAtivo(initial ? !!initial.ativo : true);
    setInicio(toYMD(initial?.inicio) || todayYMD());
    setFim(toYMD(initial?.fim) || '');
    setDiaVenc(clampDay(initial?.vencimento_dia ?? new Date().getDate()));
    setObservacao(initial?.observacao ?? '');
  }, [visible, initial?.id]);

  const fmt = useCallback((n: number) => {
    const locale = i18n.language?.startsWith('en') ? 'en-US' : 'pt-BR';
    const currency = i18n.language?.startsWith('en') ? 'USD' : 'BRL';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n || 0);
    } catch { return String(n ?? 0); }
  }, [i18n.language]);

  const submit = () => {
    const v = parseFloat((valor ?? '').replace(',', '.')) || 0;
    if (!cliente || v <= 0) {
      Alert.alert(t('error', { defaultValue: 'Erro' }), t('recorrencia.validation.missing', { defaultValue: 'Informe cliente e valor válido.' }));
      return;
    }
    const payload = {
      cliente,
      valor: v,
      categoria: categoria || undefined,
      ativo,
      inicio: inicio || null,
      fim: fim ? fim : null,
      observacao: observacao || undefined,
      vencimento_dia: clampDay(diaVenc),
      vencimento_tz: (initial?.vencimento_tz as string) || 'America/Sao_Paulo',
    } as any;

    if (mode === 'create') onCreate?.(payload);
    else onUpdate?.(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={s.backdrop}
        onStartShouldSetResponder={() => true}
        onResponderStart={() => Keyboard.dismiss()}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <View style={s.card}>
            <View style={s.header} onStartShouldSetResponder={() => true}>
              <Text style={s.title}>
                {mode === 'create'
                  ? t('recorrencia.actions.new', { defaultValue: 'Lançar Recorrência' })
                  : t('recorrencia.actions.edit', { defaultValue: 'Editar recorrência' })}
              </Text>
              <Pressable onPress={onClose} style={s.iconBtn}>
                <FontAwesome name="close" size={20} color={C.textStrong} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Cliente */}
              <Field label={t('newEntry.fields.name', { defaultValue: 'Nome' })}>
                <TextInput value={cliente} onChangeText={setCliente} placeholder={t('recorrencia.form.clientPh', { defaultValue: 'Cliente/Assinante' })} placeholderTextColor={C.textMuted} style={s.input} />
              </Field>

              {/* Valor / Categoria */}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label={t('newEntry.fields.amount', { defaultValue: 'Valor' })}>
                    <TextInput value={valor} onChangeText={setValor} inputMode="decimal" keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={C.textMuted} style={s.input} />
                  </Field>
                  <Text style={s.hint}>{t('recorrencia.form.preview', { defaultValue: 'Prévia' })}: {fmt(parseFloat(valor || '0'))}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={t('newEntry.fields.category', { defaultValue: 'Categoria' })}>
                    <TextInput value={categoria} onChangeText={setCategoria} placeholder={t('newEntry.placeholders.category', { defaultValue: 'Ex: Plano Pro' })} placeholderTextColor={C.textMuted} style={s.input} />
                  </Field>
                </View>
              </View>

              {/* Status / Início / Fim */}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label={t('recorrencia.form.status', { defaultValue: 'Status' })}>
                    <View style={s.segment}>
                      {[
                        { key: true, label: t('recorrencia.status.active', { defaultValue: 'Ativo' }) },
                        { key: false, label: t('recorrencia.status.inactive', { defaultValue: 'Inativo' }) },
                      ].map(opt => (
                        <Pressable
                          key={String(opt.key)}
                          onPress={() => setAtivo(opt.key)}
                          style={[s.segmentBtn, ativo === opt.key && s.segmentBtnActive]}
                        >
                          <Text style={[s.segmentText, ativo === opt.key && s.segmentTextActive]}>{opt.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Field>
                </View>

                <View style={{ flex: 1 }}>
                  <Field label={t('recorrencia.form.start', { defaultValue: 'Início' })}>
                    <TextInput value={inicio} onChangeText={setInicio} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} style={s.input} />
                  </Field>
                </View>

                <View style={{ flex: 1 }}>
                  <Field label={t('recorrencia.form.end', { defaultValue: 'Fim (opcional)' })}>
                    <TextInput value={fim} onChangeText={setFim} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} style={s.input} />
                  </Field>
                </View>
              </View>

              {/* Vencimento (dia) */}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label={t('recorrencia.form.dueDay', { defaultValue: 'Dia do vencimento (1–31)' })}>
                    <TextInput value={String(diaVenc)} onChangeText={(v) => setDiaVenc(clampDay(Number(v)))} inputMode="numeric" keyboardType="number-pad" placeholder="1..31" placeholderTextColor={C.textMuted} style={s.input} />
                  </Field>
                </View>
              </View>

              {/* Observação */}
              <Field label={t('recorrencia.form.description', { defaultValue: 'Descrição' })}>
                <TextInput value={observacao} onChangeText={setObservacao} placeholder={t('recorrencia.form.descriptionPh', { defaultValue: 'Detalhes da recorrência' })} placeholderTextColor={C.textMuted} style={[s.input, { height: 90, textAlignVertical: 'top' }]} multiline />
              </Field>

              {/* Ações */}
              <View style={s.actions}>
                <Pressable onPress={onClose} style={[s.btn, s.btnGhost]}>
                  <Text style={s.btnText}>{t('lanc.common.cancel', { defaultValue: 'Cancelar' })}</Text>
                </Pressable>
                <Pressable onPress={submit} style={[s.btn, s.btnPrimary]}>
                  <Text style={[s.btnText, { color: C.primaryText }]}>
                    {mode === 'create'
                      ? t('recorrencia.actions.create', { defaultValue: 'Criar' })
                      : t('recorrencia.actions.save', { defaultValue: 'Salvar' })}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 12, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'flex-end' },
    card: { backgroundColor: C.card, width: '100%', maxHeight: '92%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    title: { fontSize: 18, fontWeight: '700', color: C.textStrong },
    iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    row: { flexDirection: 'row', gap: 10 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 12, android: 8, default: 10 }), color: C.textStrong, backgroundColor: C.surface },
    hint: { fontSize: 11, color: C.textMuted, marginTop: 4 },
    segment: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    segmentBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border },
    segmentBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    segmentText: { color: C.chipText, fontWeight: '600', fontSize: 12 },
    segmentTextActive: { color: C.primaryText },
    actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    btnGhost: { backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border },
    btnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
    btnText: { fontWeight: '700', color: C.textStrong },
  });
}
