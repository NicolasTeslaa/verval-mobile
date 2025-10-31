// src/services/http.ts
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const SS_ACCESS = "verval_access_token";
const SS_REFRESH = "verval_refresh_token";

const BASE = Constants.expoConfig?.extra?.API_BASE_URL ?? "";
const REFRESH_URL = `${BASE}/api/usuarios/refresh`;

// single-flight para refresh (evita múltiplos refresh em paralelo)
let refreshInFlight: Promise<{ accessToken: string; refreshToken?: string } | null> | null = null;

type HttpOptions = RequestInit & { auth?: boolean; retryOn401?: boolean };

async function getAccessToken() {
  return SecureStore.getItemAsync(SS_ACCESS);
}
async function getRefreshToken() {
  return SecureStore.getItemAsync(SS_REFRESH);
}
async function setTokens(access?: string | null, refresh?: string | null) {
  if (access) await SecureStore.setItemAsync(SS_ACCESS, access);
  else await SecureStore.deleteItemAsync(SS_ACCESS);

  if (typeof refresh !== "undefined") {
    if (refresh) await SecureStore.setItemAsync(SS_REFRESH, refresh);
    else await SecureStore.deleteItemAsync(SS_REFRESH);
  }
}

// faz o refresh (usada pelo single-flight)
async function doRefresh(): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const rt = await getRefreshToken();
  if (!rt) return null;

  const res = await fetch(REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });

  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok || !data?.accessToken) return null;

  await setTokens(data.accessToken, data.refreshToken);
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

async function ensureRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => { refreshInFlight = null; });
  }
  const out = await refreshInFlight;
  return !!out?.accessToken;
}

export async function http<T = unknown>(url: string, options: HttpOptions = {}): Promise<T> {
  const { auth = true, retryOn401 = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // injeta bearer se auth=true
  if (auth) {
    const token = await getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  // request original
  let res = await fetch(url, { ...rest, headers: finalHeaders });

  // se 401 e ainda não tentamos refresh, tenta uma vez
  if (res.status === 401 && retryOn401) {
    const ok = await ensureRefresh();
    if (ok) {
      const token = await getAccessToken();
      const headers2 = { ...finalHeaders };
      if (token) headers2["Authorization"] = `Bearer ${token}`;
      res = await fetch(url, { ...rest, headers: headers2 });
    } else {
      // refresh falhou: limpa tokens
      await setTokens(null, null);
    }
  }

  // tenta ler json (pode ser 204)
  let data: any = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { /* body não-JSON */ }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return (data as T) ?? ({} as T);
}
