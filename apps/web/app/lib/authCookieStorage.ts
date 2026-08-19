import {
  combineChunks,
  createChunks,
  isChunkLike,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions
} from "@supabase/ssr";

const AUTH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type AuthCookieAdapter = {
  readCookieHeader: () => string;
  writeCookie: (serializedCookie: string) => void;
  isPersistent: () => boolean;
  isSecure: () => boolean;
};

function getCookieEntries(adapter: AuthCookieAdapter) {
  return parseCookieHeader(adapter.readCookieHeader());
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function readChunkedAuthCookie(
  key: string,
  readCookie: (name: string) => string | null | undefined
) {
  return combineChunks(key, (name) => {
    const value = readCookie(name);
    return value ? decodeCookieValue(value) : null;
  });
}

function writeAuthCookie(
  adapter: AuthCookieAdapter,
  name: string,
  value: string,
  remove = false
) {
  const options: CookieOptions = {
    path: "/",
    sameSite: "lax",
    secure: adapter.isSecure()
  };

  if (remove) {
    options.maxAge = 0;
  } else if (adapter.isPersistent()) {
    options.maxAge = AUTH_COOKIE_MAX_AGE_SECONDS;
  }

  adapter.writeCookie(serializeCookieHeader(name, value, options));
}

export function createChunkedAuthCookieStorage(adapter: AuthCookieAdapter) {
  return {
    async getItem(key: string) {
      const cookies = getCookieEntries(adapter);
      return combineChunks(
        key,
        (chunkName) => cookies.find(({ name }) => name === chunkName)?.value ?? null
      );
    },

    async setItem(key: string, value: string) {
      const existingNames = getCookieEntries(adapter)
        .map(({ name }) => name)
        .filter((name) => isChunkLike(name, key));
      const chunks = createChunks(key, value);
      const nextNames = new Set(chunks.map(({ name }) => name));

      for (const name of existingNames) {
        if (!nextNames.has(name)) writeAuthCookie(adapter, name, "", true);
      }
      for (const { name, value: chunkValue } of chunks) {
        writeAuthCookie(adapter, name, chunkValue);
      }
    },

    async removeItem(key: string) {
      const names = getCookieEntries(adapter)
        .map(({ name }) => name)
        .filter((name) => isChunkLike(name, key));

      for (const name of names) writeAuthCookie(adapter, name, "", true);
    }
  };
}

export function createBrowserAuthCookieStorage(persistenceKey: string) {
  return createChunkedAuthCookieStorage({
    readCookieHeader: () => typeof document === "undefined" ? "" : document.cookie,
    writeCookie: (serializedCookie) => {
      if (typeof document !== "undefined") document.cookie = serializedCookie;
    },
    isPersistent: () => {
      if (typeof window === "undefined") return true;
      return window.localStorage.getItem(persistenceKey) !== "session";
    },
    isSecure: () => typeof window !== "undefined" && window.location.protocol === "https:"
  });
}
