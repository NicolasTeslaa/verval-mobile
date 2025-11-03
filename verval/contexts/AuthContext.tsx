import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { usuarioService, type Usuario, type LoginResult } from "../services/usuarioService";
import { setUsuarioAtual, setAuthToken } from "../services/lancamentoService";

type Perfil = "admin" | "usuario";
type MaybePerfil = Perfil | null;

interface AuthContextType {
  usuario: Usuario | null;
  perfil: MaybePerfil;
  isLoading: boolean;        // bootstrap/loading de chamadas auth
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  // extra opcional
  accessToken: string | null;
  refreshSession: () => Promise<void>; // tenta renovar sessão ao abrir o app
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keys de armazenamento
const KS_USER = "verval_user";
const KS_PERFIL = "verval_perfil";
const SS_ACCESS = "verval_access_token";
const SS_REFRESH = "verval_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [perfil, setPerfil] = useState<MaybePerfil>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap: carrega sessão salva e tenta refrescar
  useEffect(() => {
    (async () => {
      try {
        const [userRaw, perfilRaw, acc, ref] = await Promise.all([
          AsyncStorage.getItem(KS_USER),
          AsyncStorage.getItem(KS_PERFIL),
          SecureStore.getItemAsync(SS_ACCESS),
          SecureStore.getItemAsync(SS_REFRESH),
        ]);

        if (userRaw && perfilRaw && (acc || ref)) {
          const userObj: Usuario = JSON.parse(userRaw);
          setUsuario(userObj);
          setPerfil(perfilRaw as Perfil);
          setAccessToken(acc ?? null);

          // Propaga para a service (mesmo se token vier vazio inicialmente)
          setUsuarioAtual(userObj?.id ?? null);
          setAuthToken(acc ?? null);

          // tenta renovar token silenciosamente (opcional)
          if (!acc && ref) {
            await tryRefresh(ref);
          }
        } else {
          // sem sessão: garante limpar na service
          setUsuarioAtual(null);
          setAuthToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const tryRefresh = async (refreshToken: string) => {
    try {
      const refreshed = await usuarioService.refresh(refreshToken);
      setAccessToken(refreshed.accessToken);
      setAuthToken(refreshed.accessToken); // <- reflete na service
      await SecureStore.setItemAsync(SS_ACCESS, refreshed.accessToken);
      if (refreshed.refreshToken) {
        await SecureStore.setItemAsync(SS_REFRESH, refreshed.refreshToken);
      }
    } catch {
      // refresh falhou — mantém estado atual; usuário fará login manual
    }
  };

  const login = async (email: string, senha: string) => {
    const res: LoginResult = await usuarioService.login(email, senha);

    // estado em memória
    setUsuario(res.usuario);
    setPerfil(res.perfil as Perfil);
    setAccessToken(res.accessToken ?? null);

    // propaga para a service imediatamente
    setUsuarioAtual(res.usuario?.id ?? null);
    setAuthToken(res.accessToken ?? null);

    // persistência
    await Promise.all([
      AsyncStorage.setItem(KS_USER, JSON.stringify(res.usuario)),
      AsyncStorage.setItem(KS_PERFIL, res.perfil),
      res.accessToken
        ? SecureStore.setItemAsync(SS_ACCESS, res.accessToken)
        : SecureStore.deleteItemAsync(SS_ACCESS),
      res.refreshToken
        ? SecureStore.setItemAsync(SS_REFRESH, res.refreshToken)
        : SecureStore.deleteItemAsync(SS_REFRESH),
    ]);
  };

  const logout = async () => {
    setUsuario(null);
    setPerfil(null);
    setAccessToken(null);

    // limpa na service
    setUsuarioAtual(null);
    setAuthToken(null);

    await Promise.all([
      AsyncStorage.multiRemove([KS_USER, KS_PERFIL]),
      SecureStore.deleteItemAsync(SS_ACCESS),
      SecureStore.deleteItemAsync(SS_REFRESH),
    ]);
  };

  const refreshSession = async () => {
    const ref = await SecureStore.getItemAsync(SS_REFRESH);
    if (ref) await tryRefresh(ref);
  };

  // Segurança extra: se usuario/token mudarem por qualquer motivo, reflita na service
  useEffect(() => {
    setUsuarioAtual(usuario?.id ?? null);
  }, [usuario?.id]);

  useEffect(() => {
    setAuthToken(accessToken ?? null);
  }, [accessToken]);

  const value = useMemo<AuthContextType>(
    () => ({ usuario, perfil, isLoading, login, logout, accessToken, refreshSession }),
    [usuario, perfil, isLoading, accessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
