// Runs the existing Node-style handlers (api/*.js: (req, res) like Vercel and server.cjs)
// as Netlify Functions, which receive a Web Request and return a Web Response.
export function adapt(handler) {
  return async (request, context) => {
    const url = new URL(request.url);
    const body = ['GET', 'HEAD'].includes(request.method) ? null : Buffer.from(await request.arrayBuffer());
    const headers = Object.fromEntries(request.headers);
    const req = {
      method: request.method,
      url: url.pathname + url.search,
      headers,
      // context.ip is the visitor's address, used only (hashed) for rate limiting.
      socket: { remoteAddress: context?.ip || headers['x-nf-client-connection-ip'] || 'unknown', encrypted: url.protocol === 'https:' },
      async *[Symbol.asyncIterator]() { if (body?.length) yield body; },
    };
    return new Promise(resolve => {
      const out = new Headers();
      let status = 200, sent = false;
      const res = {
        get statusCode() { return status; },
        set statusCode(value) { status = value; },
        get headersSent() { return sent; },
        setHeader(name, value) {
          out.delete(name);
          for (const item of Array.isArray(value) ? value : [value]) out.append(name, String(item));
        },
        getHeader(name) { return out.get(name); },
        writeHead(code, extra) { status = code; if (extra) for (const [k, v] of Object.entries(extra)) res.setHeader(k, v); return res; },
        end(data) {
          if (sent) return; sent = true;
          const empty = request.method === 'HEAD' || status === 204 || status === 304 || data == null;
          resolve(new Response(empty ? null : (typeof data === 'string' ? data : new Uint8Array(data)), { status, headers: out }));
        },
      };
      Promise.resolve(handler(req, res)).catch(() => {
        if (!sent) { sent = true; resolve(new Response(JSON.stringify({ message: 'Unable to process the request.' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })); }
      });
    });
  };
}
