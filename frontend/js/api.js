/* ═══════ API CLIENT ═══════ */
const API_BASE = 'http://localhost:8000/api/v1';

const Api = {
  _token() { return localStorage.getItem('ss_token'); },

  async _req(method, path, body = null, isForm = false) {
    const headers = {};
    const token = this._token();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body && !isForm) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isForm ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json();
      if (res.status === 401) { Auth.logout(); throw new Error('Session expired'); }
      if (!res.ok) throw new Error(data.detail || data.message || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('Server unreachable. Is the backend running?');
      throw err;
    }
  },

  get(path) { return this._req('GET', path); },
  post(path, body) { return this._req('POST', path, body); },
  patch(path, body) { return this._req('PATCH', path, body); },
  postForm(path, formData) { return this._req('POST', path, formData, true); },
};
