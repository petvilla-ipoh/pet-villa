import assert from "node:assert/strict";
import { createChunkedAuthCookieStorage, readChunkedAuthCookie } from "../apps/web/app/lib/authCookieStorage.ts";

const STORAGE_KEY = "sb-pet-villa-auth-token";
let passed = 0;

function test(name, run) {
  return Promise.resolve()
    .then(run)
    .then(() => {
      passed += 1;
      console.log(`PASS ${name}`);
    });
}

function createCookieHarness({ persistent = true, secure = true } = {}) {
  const cookies = new Map();
  const writes = [];
  const adapter = {
    readCookieHeader: () => [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
    writeCookie(serializedCookie) {
      writes.push(serializedCookie);
      const [pair] = serializedCookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (/Max-Age=0(?:;|$)/i.test(serializedCookie)) cookies.delete(name);
      else cookies.set(name, value);
    },
    isPersistent: () => persistent,
    isSecure: () => secure
  };
  return { cookies, writes, storage: createChunkedAuthCookieStorage(adapter) };
}

function createSession(identityCount, marker = "session") {
  return JSON.stringify({
    access_token: `${marker}-access-${"a".repeat(2500)}`,
    refresh_token: `${marker}-refresh-${"r".repeat(500)}`,
    expires_at: 1_800_000_000,
    user: {
      id: `${marker}-user`,
      email: `${marker}@example.com`,
      user_metadata: { full_name: "Pet Villa Customer", avatar_url: `https://example.com/${"m".repeat(420)}` },
      identities: Array.from({ length: identityCount }, (_, index) => ({
        identity_id: `${marker}-${index}`,
        provider: index === 0 ? "email" : "google",
        identity_data: { email: `${marker}@example.com`, subject: `${marker}-${index}-${"i".repeat(520)}` }
      }))
    }
  });
}

await test("normal session uses one cookie and reassembles", async () => {
  const { cookies, storage } = createCookieHarness();
  const value = JSON.stringify({ access_token: "small", refresh_token: "small-refresh" });
  await storage.setItem(STORAGE_KEY, value);
  assert.deepEqual([...cookies.keys()], [STORAGE_KEY]);
  assert.equal(await storage.getItem(STORAGE_KEY), value);
});

await test("large multi-identity session is chunked and reassembles", async () => {
  const { cookies, storage } = createCookieHarness();
  const value = createSession(2, "large");
  await storage.setItem(STORAGE_KEY, value);
  assert.ok(cookies.size >= 2);
  assert.ok([...cookies.keys()].every((name) => name.startsWith(`${STORAGE_KEY}.`)));
  assert.equal(await storage.getItem(STORAGE_KEY), value);
});

await test("Host server reader reassembles the same large cookie chunks", async () => {
  const { cookies, storage } = createCookieHarness();
  const value = createSession(2, "host-large");
  await storage.setItem(STORAGE_KEY, value);
  assert.ok(!cookies.has(STORAGE_KEY));
  assert.equal(
    await readChunkedAuthCookie(STORAGE_KEY, (name) => cookies.get(name)),
    value
  );
});

await test("Host server reader accepts an encoded legacy single cookie", async () => {
  const value = JSON.stringify({ access_token: "legacy", refresh_token: "legacy-refresh" });
  const cookies = new Map([[STORAGE_KEY, encodeURIComponent(value)]]);
  assert.equal(
    await readChunkedAuthCookie(STORAGE_KEY, (name) => cookies.get(name)),
    value
  );
});

await test("session shrink removes stale chunks", async () => {
  const { cookies, storage } = createCookieHarness();
  await storage.setItem(STORAGE_KEY, createSession(3, "large"));
  assert.ok(cookies.size >= 2);
  const smaller = JSON.stringify({ access_token: "small", refresh_token: "rotated" });
  await storage.setItem(STORAGE_KEY, smaller);
  assert.deepEqual([...cookies.keys()], [STORAGE_KEY]);
  assert.equal(await storage.getItem(STORAGE_KEY), smaller);
});

await test("refresh rotation replaces every chunk without stale collision", async () => {
  const { cookies, storage } = createCookieHarness();
  await storage.setItem(STORAGE_KEY, createSession(2, "before-refresh"));
  const rotated = createSession(2, "after-refresh");
  await storage.setItem(STORAGE_KEY, rotated);
  assert.equal(await storage.getItem(STORAGE_KEY), rotated);
  assert.ok([...cookies.values()].join("").includes("after-refresh"));
  assert.ok(![...cookies.values()].join("").includes("before-refresh"));
});

await test("sign out removes all session chunks", async () => {
  const { cookies, storage } = createCookieHarness();
  await storage.setItem(STORAGE_KEY, createSession(2, "signout"));
  await storage.removeItem(STORAGE_KEY);
  assert.equal(cookies.size, 0);
  assert.equal(await storage.getItem(STORAGE_KEY), null);
});

await test("password recovery session persists through getSession storage read", async () => {
  const { storage } = createCookieHarness();
  const recovery = createSession(2, "password-recovery");
  await storage.setItem(STORAGE_KEY, recovery);
  const restored = await storage.getItem(STORAGE_KEY);
  assert.equal(restored, recovery);
  assert.equal(JSON.parse(restored).user.email, "password-recovery@example.com");
});

await test("new user session cannot inherit previous user chunks", async () => {
  const { cookies, storage } = createCookieHarness();
  await storage.setItem(STORAGE_KEY, createSession(3, "customer-a"));
  const customerB = createSession(1, "customer-b");
  await storage.setItem(STORAGE_KEY, customerB);
  assert.equal(await storage.getItem(STORAGE_KEY), customerB);
  assert.ok(![...cookies.values()].join("").includes("customer-a"));
});

await test("persistent cookies retain secure SameSite and 30-day semantics", async () => {
  const { writes, storage } = createCookieHarness({ persistent: true, secure: true });
  await storage.setItem(STORAGE_KEY, createSession(2, "secure"));
  assert.ok(writes.every((cookie) => /Path=\//.test(cookie)));
  assert.ok(writes.every((cookie) => /SameSite=Lax/i.test(cookie)));
  assert.ok(writes.every((cookie) => /Secure/i.test(cookie)));
  assert.ok(writes.every((cookie) => /Max-Age=2592000/i.test(cookie)));
});

await test("session-only cookies omit persistence while cleanup remains deterministic", async () => {
  const { writes, storage } = createCookieHarness({ persistent: false, secure: true });
  await storage.setItem(STORAGE_KEY, createSession(2, "session-only"));
  assert.ok(writes.every((cookie) => !/Max-Age=/i.test(cookie)));
  writes.length = 0;
  await storage.removeItem(STORAGE_KEY);
  assert.ok(writes.length > 0);
  assert.ok(writes.every((cookie) => /Max-Age=0/i.test(cookie)));
});

console.log(`Auth session storage validation passed: ${passed}/11`);
