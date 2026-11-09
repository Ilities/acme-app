import { vi } from 'vitest';

type Handler = (body: unknown) => { status?: number; body?: unknown };

export function mockFetch(routes: Record<string, Handler>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    const handler = routes[`${method} ${url}`];
    if (!handler) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    const requestBody = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const { status = 200, body = {} } = handler(requestBody);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}
