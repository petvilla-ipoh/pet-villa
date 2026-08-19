export const HOST_ROLES = ["host", "admin"] as const;

export type HostRole = (typeof HOST_ROLES)[number];

export function isHostRole(value: unknown): value is HostRole {
  return HOST_ROLES.includes(String(value) as HostRole);
}

export function sanitizeHostRedirect(value: string | null | undefined) {
  if (!value || !value.startsWith("/host") || value.startsWith("//")) return "/host";
  if (value.startsWith("/host/login") || value.startsWith("/host/reset-password") || value.startsWith("/host/auth")) return "/host";
  return value;
}
