import { Text } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import { lancamentoService, type Lancamento, type TipoLancamento } from '@/services/lancamentoService';
import { FontAwesome } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { LabeledInput } from './LabeledInput';
import { useLocale } from './utils';

type Props = {
  visible: boolean;
  initial: Lancamento | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditLancamentoModal({ visible, initial, onClose, onSaved }: Props) {
  const { t } = useTranslation('lanc'); // << namespace único
  const { usuario } = useAuth();
  const { fmtMoney } = useLocale();

  const [tipo, setTipo] = useState<TipoLancamento>(initial?.tipo || 'Entrada');
  const [nome, setNome] = useState(initial?.nome || '');
  const [valor, setValor] = useState(String(initial?.valor ?? ''));
  const [custo, setCusto] = useState(String(initial?.custo ?? ''));
  const [categoria, setCategoria] = useState(initial?.categoria || '');
  const [descricao, setDescricao] = useState(initial?.descricao || '');

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {initial ? t('actions.edit') : t('actions.new')}
            </Text>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <FontAwesome name="close" size={20} />
            </Pressable>
          </View>

          {/* Tipo */}
          <View style={styles.fieldRow}>
            <Pressable style={[styles.chip, tipo === 'Entrada' && styles.chipActive]} onPress={() => setTipo('Entrada')}>
              <Text style={[styles.chipText, tipo === 'Entrada' && styles.chipTextActive]}>{t('entry')}</Text>
            </Pressable>
            <Pressable style={[styles.chip, tipo === 'Saida' && styles.chipActive]} onPress={() => setTipo('Saida')}>
              <Text style={[styles.chipText, tipo === 'Saida' && styles.chipTextActive]}>{t('exit')}</Text>
            </Pressable>
          </View>

          <LabeledInput
            label={t('form.name')}
            value={nome}
            onChangeText={setNome}
            placeholder={t('placeholders.description')}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <LabeledInput
                label={t('form.amount')}
                value={valor}
                onChangeText={setValor}
                keyboardType="decimal-pad"
                placeholder={fmtMoney(0)}
              />
            </View>
            {tipo === 'Entrada' ? (
              <View style={{ flex: 1 }}>
                <LabeledInput
                  label={t('table.cost')}
                  value={custo}
                  onChangeText={setCusto}
                  keyboardType="decimal-pad"
                  placeholder={fmtMoney(0)}
                />
              </View>
            ) : null}
          </View>

          <LabeledInput
            label={t('table.category')}
            value={categoria}
            onChangeText={setCategoria}
            placeholder={t('placeholders.exampleCategory')}
          />
          <LabeledInput
            label={t('form.description')}
            value={descricao}
            onChangeText={setDescricao}
            placeholder={t('placeholders.optional')}
            multiline
          />

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnText, styles.btnGhostText]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={salvar} style={[styles.btn, styles.btnPrimary]}>
              <Text style={[styles.btnText, { color: '#fff' }]}>{t('actions.saveChanges')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#111827' },
  chipText: { color: '#111827', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnGhostText: { color: '#111827' },
  btnPrimary: { backgroundColor: '#111827' },
  btnText: { fontWeight: '700' },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
});
