// src/services/lancamentoService.ts
import Constants from "expo-constants";

/* ===================== Tipos ===================== */

export type TipoLancamento = "Entrada" | "Saida";

export type Recorrencia =
  | { tipo: "Nenhuma" }
  | { tipo: "MensalIndefinida" }
  | { tipo: "Parcelado"; parcelas: number }
  | { tipo: "MensalFixa"; fim: string }; // ISO-8601

export interface Lancamento {
  id: string;
  usuarioId: string;
  funcionarioId: string | null;
  tipo: TipoLancamento;
  nome: string;
  valor: number;
  custo?: number;
  lucro?: number;
  categoria?: string;
  descricao?: string;
  data: string; // ISO-8601
  recorrencia?: Recorrencia;
  contaId?: string;
  contaNome?: string;
}

export interface CreateLancamentoInput {
  usuarioId?: string;              // << pode vir vazio; iremos preencher com o usuário atual
  funcionarioId: string | null;
  tipo: TipoLancamento;
  nome: string;
  valor: number;
  custo?: number;
  lucro?: number;                  // ignorado no payload
  categoria?: string;
  descricao?: string;
  data: string | Date;
  recorrencia?:
    | Recorrencia
    | { tipo: "MensalFixa"; fim: string | Date }
    | { tipo: "Parcelado"; parcelas: number }
    | { tipo: "Nenhuma" }
    | { tipo: "MensalIndefinida" };
}

export interface ComparacaoMes {
  mes: string; // "YYYY-MM"
  entradas: number;
  saias?: number; // compat
  saidas: number;
}

export interface UpdateLancamentoInput extends Partial<CreateLancamentoInput> {}

export interface Indicadores {
  entrouDia: number;
  entrouSemana: number;
  entrouMes: number;
  saldoTotal: number;
  totalEntradas: number;
  totalSaidas: number;
  comparacaoMeses: ComparacaoMes[];
  porConta?: { conta: string; entradas: number; saidas: number }[];
  topCategoriasEntradas?: { categoria: string; total: number }[];
  topCategoriasSaidas?: { categoria: string; total: number }[];
}

export type ListFilter = { usuarioId?: string; tipo?: TipoLancamento };

export interface IndicadoresFiltro {
  inicio: string; // YYYY-MM-DD
  fim: string;    // YYYY-MM-DD
  contaId?: string;
  tipo?: TipoLancamento;
}

export type Conta = { id: string; nome: string };

/* ===================== Config/API ===================== */

const BASE =
  Constants.expoConfig?.extra?.API_BASE_URL ??
  "https://chatfinanceiro.com/grana";

const API_BASE = `${BASE}/api/lancamentos`;
const CONTAS_BASE = `${BASE}/api/contas`;

/* ===================== Sessão atual (usuario + token) ===================== */

let CURRENT_USER_ID: string | null = null;
let AUTH_TOKEN: string | null = null;

/** Defina assim que tiver o usuário autenticado: setUsuarioAtual(usuario?.id ?? null) */
export function setUsuarioAtual(usuarioId: string | null) {
  CURRENT_USER_ID = usuarioId || null;
}

/** Defina o token para enviar Authorization: Bearer ... automaticamente */
export function setAuthToken(token: string | null) {
  AUTH_TOKEN = token || null;
}

/** Obtém o userId (param > CURRENT_USER_ID). Lança se nenhum disponível. */
function requireUserId(explicit?: string): string {
  const id = explicit ?? CURRENT_USER_ID ?? "";
  if (!id) throw new Error("[lancamentoService] Usuario não definido. Chame setUsuarioAtual(id).");
  return id;
}

/* ===================== Utils ===================== */

function toISO(v: Date | string | undefined): string | undefined {
  if (!v) return undefined;
  return v instanceof Date ? v.toISOString() : v;
}

function serializeBody(input: any) {
  const { recorrencia, data, lucro, ...rest } = input; // remove 'lucro' do payload
  const payload: any = {
    ...rest,
    ...(typeof data !== "undefined" ? { data: toISO(data) } : {}),
  };
  if (recorrencia) {
    if (recorrencia.tipo === "MensalFixa") {
      payload.recorrencia = { tipo: "MensalFixa", fim: toISO((recorrencia as any).fim)! };
    } else if (recorrencia.tipo === "Parcelado") {
      payload.recorrencia = { tipo: "Parcelado", parcelas: (recorrencia as any).parcelas };
    } else {
      payload.recorrencia = recorrencia;
    }
  }
  for (const k of Object.keys(payload)) {
    if (typeof payload[k] === "undefined") delete payload[k];
  }
  return payload;
}

export async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  console.log("[HTTP] ->", input, init?.method ?? "GET");
  const res = await fetch(input, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  const isJSON = res.headers.get("Content-Type")?.includes("application/json");
  const data = isJSON ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status} ${res.statusText}`;
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

/* (Opcional) se quiser normalizar recorrencia vinda de fora */
function normalizeRecorrencia(
  rec?: CreateLancamentoInput["recorrencia"]
): Recorrencia | undefined {
  if (!rec) return undefined;
  if (rec.tipo === "MensalFixa") return { tipo: "MensalFixa", fim: toISO((rec as any).fim)! };
  if (rec.tipo === "Parcelado") return { tipo: "Parcelado", parcelas: (rec as any).parcelas };
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

/* ===================== Service ===================== */

export const lancamentoService = {
  /* --------- CRUD --------- */

  async create(
    input: Omit<Lancamento, "id" | "data" | "recorrencia"> & {
      data: Date | string;
      recorrencia?:
        | { tipo: "Nenhuma" }
        | { tipo: "MensalIndefinida" }
        | { tipo: "Parcelado"; parcelas: number }
        | { tipo: "MensalFixa"; fim: Date | string };
      lucro?: number; // ignorado no payload
    }
  ): Promise<Lancamento> {
    // garante usuarioId no body
    const usuarioId = requireUserId(input.usuarioId);
    const body = serializeBody({ ...input, usuarioId });
    return http<Lancamento>(API_BASE, { method: "POST", body: JSON.stringify(body) });
  },

  async list(filter?: ListFilter): Promise<Lancamento[]> {
    // se não veio usuarioId, usa o atual
    const usuarioId = requireUserId(filter?.usuarioId);
    const query = qs({ usuarioId, tipo: filter?.tipo });
    try {
      const json = await http<unknown>(`${API_BASE}${query}`);
      return toArray(json);
    } catch (err) {
      console.error("[lancamentoService.list] erro:", err);
      return [];
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
    // mantém/força usuarioId no patch se necessário
    const usuarioId = requireUserId(patch.usuarioId);
    const body = serializeBody({ ...patch, usuarioId });
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
    const usuarioId = requireUserId(patch.usuarioId);
    const body = serializeBody({ ...patch, usuarioId });
    return http<Lancamento>(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async remove(id: string): Promise<void> {
    await http<void>(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  /* --------- Indicadores --------- 
   * A) GET /api/lancamentos/indicadores?usuarioId=...
   * B) GET /api/lancamentos/indicadores/:usuarioId
   */

  async listarIndicadores(usuarioIdParam?: string): Promise<Indicadores> {
    const usuarioId = requireUserId(usuarioIdParam);
    const q = qs({ usuarioId });
    try {
      return await http<Indicadores>(`${API_BASE}/indicadores${q}`);
    } catch {
      return http<Indicadores>(`${API_BASE}/indicadores/${encodeURIComponent(usuarioId)}`);
    }
  },

  async listarIndicadoresFiltrado(
    usuarioIdParam: string | undefined,
    f: IndicadoresFiltro
  ): Promise<Indicadores> {
    const usuarioId = requireUserId(usuarioIdParam);
    const q = qs({
      usuarioId,
      inicio: f.inicio,
      fim: f.fim,
      contaId: f.contaId,
      tipo: f.tipo,
    });
    try {
      return await http<Indicadores>(`${API_BASE}/indicadores${q}`);
    } catch {
      const base = `${API_BASE}/indicadores/${encodeURIComponent(usuarioId)}`;
      return http<Indicadores>(
        `${base}${qs({ inicio: f.inicio, fim: f.fim, contaId: f.contaId, tipo: f.tipo })}`
      );
    }
  },

  /* --------- Contas ---------
   * GET /api/contas?usuarioId=...
   * fallback: GET /api/lancamentos/contas?usuarioId=...
   */

  async listarContas(usuarioIdParam?: string): Promise<Conta[]> {
    const usuarioId = requireUserId(usuarioIdParam);
    const q = qs({ usuarioId });
    try {
      // corrigido: sem barra antes do querystring
      return await http<Conta[]>(`${CONTAS_BASE}${q}`);
    } catch {
      return http<Conta[]>(`${API_BASE}/contas${q}`);
    }
  },
};
