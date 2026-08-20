import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const isStripeWebhookPath =
      url.pathname === "/webhooks/stripe/payment" ||
      url.pathname === "/api/webhooks/stripe" ||
      url.pathname === "/api/webhooks/stripe/";

    const isSunoWebhookPath =
      url.pathname === "/api/webhooks/suno" ||
      url.pathname === "/api/webhooks/suno/";

    const isSunoPollingPath =
      url.pathname === "/api/cron/suno-polling" ||
      url.pathname === "/api/cron/suno-polling/";

    if (isSunoPollingPath) {
      if (process.env.ENABLE_SUNO_POLLING !== "true") {
        return new Response(JSON.stringify({ ok: false, message: "Suno polling fallback disabled" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      if (request.method !== "GET" && request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json" },
        });
      }

      const expectedSecret = process.env.CRON_SECRET ?? process.env.SUNO_POLLING_SECRET;
      const providedSecret =
        request.headers.get("x-cron-secret") ??
        request.headers.get("x-api-key") ??
        new URL(request.url).searchParams.get("secret");

      if (expectedSecret && providedSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      try {
        const { pollingMusicasEmGeracao } = await import("./lib/suno-polling");
        const updated = await pollingMusicasEmGeracao();
        return new Response(JSON.stringify({ ok: true, updated }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        console.error("Error running Suno polling cron:", error);
        return new Response(JSON.stringify({ error: "Polling failed" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    if (isStripeWebhookPath) {
      if (request.method === "GET") {
        return new Response("ok", { status: 200 });
      }

      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json" },
        });
      }

      try {
        const { handleStripeWebhook } = await import("./lib/stripe.service");
        return await handleStripeWebhook(request);
      } catch (error) {
        console.error("Error handling Stripe webhook:", error);
        return new Response(JSON.stringify({ error: "Webhook handler error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    if (isSunoWebhookPath) {
      if (request.method === "GET") {
        return new Response("ok", { status: 200 });
      }

      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json" },
        });
      }

      try {
        const { handleSunoWebhook } = await import("./lib/suno-webhook");
        return await handleSunoWebhook(request);
      } catch (error) {
        console.error("Error handling Suno webhook:", error);
        return new Response(JSON.stringify({ error: "Webhook handler error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
