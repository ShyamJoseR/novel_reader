// worker.js – runs the existing Express‑style routes on Cloudflare Workers using Hono (lightweight edge router)

import { Hono } from "hono";
import { cors } from "hono/cors";

// Import the existing Express‑style router (CommonJS)
import expressRouter from "./routes/api.js";

const app = new Hono();
app.use("*", cors());

// Helper to adapt an Express handler to Hono
function adaptHandler(expressHandler) {
  return async (c) => {
    const req = {
      params: c.req.param(),
      query: Object.fromEntries(c.req.query()),
      body: await c.req.json().catch(() => ({})),
    };
    const res = {
      json: (obj) => c.json(obj),
      send: (msg) => c.text(msg),
      status: (code) => {
        c.res = new Response(c.res.body, { ...c.res, status: code });
        return res;
      },
    };
    await expressHandler(req, res);
    return c.res;
  };
}

// Register all routes from the Express router onto Hono
if (expressRouter && expressRouter.stack) {
  for (const layer of expressRouter.stack) {
    if (!layer.route) continue;
    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods);
    for (const method of methods) {
      const handlers = layer.route.stack.map((s) => s.handle);
      const composed = handlers.reduce(
        (prev, cur) => async (c) => prev(await adaptHandler(cur)(c)),
        async (c) => c
      );
      app[method](path, composed);
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};

