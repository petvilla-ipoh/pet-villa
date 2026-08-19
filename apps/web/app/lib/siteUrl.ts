const PRODUCTION_SITE_URL = "https://the-pet-villa-ipoh-web.vercel.app";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) return trimTrailingSlash(configuredSiteUrl);
  if (typeof window !== "undefined") return trimTrailingSlash(window.location.origin);
  return PRODUCTION_SITE_URL;
}

export function getAuthRedirectUrl(path: `/${string}`) {
  return `${getSiteUrl()}${path}`;
}

export { PRODUCTION_SITE_URL };
