// worker.js – runs the existing Express‑style routes on Cloudflare Workers using Hono (lightweight edge router)

import express from "express";
import { createRequestHandler } from "@cloudflare/express";

const app = express();
app.use(express.json());

// ---- copy all routes from your existing server ----
import router from "./routes/api.js";
app.use("/api", router);

// -------------------------------------------------
export default {
    async fetch(request, env, ctx) {
        // Express → Cloudflare Worker bridge
        const handler = createRequestHandler(app);
        return handler(request);
    },
};
