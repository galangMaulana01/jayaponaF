'use strict';

// Jika ada window.BACKEND_URL gunakan itu, jika tidak ada, default ke domain Vercel
const BASE_URL = window.BACKEND_URL || 'https://jayaphone.vercel.app';

const Token = {
  get:     ()  => localStorage.getItem('jyp_token'),
  set:     (t) => localStorage.setItem('jyp_token', t),
  clear:   ()  => localStorage.removeItem('jyp_token'),
  headers: ()  => ({
    'Content-Type': 'application/json',
    ...(Token.get() ? { Authorization: `Bearer ${Token.get()}` } : {}),
  }),
};

async function request(method, path, body = null) {
  const opts = { method, headers: Token.headers() };
  if (body) opts.body = JSON.stringify(body);
  
  // LOGIKA DINAMIS: 
  // Jika base_url adalah domain luar (http...) dan belum punya /api/v1, kita tambahkan otomatis.
  // Jika base_url adalah path relatif (seperti '/api/v1' atau kosong), dia tidak akan dobel prefix.
  let fullPath = `${BASE_URL}${path}`;
  if (BASE_URL.startsWith('http') && !BASE_URL.includes('/api/v1')) {
    fullPath = `${BASE_URL}/api/v1${path}`;
  }

  let res;
  try {
    res = await fetch(fullPath, opts);
  } catch {
    throw new APIError(0, 'Tidak dapat terhubung ke server.');
  }
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) { Token.clear(); window.location.reload(); }
    throw new APIError(res.status, data?.detail || data?.message || 'Terjadi kesalahan beo');
  }
  return data;
}

async function uploadFile(path, file) {
  const fd = new FormData();
  fd.append('file', file);
  
  let fullPath = `${BASE_URL}${path}`;
  if (BASE_URL.startsWith('http') && !BASE_URL.includes('/api/v1')) {
    fullPath = `${BASE_URL}/api/v1${path}`;
  }

  let res;
  try {
    res = await fetch(fullPath, {
      method: 'POST',
      headers: { ...(Token.get() ? { Authorization: `Bearer ${Token.get()}` } : {}) },
      body: fd,
    });
  } catch {
    throw new APIError(0, 'Tidak dapat terhubung ke server.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new APIError(res.status, data?.detail || data?.message || 'Upload gagal');
  return data;
}

class APIError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const API = {
  auth: {
    login: (u, p) => request('POST', '/auth/login', { username: u, password: p }),
    me:    ()     => request('GET',  '/auth/me'),
  },
  dashboard: {
    stats: (cabang = '') => request('GET', `/dashboard/stats${cabang ? `?cabang=${cabang}` : ''}`),
  },
  units: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/units${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/units', b),
    update: (id, b)  => request('PUT',  `/units/${id}`, b),
  },
  transaksi: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/transaksi${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/transaksi', b),
  },
  karyawan: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/karyawan${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/karyawan', b),
  },
  log: {
    list: (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/log${q?`?${q}`:''}`) },
  },
  service: {
    list:       (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/service${q?`?${q}`:''}`) },
    get:        (id)     => request('GET',  `/service/${id}`),
    create:     (b)      => request('POST', '/service', b),
    update:     (id, b)  => request('PUT',  `/service/${id}`, b),
    uploadFoto: (id, f)  => uploadFile(`/service/${id}/foto`, f),
  },
  customers: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/customers${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/customers', b),
  },
};

window.API      = API;
window.Token    = Token;
window.APIError = APIError;

// Menyesuaikan URL media agar folder /uploads mengarah ke domain yang tepat tanpa /api/v1
window.MEDIA_URL = BASE_URL.replace('/api/v1', '');
