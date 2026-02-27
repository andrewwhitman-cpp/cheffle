/**
 * Authenticated fetch wrapper. Attaches Bearer token and handles 401 by
 * clearing the token and redirecting to login.
 */
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    const returnUrl = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }

  return res;
}
