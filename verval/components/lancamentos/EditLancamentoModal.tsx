// components/lancamentos/EditLancamentoModal.tsx
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { lancamentoService, type Lancamento, type TipoLancamento } from '@/services/lancamentoService';
import { FontAwesome } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LabeledInput } from './LabeledInput';

type Props = {
  visible: boolean;
  initial: Lancamento | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditLancamentoModal({ visible, initial, onClose, onSaved }: Props) {
  const { t } = useTranslation('lanc');
  const { usuario } = useAuth();

  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const C = Colors[scheme ?? 'light'];
  const s = useMemo(() => makeStyles(C, isDark), [C, isDark]);

  const [tipo, setTipo] = useState<TipoLancamento>(initial?.tipo || 'Entrada');
  const [nome, setNome] = useState(initial?.nome || '');
  const [valor, setValor] = useState(String(initial?.valor ?? ''));
  const [custo, setCusto] = useState(String(initial?.custo ?? ''));
  const [categoria, setCategoria] = useState(initial?.categoria || '');
  const [descricao, setDescricao] = useState(initial?.descricao || '');

  // mede o header para calibrar o offset
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setTipo(initial?.tipo || 'Entrada');
    setNome(initial?.nome || '');
    setValor(String(initial?.valor ?? ''));
    setCusto(String(initial?.custo ?? ''));
    setCategoria(initial?.categoria || '');
    setDescricao(initial?.descricao || '');
  }, [visible, initial?.id]);

  const salvar = useCallback(async () => {
    try {
      if (!usuario?.id) throw new Error(t('errors.unauthenticated'));
      const payload = {
        usuarioId: usuario.id,
        tipo,
        nome: nome.trim(),
        valor: parseFloat(valor) || 0,
        custo: tipo === 'Entrada' ? parseFloat(custo) || 0 : 0,
        categoria: categoria || undefined,
        descricao: descricao || undefined,
        data: initial?.data ?? new Date().toISOString(),
      } as any;

      if (initial) await lancamentoService.update(initial.id, payload);
      else await lancamentoService.create(payload);

      onSaved();
    } catch (e: any) {
      Alert.alert(t('error'), String(e?.message || t('saveError')));
    }
  }, [usuario?.id, tipo, nome, valor, custo, categoria, descricao, initial, onSaved, t]);

  const accId = 'numeric-done-accessory';

  // 👇 AQUI é o pulo do gato: quanto MAIOR esse offset, MENOS o conteúdo sobe.
  // somo o topo seguro + a altura do header + uma gordura pequena
  const keyboardOffset =
    (Platform.OS === 'ios' ? insets.top : 0) + headerH + -200;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tocar fora fecha o teclado */}
      <View
        style={s.modalBackdrop}
        onStartShouldSetResponder={() => true}
        onResponderStart={() => Keyboard.dismiss()}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
          style={{ width: '100%' }}
        >
          <View style={s.modalCard}>
            <View
              style={s.modalHeader}
              onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
            >
              <Text style={s.modalTitle}>
                {initial ? t('actions.edit') : t('actions.new')}
              </Text>
              <Pressable onPress={onClose} style={s.iconBtn}>
                <FontAwesome name="close" size={20} color={isDark ? '#fff' : C.textStrong} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={false}  // evita "dobrar" ajuste
              contentContainerStyle={{ paddingBottom: insets.bottom + 6 }} // pouco respiro embaixo
            >
              {/* Tipo */}
              <View style={s.fieldRow}>
                <Pressable
                  style={[s.chip, tipo === 'Entrada' && s.chipActive]}
                  onPress={() => setTipo('Entrada')}
                >
                  <Text style={[s.chipText, tipo === 'Entrada' && s.chipTextActive]}>
                    {t('entry')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.chip, tipo === 'Saida' && s.chipActive]}
                  onPress={() => setTipo('Saida')}
                >
                  <Text style={[s.chipText, tipo === 'Saida' && s.chipTextActive]}>
                    {t('exit')}
                  </Text>
                </Pressable>
              </View>

              <LabeledInput
                label={t('form.name')}
                value={nome}
                onChangeText={setNome}
                placeholder={t('placeholders.description')}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label={t('form.amount')}
                    value={valor}
                    onChangeText={setValor}
                    inputMode="decimal"
                    keyboardType={Platform.select({ ios: 'decimal-pad', android: 'decimal-pad', default: 'numeric' })}
                    placeholder={'0,00'}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    {...(Platform.OS === 'ios' ? { inputAccessoryViewID: accId } : {})}
                  />
                </View>

                {tipo === 'Entrada' ? (
                  <View style={{ flex: 1 }}>
                    <LabeledInput
                      label={t('table.cost')}
                      value={custo}
                      onChangeText={setCusto}
                      inputMode="decimal"
                      keyboardType={Platform.select({ ios: 'decimal-pad', android: 'decimal-pad', default: 'numeric' })}
                      placeholder={'0,00'}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={() => Keyboard.dismiss()}
                      {...(Platform.OS === 'ios' ? { inputAccessoryViewID: accId } : {})}
                    />
                  </View>
                ) : null}
              </View>

              <LabeledInput
                label={t('table.category')}
                value={categoria}
                onChangeText={setCategoria}
                placeholder={t('placeholders.exampleCategory')}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <LabeledInput
                label={t('form.description')}
                value={descricao}
                onChangeText={setDescricao}
                placeholder={t('placeholders.optional')}
                multiline
              />

              <View style={s.actionsRow}>
                <Pressable onPress={onClose} style={[s.btn, s.btnGhost]}>
                  <Text style={[s.btnText, s.btnGhostText]}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable onPress={salvar} style={[s.btn, s.btnPrimary]}>
                  <Text style={[s.btnText, { color: C.primaryText }]}>{t('actions.saveChanges')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* iOS: barra “Concluir” para teclado numérico */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accId}>
          <View style={[s.accBar, { borderColor: C.border, backgroundColor: C.card }]}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => Keyboard.dismiss()} style={s.accBtn}>
              <Text style={[s.accBtnText]}>Concluir</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </Modal>
  );
}

function makeStyles(C: typeof Colors.light, isDark: boolean) {
  const textOnBg = isDark ? '#fff' : C.textStrong;

  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: C.card,
      width: '100%',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      maxHeight: '92%',
      borderWidth: 1,
      borderColor: C.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: textOnBg },
    fieldRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },

    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 9999,
      backgroundColor: C.chipBg,
      borderWidth: 1,
      borderColor: C.border,
    },
    chipActive: { backgroundColor: C.primary, borderColor: C.primary },
    chipText: { color: textOnBg, fontWeight: '600' },
    chipTextActive: { color: C.primaryText },

    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    btnGhost: { backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border },
    btnGhostText: { color: textOnBg },
    btnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
    btnText: { fontWeight: '700', color: textOnBg },
    iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },

    // iOS accessory
    accBar: {
      borderTopWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    accBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: C.primary,
    },
    accBtnText: {
      color: C.primaryText,
      fontWeight: '700',
    },
  });
}
