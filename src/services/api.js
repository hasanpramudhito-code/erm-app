// Klien HTTP ke backend Express. Sesi lewat cookie httpOnly (same-origin), jadi tidak ada token di JS.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, url, body) {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api${url}`, {
    method,
    credentials: 'same-origin',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, data?.error || `Permintaan gagal (${res.status})`);
  // Respons 200 yang bukan JSON (mis. server sedang restart di balik proxy) jangan diteruskan sebagai null.
  if (data === undefined) throw new ApiError(res.status, 'Server tidak dapat dihubungi. Muat ulang halaman sebentar lagi.');
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  patch: (url, body) => request('PATCH', url, body),
  put: (url, body) => request('PUT', url, body),
  delete: (url) => request('DELETE', url),
};
