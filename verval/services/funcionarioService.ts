// src/services/funcionariosService.ts
import { http } from "@/services/lancamentoService";
import Constants from "expo-constants";

const BASE = Constants.expoConfig?.extra?.API_BASE_URL ?? ""; // ex.: "http://localhost:3333"
const FUNCIONARIOS_API_BASE = `${BASE}/api/funcionarios`;


export type StatusFuncionario = "Ativo" | "Inativo";

export interface Funcionario {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
  telefone?: string | null;
  podeLancar: boolean;
  status: StatusFuncionario;
}

type CreateFuncionario = {
  usuarioId: string;
  nome: string;
  email: string;
  senha?: string; // se não vier, mandamos "senha123"
  telefone?: string;
  podeLancar?: boolean;
  status?: StatusFuncionario;
};

type UpdateFuncionario = Partial<{
  usuarioId: string;
  nome: string;
  email: string;
  telefone: string | null; // permite null para “limpar”
  senha: string;
  podeLancar: boolean;
  status: StatusFuncionario;
}>;

 const toArray = (json: unknown): Funcionario[] => {
  if (Array.isArray(json)) return json as Funcionario[];
  if (json && Array.isArray((json as any).items)) return (json as any).items as Funcionario[];
  if (json && Array.isArray((json as any).data))  return (json as any).data  as Funcionario[];
  return [];
};

const qs = (p: Record<string, any>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const funcionariosService = {
    async list(filter?: {
    usuarioId?: string;
    status?: StatusFuncionario;
  }): Promise<Funcionario[]> {
    const query = qs({
      usuarioId: filter?.usuarioId,
      status: filter?.status,
    });

    try {
      const json = await http<unknown>(`${FUNCIONARIOS_API_BASE}${query}`);
      return toArray<Funcionario>(json);
    } catch (err) {
      console.error("[funcionariosService.list] erro:", err);
      return []; // 👈 nunca null/undefined
    }
  },

  async obter(id: string): Promise<Funcionario> {
    return http<Funcionario>(`${FUNCIONARIOS_API_BASE}/${id}`);
  },

  async criarFuncionario(input: CreateFuncionario): Promise<Funcionario> {
    const body = {
      usuarioId: input.usuarioId,
      nome: input.nome,
      email: input.email,
      senha: input.senha, // default
      ...(input.telefone ? { telefone: input.telefone } : {}),
      ...(typeof input.podeLancar === "boolean"
        ? { podeLancar: input.podeLancar }
        : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    return http<Funcionario>(FUNCIONARIOS_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async atualizarFuncionario(
    id: string,
    patch: UpdateFuncionario
  ): Promise<Funcionario> {
    const body = {
      ...(typeof patch.usuarioId === "string"
        ? { usuarioId: patch.usuarioId }
        : {}),
      ...(typeof patch.nome === "string" ? { nome: patch.nome } : {}),
      ...(typeof patch.email === "string" ? { email: patch.email } : {}),
      ...(typeof patch.telefone !== "undefined"
        ? { telefone: patch.telefone }
        : {}),
      ...(typeof patch.senha === "string" ? { senha: patch.senha } : {}),
      ...(typeof patch.podeLancar === "boolean"
        ? { podeLancar: patch.podeLancar }
        : {}),
      ...(typeof patch.status === "string" ? { status: patch.status } : {}),
    };
    return http<Funcionario>(`${FUNCIONARIOS_API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async excluirFuncionario(id: string): Promise<void> {
    await http<void>(`${FUNCIONARIOS_API_BASE}/${id}`, { method: "DELETE" });
  },

  async alterarStatusFuncionario(
    id: string,
    status: StatusFuncionario
  ): Promise<Funcionario> {
    return this.atualizarFuncionario(id, { status });
  },
};
