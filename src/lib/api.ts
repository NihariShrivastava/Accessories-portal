// src/lib/api.ts
export const api = {
  getToken: () => sessionStorage.getItem('portal_token'),
  
  async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(endpoint, { ...options, headers });
    
    let data: any = {};
    try { data = await response.json(); } catch (e) { /* ignore empty body */ }
    
    // Fix: Only auto-redirect to /login if the 401 is NOT from the login endpoint itself
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      sessionStorage.removeItem('portal_token');
      sessionStorage.removeItem('portal_user');
      window.location.href = '/login';
    }
    
    if (!response.ok) throw new Error(data.error || 'API Error');
    return data as T;
  }
};