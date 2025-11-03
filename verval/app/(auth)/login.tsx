// src/screens/LoginScreen.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Expo Router (NAVEGAÇÃO POR CAMINHO)
import { router } from "expo-router";

// Ícones
import { Eye, EyeOff } from "lucide-react-native";

// AuthContext real
import { useAuth } from "../../contexts/AuthContext";

// Storage keys
const LS_EMAIL_KEY = "app.login.email";
const LS_SENHA_KEY = "app.login.senha";
const LS_REMEMBER_KEY = "app.login.remember";

export default function LoginScreen() {
  const { t } = useTranslation(["common", "auth"]);
  const { login, usuario } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [booting, setBooting] = useState(true); // evita piscar o form

  // Carrega flag + credenciais salvas
  useEffect(() => {
    (async () => {
      try {
        const [flag, savedEmail, savedSenha] = await Promise.all([
          AsyncStorage.getItem(LS_REMEMBER_KEY),
          AsyncStorage.getItem(LS_EMAIL_KEY),
          AsyncStorage.getItem(LS_SENHA_KEY),
        ]);
        const rem = flag === "1";
        setRemember(rem);
        if (rem) {
          setEmail(savedEmail || "");
          setSenha(savedSenha || "");
        }
      } catch { /* ignore */ }
      setBooting(false);
    })();
  }, []);

  // Se já logado, vai para as tabs
  useEffect(() => {
    if (usuario) {
      // No Expo Router, use o caminho do grupo de tabs
      router.replace("/(tabs)");
    }
  }, [usuario]);

  // Alterna e persiste a escolha de lembrar
  const onToggleRemember = async (value: boolean) => {
    setRemember(value);
    try {
      if (value) {
        await AsyncStorage.setItem(LS_REMEMBER_KEY, "1");
        if (email) await AsyncStorage.setItem(LS_EMAIL_KEY, email);
        if (senha) await AsyncStorage.setItem(LS_SENHA_KEY, senha);
      } else {
        await AsyncStorage.setItem(LS_REMEMBER_KEY, "0");
        await AsyncStorage.multiRemove([LS_EMAIL_KEY, LS_SENHA_KEY]);
      }
    } catch { /* ignore */ }
  };

  // Sincroniza digitação se "lembrar" estiver ativo
  useEffect(() => {
    (async () => {
      if (!remember) return;
      try { await AsyncStorage.setItem(LS_EMAIL_KEY, email); } catch {}
    })();
  }, [email, remember]);

  useEffect(() => {
    (async () => {
      if (!remember) return;
      try { await AsyncStorage.setItem(LS_SENHA_KEY, senha); } catch {}
    })();
  }, [senha, remember]);

  const handleSubmit = async () => {
    const emailOk = /\S+@\S+\.\S+/.test(email);
    if (!emailOk) {
      Alert.alert(t("common:failed") || "Falhou", t("auth:emailInvalid") || "E-mail inválido");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, senha);

      try {
        if (remember) {
          await AsyncStorage.setItem(LS_REMEMBER_KEY, "1");
          await AsyncStorage.setItem(LS_EMAIL_KEY, email);
          await AsyncStorage.setItem(LS_SENHA_KEY, senha);
        } else {
          await AsyncStorage.setItem(LS_REMEMBER_KEY, "0");
          await AsyncStorage.multiRemove([LS_EMAIL_KEY, LS_SENHA_KEY]);
        }
      } catch { /* ignore */ }

      // Primeiro acesso → leva para a tela de alterar senha
      if (senha.trim() === "senha123") {
        Alert.alert(
          t("auth:firstAccessTitle") || "Primeiro acesso",
          t("auth:firstAccessDesc") || "Por favor, altere sua senha."
        );
        // ajuste o caminho conforme seu arquivo (ex.: app/alterar-senha.tsx)
        // router.replace({ pathname: "/alterar-senha", params: { email } });
        return;
      }

      // OK → entra nas tabs
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Erro ao entrar";
      Alert.alert(t("common:failed") || "Falhou", msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (booting) {
    return (
      <View style={s.booting}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.container}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBadge}>
            <Text style={s.logoText}>$$</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.title}>{t("auth:signInTitle") || "Entrar"}</Text>
          <Text style={s.subtitle}>{t("auth:signInSubtitle") || "Acesse sua conta"}</Text>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>{t("auth:email") || "E-mail"}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t("auth:emailPlaceholder") || "seu@email.com"}
              editable={!isLoading}
              style={s.input}
            />
          </View>

          {/* Senha */}
          <View style={s.field}>
            <Text style={s.label}>{t("auth:password") || "Senha"}</Text>
            <View style={s.passWrap}>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!showPass}
                placeholder={t("auth:passwordPlaceholder") || "••••••••"}
                editable={!isLoading}
                style={[s.input, { paddingRight: 44 }]}
              />
              <Pressable onPress={() => setShowPass((v) => !v)} disabled={isLoading} style={s.eyeBtn}>
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </Pressable>
            </View>
          </View>

          {/* Remember + Criar conta */}
          <View style={s.rowBetween}>
            <Pressable onPress={() => onToggleRemember(!remember)} disabled={isLoading} style={s.rememberWrap}>
              <Checkbox value={remember} onValueChange={onToggleRemember} />
              <Text style={s.rememberLabel}>{t("auth:rememberSession") || "Lembrar neste dispositivo"}</Text>
            </Pressable>

            <Pressable 
            // onPress={() => router.push("/criar-usuario")} 
            disabled={isLoading}>
              <Text style={s.trialLink}>{t("auth:trialLabel") || "Criar conta / Trial"}</Text>
            </Pressable>
          </View>

          {/* Botão */}
          <Pressable onPress={handleSubmit} disabled={isLoading} style={s.button}>
            {isLoading ? <ActivityIndicator /> : <Text style={s.buttonText}>{t("auth:signInCta") || "Entrar"}</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  booting: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 16, justifyContent: "center", backgroundColor: "#f7f8fb" },
  logoWrap: { alignItems: "flex-start", marginBottom: 24 },
  logoBadge: {
    height: 64, width: 64, borderRadius: 16, backgroundColor: "#111827",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#111827", shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  logoText: { color: "white", fontSize: 24, fontWeight: "800" },
  card: {
    borderRadius: 16, backgroundColor: "white", padding: 16,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6b7280", marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { marginBottom: 6, color: "#374151", fontWeight: "600" },
  input: {
    backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16,
  },
  passWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", right: 10, top: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", width: 36,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8 },
  rememberWrap: { flexDirection: "row", alignItems: "center" },
  rememberLabel: { fontSize: 13, color: "#374151", marginLeft: 8 },
  trialLink: { color: "#111827", fontWeight: "600" },
  button: { marginTop: 12, backgroundColor: "#111827", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
});
