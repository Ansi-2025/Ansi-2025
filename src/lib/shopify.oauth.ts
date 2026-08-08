import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2026-07";
const REDIRECT_PATH = "/api/shopify/callback";
const SCOPES = ["read_orders", "write_checkouts"].join(",");
const STATE_COOKIE_NAME = "shopify_oauth_state";

function buildRedirectUri(request: Request) {
  const url = new URL(request.url);
  url.pathname = REDIRECT_PATH;
  url.search = "";
  return url.toString();
}

function normalizeShopDomain(shop: string) {
  return shop.trim().toLowerCase();
}

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function parseCookies(cookieHeader: string) {
  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, cookie) => {
    const [name, ...parts] = cookie.split("=");
    const value = parts.join("=").trim();
    cookies[name.trim()] = value;
    return cookies;
  }, {});
}

function buildQueryString(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");
}

async function verifyShopifyCallback(query: URLSearchParams): Promise<boolean> {
  const hmac = query.get("hmac") ?? "";
  if (!hmac) return false;

  const filtered: Record<string, string> = {};
  query.forEach((value, key) => {
    if (key !== "hmac" && key !== "signature") {
      filtered[key] = value;
    }
  });

  const message = buildQueryString(filtered);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SHOPIFY_CLIENT_SECRET ?? "");
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureBase64 = Buffer.from(new Uint8Array(signature)).toString("base64");
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

  return safeCompare(signatureBase64, hmac) || safeCompare(signatureHex, hmac);
}

async function exchangeShopifyAccessToken(shop: string, code: string) {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error("SHOPIFY_CLIENT_ID ou SHOPIFY_CLIENT_SECRET não configurados.");
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao trocar código OAuth por token: ${response.status} ${body}`);
  }

  const responseJson = await response.json();
  if (!responseJson.access_token) {
    throw new Error("Resposta OAuth inválida do Shopify: access_token não encontrado.");
  }

  return String(responseJson.access_token);
}

async function saveShopifyAccessToken(shop: string, accessToken: string) {
  const storeDomain = normalizeShopDomain(shop);
  const { error } = await supabaseAdmin
    .from("shopify_apps")
    .upsert({ store_domain: storeDomain, access_token: accessToken, updated_at: new Date().toISOString() }, { onConflict: "store_domain" });

  if (error) {
    throw new Error(`Falha ao salvar token de Shopify: ${error.message}`);
  }
}

export async function getShopifyAccessTokenForStore(shop?: string) {
  const storeDomain = normalizeShopDomain(shop ?? SHOPIFY_STORE_DOMAIN ?? "");
  if (!storeDomain) {
    throw new Error("SHOPIFY_STORE_DOMAIN não configurado para recuperar o token do Shopify.");
  }

  const { data, error } = await supabaseAdmin
    .from("shopify_apps")
    .select("access_token")
    .eq("store_domain", storeDomain)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar token do Shopify: ${error.message}`);
  }

  if (!data?.access_token) {
    throw new Error("Nenhum token do Shopify encontrado. Instale a app em /api/shopify/install.");
  }

  return data.access_token;
}

export async function handleShopifyInstall(request: Request) {
  const shop = new URL(request.url).searchParams.get("shop") ?? SHOPIFY_STORE_DOMAIN;
  if (!shop) {
    return new Response(JSON.stringify({ error: "Parâmetro shop ausente." }), { status: 400, headers: { "content-type": "application/json" } });
  }

  if (!SHOPIFY_CLIENT_ID) {
    return new Response(JSON.stringify({ error: "SHOPIFY_CLIENT_ID não configurado." }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const state = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const redirectUri = buildRedirectUri(request);
  const installUrl = `https://${normalizeShopDomain(shop)}/admin/oauth/authorize?client_id=${encodeURIComponent(SHOPIFY_CLIENT_ID)}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: installUrl,
      "Set-Cookie": `${STATE_COOKIE_NAME}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax;`,
    },
  });
}

export async function handleShopifyCallback(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const shop = params.get("shop") ?? "";
  const code = params.get("code") ?? "";
  const state = params.get("state") ?? "";

  if (!shop || !code) {
    return new Response(JSON.stringify({ error: "shop ou code ausente no callback." }), { status: 400, headers: { "content-type": "application/json" } });
  }

  if (!SHOPIFY_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "SHOPIFY_CLIENT_SECRET não configurado." }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const savedState = cookies[STATE_COOKIE_NAME] ?? "";

  if (!savedState || !safeCompare(savedState, state)) {
    return new Response(JSON.stringify({ error: "Falha na verificação de estado do callback do Shopify." }), { status: 401, headers: { "content-type": "application/json" } });
  }

  if (!(await verifyShopifyCallback(params))) {
    return new Response(JSON.stringify({ error: "Falha na verificação HMAC do callback do Shopify." }), { status: 401, headers: { "content-type": "application/json" } });
  }

  try {
    const accessToken = await exchangeShopifyAccessToken(normalizeShopDomain(shop), code);
    await saveShopifyAccessToken(shop, accessToken);

    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = "/";
    redirectUrl.search = "installed=1";

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
      },
    });
  } catch (error) {
    console.error("Erro no callback Shopify:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
