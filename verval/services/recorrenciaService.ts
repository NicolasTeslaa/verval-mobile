// src/services/recorrenciaService.ts
import Constants from "expo-constants";
import { http } from "./lancamentoService";

/** ===================== Tipos ===================== **/
export type Recorrencia = {
  id: string;
  usuarioId?: string;              // o backend retorna, mas deixamos opcional p/ compat
  cliente: string;
  valor: number;
  categoria?: string | null;
  ativo: boolean;
  inicio: string;                  // "YYYY-MM-DD"
  fim?: string | null;
  observacao?: string | null;
  pagamentos: Record<string, boolean>; // "YYYY-MM" -> pago?
};

export type RecorrenciaCreate = {
  usuarioId: string;
  cliente: string;
  valor: number;
  categoria?: string | null;
  ativo?: boolean;
  inicio: string;                  // "YYYY-MM-DD"
  fim?: string | null;
  observacao?: string | null;
};

export type RecorrenciaPatch = Partial<Omit<RecorrenciaCreate, "usuarioId">> & {
  usuarioId?: string;
};

/** ===================== Helpers de tempo (mantidos p/ compat) ===================== **/
export const ym = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const ymToDate = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
};

const clampMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export const monthsBetween = (from: Date, to: Date) => {
  const start = clampMonth(from);
  const end = clampMonth(to);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(ym(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
};

/** ===================== Base da API ===================== **/
const BASE = Constants.expoConfig?.extra?.API_BASE_URL ?? ""; // ex.: "http://localhost:3333"
const API = `${BASE}/api/recorrencias`;

/** ===================== Service ===================== **/
export const recorrenciaService = {
  /** GET /api/recorrencias?usuarioId=...  -> Recorrencia[] (com pagamentos) */
  async list(usuarioId: string): Promise<Recorrencia[]> {
    const url = `${API}?usuarioId=${encodeURIComponent(usuarioId)}`;
    return http<Recorrencia[]>(url);
  },

  /** GET /api/recorrencias/:id[?usuarioId=...] -> Recorrencia (com pagamentos) */
  async get(id: string, usuarioId?: string): Promise<Recorrencia | null> {
    const qp = usuarioId ? `?usuarioId=${encodeURIComponent(usuarioId)}` : "";
    try {
      return await http<Recorrencia>(`${API}/${encodeURIComponent(id)}${qp}`);
    } catch (e: any) {
      if (String(e?.message || "").includes("404")) return null;
      throw e;
    }
  },

  /** POST /api/recorrencias  -> backend responde RecorrenciaBase (sem pagamentos).
   *  Para manter o contrato do front, retornamos com pagamentos = {}.
   */
  async create(data: RecorrenciaCreate): Promise<Recorrencia> {
    const created = await http<Omit<Recorrencia, "pagamentos">>(API, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { ...created, pagamentos: {} };
  },

  /** PUT /api/recorrencias/:id  -> backend responde RecorrenciaBase.
   *  Para entregar com 'pagamentos', buscamos o DTO completo em seguida.
   */
  async update(
    id: string,
    patch: RecorrenciaPatch & { usuarioId?: string }
  ): Promise<Recorrencia> {
    const qp = patch.usuarioId ? `?usuarioId=${encodeURIComponent(patch.usuarioId)}` : "";
    await http<Omit<Recorrencia, "pagamentos">>(`${API}/${encodeURIComponent(id)}${qp}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    // garante que o front receba o mapa atualizado do backend
    const full = await this.get(id, patch.usuarioId);
    if (!full) throw new Error("Recorrência não encontrada após update");
    return full;
  },

  /** DELETE /api/recorrencias/:id */
  async remove(id: string, usuarioId?: string): Promise<void> {
    const qp = usuarioId ? `?usuarioId=${encodeURIComponent(usuarioId)}` : "";
    await http<void>(`${API}/${encodeURIComponent(id)}${qp}`, { method: "DELETE" });
  },

  /** PUT /api/recorrencias/:id/pagamentos  -> RecorrenciaDTO */
  async setPayments(
    id: string,
    pagamentos: Record<string, boolean>,
    usuarioId?: string
  ): Promise<Recorrencia> {
    const qp = usuarioId ? `?usuarioId=${encodeURIComponent(usuarioId)}` : "";
    return http<Recorrencia>(`${API}/${encodeURIComponent(id)}/pagamentos${qp}`, {
      method: "PUT",
      body: JSON.stringify({ usuarioId, pagamentos }),
    });
  },

  /** POST /api/recorrencias/:id/toggle  -> RecorrenciaDTO */
  async toggleMonth(
    id: string,
    ymKey: string,                  // "YYYY-MM"
    value?: boolean,
    usuarioId?: string
  ): Promise<Recorrencia> {
    const qp = usuarioId ? `?usuarioId=${encodeURIComponent(usuarioId)}` : "";
    const payload: any = { ym: ymKey };
    if (typeof value === "boolean") payload.value = value;
    if (usuarioId) payload.usuarioId = usuarioId;

    return http<Recorrencia>(`${API}/${encodeURIComponent(id)}/toggle${qp}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export default recorrenciaService;
