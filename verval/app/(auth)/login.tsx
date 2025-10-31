// src/screens/LoginScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { useTranslation } from "react-i18next";

// Navegação tipada
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Ícones (se não quiser instalar agora, troque por <Text>👁</Text>)
import { Eye, EyeOff } from "lucide-react-native";

// Seu AuthContext real
import { useAuth } from "../../contexts/AuthContext";

// ----- ROTAS TIPADAS -----
type RootStackParamList = {
  Dashboard: undefined;
  AlterarSenha: { email: string };
  CriarUsuario: undefined;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LS_EMAIL_KEY = "app.login.email";
const LS_SENHA_KEY = "app.login.senha";

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { login, usuario } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  // Carrega credenciais salvas
  useEffect(() => {
    (async () => {
      try {
        const [savedEmail, savedSenha] = await Promise.all([
          AsyncStorage.getItem(LS_EMAIL_KEY),
          AsyncStorage.getItem(LS_SENHA_KEY),
        ]);
        if (savedEmail || savedSenha) {
          setEmail(savedEmail || "");
          setSenha(savedSenha || "");
          setRemember(true);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Se já logado, vai pro dashboard
  useEffect(() => {
    if (usuario) {
      navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    }
  }, [usuario, navigation]);

  const handleSubmit = async () => {
    const emailOk = /\S+@\S+\.\S+/.test(email);
    if (!emailOk) {
      Alert.alert(t("common.failed") || "Falhou", t("auth.emailInvalid") || "E-mail inválido");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, senha);

      // Persistência
      try {
        if (remember) {
          await AsyncStorage.setItem(LS_EMAIL_KEY, email);
          await AsyncStorage.setItem(LS_SENHA_KEY, senha);
        } else {
          await AsyncStorage.multiRemove([LS_EMAIL_KEY, LS_SENHA_KEY]);
        }
      } catch { /* ignore */ }

      // Primeiro acesso
      if (senha.trim() === "senha123") {
        Alert.alert(
          t("auth.firstAccessTitle") || "Primeiro acesso",
          t("auth.firstAccessDesc") || "Por favor, altere sua senha."
        );
        navigation.replace("AlterarSenha", { email });
        return;
      }

      Alert.alert(t("auth.loginOk") || "Login realizado");
      navigation.replace("Dashboard");
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Erro ao entrar";
      Alert.alert(t("common.failed") || "Falhou", msg);
    } finally {
      setIsLoading(false);
    }
  };

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
          <Text style={s.title}>{t("auth.signInTitle") || "Entrar"}</Text>
          <Text style={s.subtitle}>{t("auth.signInSubtitle") || "Acesse sua conta"}</Text>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>{t("auth.email") || "E-mail"}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t("auth.emailPlaceholder") || "seu@email.com"}
              editable={!isLoading}
              style={s.input}
            />
          </View>

          {/* Senha */}
          <View style={s.field}>
            <Text style={s.label}>{t("auth.password") || "Senha"}</Text>
            <View style={s.passWrap}>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!showPass}
                placeholder={t("auth.passwordPlaceholder") || "••••••••"}
                editable={!isLoading}
                style={[s.input, { paddingRight: 44 }]}
              />
              <Pressable
                onPress={() => setShowPass((v) => !v)}
                disabled={isLoading}
                style={s.eyeBtn}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </Pressable>
            </View>
          </View>

          {/* Remember + Trial (sem 'gap') */}
          <View style={s.rowBetween}>
            <Pressable
              onPress={() => setRemember((v) => !v)}
              disabled={isLoading}
              style={s.rememberWrap}
            >
              <Checkbox value={remember} onValueChange={setRemember} />
              <Text style={s.rememberLabel}>
                {t("auth.rememberSession") || "Lembrar neste dispositivo"}
              </Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate("CriarUsuario")} disabled={isLoading}>
              <Text style={s.trialLink}>{t("auth.trialLabel") || "Criar conta / Trial"}</Text>
            </Pressable>
          </View>

          {/* Botão */}
          <Pressable onPress={handleSubmit} disabled={isLoading} style={s.button}>
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <Text style={s.buttonText}>{t("auth.signInCta") || "Entrar"}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
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
  rowBetween: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8,
  },
  rememberWrap: { flexDirection: "row", alignItems: "center" },
  rememberLabel: { fontSize: 13, color: "#374151", marginLeft: 8 },
  trialLink: { color: "#111827", fontWeight: "600" },
  button: { marginTop: 12, backgroundColor: "#111827", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
});
