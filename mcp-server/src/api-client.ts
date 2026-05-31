export interface ApiClient {
  get: <T = any>(path: string) => Promise<T>;
  post: <T = any>(path: string, body?: any) => Promise<T>;
  put: <T = any>(path: string, body?: any) => Promise<T>;
  del: <T = any>(path: string) => Promise<T>;
}

export function createApiClient(baseUrl: string, token: string): ApiClient {
  async function request<T>(method: string, path: string, body?: any): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`API ${method} ${path} failed (${res.status}): ${error.error || res.statusText}`);
    }

    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: any) => request<T>("POST", path, body),
    put: <T>(path: string, body?: any) => request<T>("PUT", path, body),
    del: <T>(path: string) => request<T>("DELETE", path),
  };
}
