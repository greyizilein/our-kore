let _handler = null;

async function getHandler() {
  if (!_handler) {
    const mod = await import("../dist/server/server.js");
    _handler = mod.default;
  }
  return _handler;
}

export default async function handler(req, res) {
  const h = await getHandler();

  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host =
    req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  const url = new URL(req.url ?? "/", `${proto}://${host}`);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  }

  const method = req.method ?? "GET";
  const hasBody = !["GET", "HEAD"].includes(method);

  const request = new Request(url, {
    method,
    headers,
    ...(hasBody ? { body: req, duplex: "half" } : {}),
  });

  let response;
  try {
    response = await h.fetch(request, {}, {});
  } catch (err) {
    console.error("[ssr]", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
    return;
  }

  res.statusCode = response.status;
  for (const [k, v] of response.headers.entries()) {
    res.setHeader(k, v);
  }
  res.end(Buffer.from(await response.arrayBuffer()));
}
