// src/services/lancamentoService.ts

export type TipoLancamento = "Entrada" | "Saida";

export type Recorrencia =
  | { tipo: "Nenhuma" }
  | { tipo: "MensalIndefinida" }
  | { tipo: "Parcelado"; parcelas: number }
  | { tipo: "MensalFixa"; fim: string }; // ISO-8601

export interface Lancamento {
  id: string;
  usuarioId: string;
  funcionarioId: string | null; // <---
  tipo: TipoLancamento;
  nome: string;
  valor: number;
  custo?: number;
  lucro?: number;
  categoria?: string;
  descricao?: string;
  data: string; // ISO-8601
  recorrencia?: Recorrencia;
  // campos opcionais (se existirem no seu backend)
  contaId?: string;
  contaNome?: string;
}

export interface CreateLancamentoInput {
  usuarioId: string;
  funcionarioId: string | null; // <---
  tipo: TipoLancamento;
  nome: string;
  valor: number;
  custo?: number;
  lucro?: number; // <<< AQUI
  categoria?: string;
  descricao?: string;
  data: string | Date; // aceita Date aqui
  recorrencia?:
  | Recorrencia
  | {
    // aceita versions com Date no fim
    tipo: "MensalFixa";
    fim: string | Date;
  }
  | {
    tipo: "Parcelado";
    parcelas: number;
  }
  | { tipo: "Nenhuma" }
  | { tipo: "MensalIndefinida" };
}

export interface ComparacaoMes {
  mes: string; // "YYYY-MM"
  entradas: number;
  saias?: number; // compat: alguns mocks usavam 'saias'
  saidas: number;
}
export interface UpdateLancamentoInput extends Partial<CreateLancamentoInput> { }

export interface Indicadores {
  entrouDia: number;
  entrouSemana: number;
  entrouMes: number;
  saldoTotal: number;
  totalEntradas: number;
  totalSaidas: number;
  comparacaoMeses: ComparacaoMes[];
  // campos opcionais que seu dashboard usa se disponíveis:
  porConta?: { conta: string; entradas: number; saidas: number }[];
  topCategoriasEntradas?: { categoria: string; total: number }[];
  topCategoriasSaidas?: { categoria: string; total: number }[];
}

export type ListFilter = { usuarioId?: string; tipo?: TipoLancamento };

export interface IndicadoresFiltro {
  inicio: string; // "YYYY-MM-DD"
  fim: string; // "YYYY-MM-DD"
  contaId?: string;
  tipo?: TipoLancamento;
}

export type Conta = { id: string; nome: string };

// src/services/lancamentoService.ts
const BASE = Constants.expoConfig?.extra?.API_BASE_URL ?? ""; // ex.: "http://localhost:3333"
const API_BASE = `${BASE}/api/lancamentos`;
const CONTAS_BASE = `${BASE}/api/contas`;

/* -------------------- utils -------------------- */

function toISO(v: Date | string | undefined): string | undefined {
  if (!v) return undefined;
  return v instanceof Date ? v.toISOString() : v;
}

function serializeBody(input: any) {
  const { recorrencia, data, lucro, ...rest } = input; // <<< remove lucro do payload
  const payload: any = {
    ...rest,
    ...(typeof data !== "undefined" ? { data: toISO(data) } : {}),
  };
  if (recorrencia) {
    if (recorrencia.tipo === "MensalFixa") {
      payload.recorrencia = {
        tipo: "MensalFixa",
        fim: toISO(recorrencia.fim)!,
      };
    } else if (recorrencia.tipo === "Parcelado") {
      payload.recorrencia = {
        tipo: "Parcelado",
        parcelas: recorrencia.parcelas,
      };
    } else {
      payload.recorrencia = recorrencia; // Nenhuma | MensalIndefinida
    }
  }
  for (const k of Object.keys(payload)) {
    if (typeof payload[k] === "undefined") delete payload[k];
  }
  return payload;
}

export async function http<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  console.log("[HTTP] ->", input, init?.method ?? "GET");
  const res = await fetch(input, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  const isJSON = res.headers.get("Content-Type")?.includes("application/json");
  const data = isJSON ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data as T;
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== "undefined" && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

import { randomUUID } from "crypto";
import Constants from "expo-constants";

/* -------------------- service -------------------- */
function normalizeRecorrencia(
  rec?: CreateLancamentoInput["recorrencia"]
): Recorrencia | undefined {
  if (!rec) return undefined;
  if (rec.tipo === "MensalFixa") {
    return { tipo: "MensalFixa", fim: toISO(rec.fim as any) };
  }
  if (rec.tipo === "Parcelado") {
    return { tipo: "Parcelado", parcelas: rec.parcelas };
  }
  if (rec.tipo === "MensalIndefinida") return { tipo: "MensalIndefinida" };
  if (rec.tipo === "Nenhuma") return { tipo: "Nenhuma" };
  return undefined;
}

 const toArray = (json: unknown): Lancamento[] => {
  if (Array.isArray(json)) return json as Lancamento[];
  if (json && Array.isArray((json as any).items)) return (json as any).items as Lancamento[];
  if (json && Array.isArray((json as any).data))  return (json as any).data  as Lancamento[];
  return [];
};

export const lancamentoService = {
  /* ========= CRUD ========= */

  async create(
    input: Omit<Lancamento, "id" | "data" | "recorrencia"> & {
      data: Date | string;
      recorrencia?:
      | { tipo: "Nenhuma" }
      | { tipo: "MensalIndefinida" }
      | { tipo: "Parcelado"; parcelas: number }
      | { tipo: "MensalFixa"; fim: Date | string };
      // pode ter lucro no type do form, mas será ignorado no payload
      lucro?: number;
    }
  ): Promise<Lancamento> {
    const body = serializeBody(input); // aqui já saiu sem 'lucro'
    return http<Lancamento>(API_BASE, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async list(filter?: ListFilter): Promise<Lancamento[]> {
    const query = qs({ usuarioId: filter?.usuarioId, tipo: filter?.tipo });
    try {
      // use unknown e normalize depois — evita confiar cegamente no shape
      const json = await http<unknown>(`${API_BASE}${query}`);
      return toArray(json);
    } catch (err) {
      console.error("[lancamentoService.list] erro:", err);
      return []; // 👈 nunca propague null/undefined
    }
  },

  async getById(id: string): Promise<Lancamento> {
    return http<Lancamento>(`${API_BASE}/${encodeURIComponent(id)}`);
  },

  async update(
    id: string,
    patch: Partial<Lancamento> & {
      data?: Date | string;
      recorrencia?:
      | { tipo: "Nenhuma" }
      | { tipo: "MensalIndefinida" }
      | { tipo: "Parcelado"; parcelas: number }
      | { tipo: "MensalFixa"; fim: Date | string };
    }
  ): Promise<Lancamento> {
    const body = serializeBody(patch);
    return http<Lancamento>(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async patch(
    id: string,
    patch: Partial<Lancamento> & {
      data?: Date | string;
      recorrencia?:
      | { tipo: "Nenhuma" }
      | { tipo: "MensalIndefinida" }
      | { tipo: "Parcelado"; parcelas: number }
      | { tipo: "MensalFixa"; fim: Date | string };
    }
  ): Promise<Lancamento> {
    const body = serializeBody(patch);
    return http<Lancamento>(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async remove(id: string): Promise<void> {
    await http<void>(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  /* ========= Indicadores =========
   * Tenta dois formatos:
   *  A) GET /api/lancamentos/indicadores?usuarioId=... [com filtros opcionais]
   *  B) GET /api/lancamentos/indicadores/:usuarioId   [com filtros opcionais]
   */

  async listarIndicadores(usuarioId: string): Promise<Indicadores> {
    console.log("entrou no listar indicadores");
    const q = qs({ usuarioId });
    try {
      // Formato A
      return await http<Indicadores>(`${API_BASE}/indicadores${q}`);
    } catch (e: any) {
      // Fallback: Formato B
      return http<Indicadores>(
        `${API_BASE}/indicadores/${encodeURIComponent(usuarioId)}`
      );
    }
  },

  async listarIndicadoresFiltrado(
    usuarioId: string,
    f: IndicadoresFiltro
  ): Promise<Indicadores> {
    const q = qs({
      usuarioId,
      inicio: f.inicio,
      fim: f.fim,
      contaId: f.contaId,
      tipo: f.tipo,
    });
    try {
      // Formato A
      return await http<Indicadores>(`${API_BASE}/indicadores${q}`);
    } catch (e: any) {
      // Fallback: Formato B
      const base = `${API_BASE}/indicadores/${encodeURIComponent(usuarioId)}`;
      return http<Indicadores>(
        `${base}${qs({
          inicio: f.inicio,
          fim: f.fim,
          contaId: f.contaId,
          tipo: f.tipo,
        })}`
      );
    }
  },

  /* ========= Contas (opcional no seu mock) =========
   * Espera:
   *  GET /api/contas?usuarioId=...
   * ou  GET /api/lancamentos/contas?usuarioId=...
   */

  async listarContas(usuarioId: string): Promise<Conta[]> {
    const q = qs({ usuarioId });
    try {
      // preferencial se você tiver uma rota dedicada a contas
      return await http<Conta[]>(`${CONTAS_BASE}/${q}`);
    } catch {
      // fallback: se decidiu expor via /lancamentos/contas
      return http<Conta[]>(`${API_BASE}/contas${q}`);
    }
  },
};
