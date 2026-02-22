const API_BASE = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

export async function proxyPost(req: Request, path: string): Promise<Response> {
  const body = await req.text();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'content-type': 'application/json' }
  });
}

export async function proxyGet(path: string): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'GET', cache: 'no-store' });
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'content-type': 'application/json' }
  });
}
