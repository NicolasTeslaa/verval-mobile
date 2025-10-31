import Constants from "expo-constants";
import { http } from "./lancamentoService";

// Base global da API de usuários
const BASE = Constants.expoConfig?.extra?.API_BASE_URL ?? ""; // ex.: "http://localhost:3333"
const USUARIOS_API_BASE = `${BASE}/api/usuarios`;

type LoginResponse = {
  user?: Usuario; // se seu backend responde como { user: {...} }
  usuario?: Usuario; // caso responda como { usuario: {...} }
  token?: string; // opcional, se você retornar JWT
};

export type LoginResult = {
  usuario: Usuario;
  perfil: "admin" | "usuario";
  accessToken?: string;   // JWT de acesso (curta duração)
  refreshToken?: string;  // refresh token (longa duração)
};

export interface Usuario {
  id?: string;
  nome: string;
  email: string;
  telefone?: string;
  status: "Ativo" | "Inativo";
  isAdmin: boolean;
  senha?: string;
}
const toArray = <T,>(json: unknown): T[] => {
  if (Array.isArray(json)) return json as T[];
  if (json && Array.isArray((json as any).items)) return (json as any).items as T[];
  if (json && Array.isArray((json as any).data)) return (json as any).data as T[];
  if (json && Array.isArray((json as any).results)) return (json as any).results as T[];
  return [];
};

export const usuarioService = {
  // dentro de usuarioService
  async login(email: string, senha: string): Promise<LoginResult> {
    const url = `${USUARIOS_API_BASE}/login`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Em mobile evite cookies; use JWT Bearer
      body: JSON.stringify({ email, senha }),
    });

    // Tenta ler o corpo (pode não ser JSON em erro)
    let payload: any = null;
    const text = await res.text();
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      // mantém payload como texto cru se não for JSON
      payload = text || null;
    }

    if (!res.ok) {
      const msg =
        (payload && (payload.error || payload.message)) ||
        `Falha no login (HTTP ${res.status})`;
      throw new Error(msg);
    }

    // Aceita múltiplos formatos de resposta do backend
    // { user } ou { usuario } (ou mesmo aninhado em { data: {...} })
    const data = payload?.data ?? payload;
    const usuario: Usuario = data?.usuario || data?.user;

    if (!usuario) {
      throw new Error("Resposta inválida do servidor: usuário ausente.");
    }

    // Normaliza nomes de tokens
    const accessToken: string | undefined =
      data?.accessToken ?? data?.token ?? undefined;

    const refreshToken: string | undefined =
      data?.refreshToken ?? undefined;

    return {
      usuario,
      perfil: usuario.isAdmin ? "admin" : "usuario",
      accessToken,
      refreshToken,
    };
  },


  async list(): Promise<Usuario[]> {
    try {
      const json = await http<unknown>(`${USUARIOS_API_BASE}`);
      return toArray<Usuario>(json);
    } catch (err) {
      console.error("[usuariosService.list] erro:", err);
      return []; // nunca null/undefined
    }
  },

  async criarUsuario(usuario: Usuario): Promise<Usuario> {
    // POST /usuarios
    try {
      const created = await http<Usuario>(USUARIOS_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usuario),
      });
      return created;
    } catch (e: any) {
      // mapeia 409 (conflito) para mensagem clara
      if (e?.status === 409) {
        throw new Error("E-mail já cadastrado.");
      }
      throw e;
    }
  },

  async atualizarUsuario(
    id: string,
    patch: Partial<Omit<Usuario, "senha">> & { senha?: string }
  ): Promise<Usuario> {
    return http<Usuario>(`${USUARIOS_API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  },

  async excluirUsuario(id: string): Promise<void> {
    await http<void>(`${USUARIOS_API_BASE}/${id}`, { method: "DELETE" });
  },

  async alterarStatusUsuario(
    id: string,
    status: "Ativo" | "Inativo"
  ): Promise<Usuario> {
    return this.atualizarUsuario(id, { status });
  },

  async alterarSenha(
    email: string,
    senhaAtual: string,
    novaSenha: string
  ): Promise<void> {
    const res = await fetch(`${USUARIOS_API_BASE}/alterar-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, senhaAtual, novaSenha }),
    });

    let payload: { error?: string; message?: string } = {};
    try {
      payload = await res.json();
    } catch { }

    if (!res.ok) {
      throw new Error(
        payload?.error ||
        payload?.message ||
        `Falha ao alterar senha (HTTP ${res.status})`
      );
    }
  },
  
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const url = `${USUARIOS_API_BASE}/refresh`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    let payload: any = null;
    const text = await res.text();
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text || null; }

    if (!res.ok) {
      const msg =
        (payload && (payload.error || payload.message)) ||
        `Falha no refresh (HTTP ${res.status})`;
      throw new Error(msg);
    }

    const data = payload?.data ?? payload;
    if (!data?.accessToken) throw new Error("Refresh sem accessToken.");

    return {
      accessToken: data.accessToken as string,
      refreshToken: data.refreshToken as string | undefined,
    };
  },

};
