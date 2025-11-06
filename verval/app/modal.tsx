// app/modal.tsx
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme, useThemePref } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { setLanguage } from '@/i18n'; // 👈 importa o setter do i18n

type ThemePref = 'system' | 'light' | 'dark';
type Lang = 'pt' | 'en';

function normalizeLng(tag?: string): Lang {
  const s = (tag || '').toLowerCase();
  return s.startsWith('pt') ? 'pt' : 'en';
}

function Chip({
  active,
  label,
  onPress,
  C,
  disabled,
}: {
  active?: boolean;
  label: string;
  onPress: () => void;
  C: typeof Colors.light;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.border,
          marginRight: 8,
          marginBottom: 8,
          opacity: disabled ? 0.6 : 1,
        },
        active && { backgroundColor: C.primary, borderColor: C.primary },
      ]}
    >
      <Text
        style={[
          { fontSize: 12, fontWeight: '700', color: C.textStrong },
          active && { color: C.primaryText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsModalScreen() {
  const { t, i18n } = useTranslation('settings');
  const { usuario } = useAuth();

  // Tema atual da UI
  const scheme = useColorScheme();
  const C = Colors[scheme ?? 'light'];
  const s = useMemo(() => makeStyles(C), [C]);

  // Preferência de tema (persistida no provider)
  const { pref, setPref, ready } = useThemePref();
  const [localPref, setLocalPref] = useState<ThemePref>(pref);
  useEffect(() => { setLocalPref(pref); }, [pref]);

  // Idioma (persistido em AsyncStorage via i18n.setLanguage)
  const [localLang, setLocalLang] = useState<Lang>(normalizeLng(i18n.language));
  useEffect(() => {
    // Se o idioma global mudar fora do modal, reflete aqui
    setLocalLang(normalizeLng(i18n.language));
  }, [i18n.language]);

  // Perfil
  const [nome, setNome] = useState(usuario?.nome || '');
  const [telefone, setTelefone] = useState(
    typeof usuario?.telefone === 'string' ? usuario?.telefone : ''
  );
  const [bio, setBio] = useState((usuario as any)?.bio || '');

  const [saving, setSaving] = useState(false);

  async function salvarTudo() {
    try {
      if (!usuario?.id) throw new Error(t('errors.sessionExpired', 'Sessão expirada.'));

      setSaving(true);

      // 1) Tema
      if (ready) {
        await setPref(localPref);
      }

      // 2) Idioma
      await setLanguage(localLang); // 👈 troca idioma e persiste

      // 3) Perfil (opcional; mantém seu fallback)
      const payload = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        bio: bio.trim() || undefined,
      };

      const maybeService: any = require('@/services/lancamentoService');
      const updater =
        maybeService?.userService?.update ||
        maybeService?.updateUsuario ||
        maybeService?.atualizarPerfil;

      if (typeof updater === 'function') {
        await updater(usuario.id, payload);
      }

      Alert.alert(
        t('alerts.doneTitle', 'Pronto'),
        t('alerts.savedOk', 'Configurações salvas com sucesso.')
      );
    } catch (e: any) {
      Alert.alert(
        t('alerts.errorTitle', 'Erro'),
        String(e?.message || t('alerts.saveFailed', 'Falha ao salvar configurações.'))
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{t('title', 'Configurações')}</Text>
        <Text style={s.subtitle}>{t('subtitle', 'Aparência e preferências do sistema')}</Text>

        {/* === Aparência === */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('theme.title', 'Tema')}</Text>
          <Text style={s.cardHint}>{t('theme.hint', 'Escolha como o app deve se comportar visualmente.')}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            <Chip
              C={C}
              label={t('theme.system', 'Sistema')}
              active={localPref === 'system'}
              onPress={() => setLocalPref('system')}
              disabled={!ready || saving}
            />
            <Chip
              C={C}
              label={t('theme.light', 'Claro')}
              active={localPref === 'light'}
              onPress={() => setLocalPref('light')}
              disabled={!ready || saving}
            />
            <Chip
              C={C}
              label={t('theme.dark', 'Escuro')}
              active={localPref === 'dark'}
              onPress={() => setLocalPref('dark')}
              disabled={!ready || saving}
            />
          </View>
        </View>

        {/* === Idioma === */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('language.title', 'Idioma')}</Text>
          <Text style={s.cardHint}>{t('language.hint', 'Escolha o idioma da interface.')}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            <Chip
              C={C}
              label={t('language.pt', 'Português')}
              active={localLang === 'pt'}
              onPress={() => setLocalLang('pt')}
              disabled={saving}
            />
            <Chip
              C={C}
              label={t('language.en', 'English')}
              active={localLang === 'en'}
              onPress={() => setLocalLang('en')}
              disabled={saving}
            />
          </View>
        </View>

        {/* === Perfil === */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('profile.title', 'Perfil')}</Text>
          <Text style={s.cardHint}>{t('profile.hint', 'Atualize suas informações básicas.')}</Text>

          <View style={{ marginTop: 10 }}>
            <Text style={s.label}>{t('fields.name', 'Nome')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('placeholders.name', 'Seu nome')}
              placeholderTextColor={C.textMuted}
              value={nome}
              onChangeText={setNome}
              editable={!saving}
            />
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={s.label}>{t('fields.phone', 'Telefone')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('placeholders.phone', '(xx) xxxxx-xxxx')}
              placeholderTextColor={C.textMuted}
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              editable={!saving}
            />
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={s.label}>{t('fields.bio', 'Bio')}</Text>
            <TextInput
              style={[s.input, { height: 88, textAlignVertical: 'top' }]}
              placeholder={t('placeholders.bio', 'Ex.: Empreendedor, foco em serviços B2B')}
              placeholderTextColor={C.textMuted}
              value={bio}
              onChangeText={setBio}
              multiline
              editable={!saving}
            />
          </View>

          <View style={s.actionsRow}>
            <Pressable
              onPress={() => {
                setNome(usuario?.nome || '');
                setTelefone(typeof usuario?.telefone === 'string' ? usuario?.telefone : '');
                setBio((usuario as any)?.bio || '');
                setLocalPref(pref);
                setLocalLang(normalizeLng(i18n.language));
              }}
              style={[s.btn, s.btnGhost]}
              disabled={saving}
            >
              <Text style={[s.btnText, s.btnGhostText]}>{t('actions.discard', 'Descartar')}</Text>
            </Pressable>

            <Pressable
              onPress={salvarTudo}
              disabled={saving}
              style={[s.btn, s.btnPrimary, (saving || !ready) && { opacity: 0.7 }]}
            >
              <Text style={[s.btnText, { color: C.primaryText }]}>
                {saving ? t('actions.saving', 'Salvando...') : t('actions.save', 'Salvar')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* === Outras opções (exemplos) === */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('more.title', 'Outras opções')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            <Chip C={C} label={t('more.notifications', 'Notificações (em breve)')} onPress={() => Alert.alert(t('common.soon', 'Em breve'))} />
            {/* Removi o "Idioma (em breve)" porque agora o idioma já existe acima */}
            <Chip C={C} label={t('more.export', 'Exportar dados (em breve)')} onPress={() => Alert.alert(t('common.soon', 'Em breve'))} />
          </View>
        </View>
      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    content: { padding: 16, paddingBottom: 32 },

    title: { fontSize: 22, fontWeight: '700', color: C.textStrong },
    subtitle: { marginTop: 2, fontSize: 13, color: C.textMuted, marginBottom: 12 },

    card: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: C.textStrong },
    cardHint: { marginTop: 4, fontSize: 12, color: C.textMuted },

    label: { fontSize: 12, color: C.textMuted, fontWeight: '700', marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
      color: C.textStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },

    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    btnGhost: { backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border },
    btnGhostText: { color: C.textStrong },
    btnPrimary: { backgroundColor: C.primary },
    btnText: { fontWeight: '700', color: C.textStrong },
  });
}
