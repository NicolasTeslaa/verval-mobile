// src/services/recorrenciaService.ts
import Constants from "expo-constants";
import { http } from "./lancamentoService";

/** ===================== Tipos ===================== **/
export type Recorrencia = {
  id: string;
  usuarioId?: string;                 // backend pode retornar
  cliente: string;
  valor: number;
  categoria?: string | null;
  ativo: boolean;
  inicio: string;                     // "YYYY-MM-DD"
  fim?: string | null;
  observacao?: string | null;

  /** NOVO: dia do vencimento dentro do mês (1..31). */
  vencimento_dia?: number | null;

  /** "YYYY-MM" -> pago? */
  pagamentos: Record<string, boolean>;
};

export type RecorrenciaCreate = {
  usuarioId: string;
  cliente: string;
  valor: number;
  categoria?: string | null;
  ativo?: boolean;
  inicio: string;                     // "YYYY-MM-DD"
  fim?: string | null;
  observacao?: string | null;

  /** NOVO: persistir o dia de vencimento ao criar */
  vencimento_dia?: number | null;
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
    const url = `${API}/${encodeURIComponent(id)}${qp}`;

    console.log("[recorrenciaService.get] FETCH", { url, id, usuarioId });

    try {
      const resp = await http<Recorrencia>(url);
      console.log("[recorrenciaService.get] OK", { id: resp?.id });
      return resp;
    } catch (e: any) {
      console.error("[recorrenciaService.get] ERROR", { url, id, usuarioId, error: e });
      if (String(e?.message || "").includes("404")) {
        console.warn("[recorrenciaService.get] 404 Not Found", { id, usuarioId });
        return null;
      }
      throw e;
    }
  },

  /** POST /api/recorrencias
   *  Backend pode responder sem 'pagamentos'; garantimos { pagamentos: {} } aqui.
   */
  async create(data: RecorrenciaCreate): Promise<Recorrencia> {
    // opcionalmente sanitiza o vencimento_dia (1..31)
    const payload = {
      ...data,
      vencimento_dia:
        data.vencimento_dia == null
          ? null
          : Math.max(1, Math.min(Number(data.vencimento_dia) || 1, 31)),
    };

    const created = await http<Omit<Recorrencia, "pagamentos">>(API, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ...created, pagamentos: {} };
  },

  /** PUT /api/recorrencias/:id
   *  Após atualizar, buscamos o DTO completo para garantir 'pagamentos'.
   */
  async update(
    id: string,
    patch: RecorrenciaPatch & { usuarioId?: string }
  ): Promise<Recorrencia> {
    const qp = patch.usuarioId ? `?usuarioId=${encodeURIComponent(patch.usuarioId)}` : "";

    // idem: sanitiza 'vencimento_dia' se vier no patch
    const payload = {
      ...patch,
      ...(patch.vencimento_dia !== undefined && {
        vencimento_dia:
          patch.vencimento_dia == null
            ? null
            : Math.max(1, Math.min(Number(patch.vencimento_dia) || 1, 31)),
      }),
    };

    await http<Omit<Recorrencia, "pagamentos">>(`${API}/${encodeURIComponent(id)}${qp}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const full = await this.get(id, patch.usuarioId);
    if (!full) throw new Error("Recorrência não encontrada após update");
    return full;
  },

  /** DELETE /api/recorrencias/:id */
  async remove(id: string, usuarioId?: string): Promise<void> {
    const qp = usuarioId ? `?usuarioId=${encodeURIComponent(usuarioId)}` : "";
    await http<void>(`${API}/${encodeURIComponent(id)}${qp}`, { method: "DELETE" });
  },

  /** PUT /api/recorrencias/:id/pagamentos  -> RecorrenciaDTO (com mapa atualizado) */
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

  /** POST /api/recorrencias/:id/toggle  -> RecorrenciaDTO
   *  Liga/desliga um mês "YYYY-MM" (padrão do seu backend).
   */
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
