import assert from "node:assert/strict";
import { createChunks } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { middleware } from "../apps/web/middleware.ts";

const COOKIE_KEY = "sb-pet-villa-auth-token";
const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

function sessionCookieHeader(session) {
  return createChunks(COOKIE_KEY, session)
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

function hostSession(marker) {
  return JSON.stringify({
    access_token: `${marker}-access-token`,
    refresh_token: `${marker}-refresh-token`,
    user: { id: `${marker}-user`, identities: [{ provider: "email" }] },
    padding: marker === "large" ? "x".repeat(8_000) : ""
  });
}

async function expectHostRequestToContinue(session, marker) {
  const requests = [];
  globalThis.fetch = async (url, init) => {
    const requestUrl = String(url);
    const authorization = new Headers(init?.headers).get("authorization");
    requests.push({ requestUrl, authorization });
    assert.equal(authorization, `Bearer ${marker}-access-token`);

    if (requestUrl.endsWith("/auth/v1/user")) {
      return Response.json({ id: `${marker}-user` });
    }
    if (requestUrl.includes("/rest/v1/host_staff_members")) {
      return Response.json([{ access_role: "owner", status: "active" }]);
    }
    throw new Error(`Unexpected middleware request: ${requestUrl}`);
  };

  const response = await middleware(new NextRequest("https://www.petvilla.my/host", {
    headers: { cookie: sessionCookieHeader(session) }
  }));

  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(requests.length, 2);
}

try {
  const small = hostSession("small");
  assert.deepEqual(createChunks(COOKIE_KEY, small).map(({ name }) => name), [COOKIE_KEY]);
  await expectHostRequestToContinue(small, "small");
  console.log("PASS Host middleware continues with a normal single-cookie session");

  const large = hostSession("large");
  const largeChunkNames = createChunks(COOKIE_KEY, large).map(({ name }) => name);
  assert.ok(largeChunkNames.length > 1);
  assert.ok(largeChunkNames.every((name) => name.startsWith(`${COOKIE_KEY}.`)));

  await expectHostRequestToContinue(large, "large");
  console.log("PASS Host middleware continues after reconstructing a large chunked session");

  globalThis.fetch = async () => {
    throw new Error("Missing session must redirect before Auth or Staff requests.");
  };
  const missingResponse = await middleware(new NextRequest("https://www.petvilla.my/host"));
  assert.match(missingResponse.headers.get("location") || "", /\/host\/login\?redirect=/);
  console.log("PASS Host middleware still fails closed when no session cookie exists");
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalAnonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
}
