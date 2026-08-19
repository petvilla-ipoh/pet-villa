export type HostAuthErrorKind =
  | "rate-limit"
  | "invalid-credentials"
  | "session-missing"
  | "expired-link"
  | "access-denied"
  | "network"
  | "profile-missing"
  | "unknown";

type AuthErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  name?: string;
};

export function getHostAuthErrorKind(error: unknown): HostAuthErrorKind {
  const value = (error && typeof error === "object" ? error : {}) as AuthErrorLike;
  const status = Number(value.status || 0);
  const code = String(value.code || "").toLowerCase();
  const message = error instanceof Error ? error.message : String(value.message || error || "");

  if (status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return "rate-limit";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return "invalid-credentials";
  if (code === "otp_expired" || /expired.*(?:link|otp)|(?:link|otp).*expired/i.test(message)) return "expired-link";
  if (code === "session_not_found" || /auth session missing|session.*(?:missing|expired)/i.test(message)) return "session-missing";
  if (/does not have (?:host|access)|access denied|customer account/i.test(message)) return "access-denied";
  if (/profile.*(?:missing|not found|verify)/i.test(message)) return "profile-missing";
  if (/fetch|network|offline|failed to connect|load failed/i.test(message) || value.name === "TypeError") return "network";
  return "unknown";
}

export function getHostAuthErrorMessage(error: unknown) {
  switch (getHostAuthErrorKind(error)) {
    case "rate-limit":
      return "Too many attempts. Please wait before trying again.";
    case "invalid-credentials":
      return "Email or password is incorrect.";
    case "session-missing":
      return "Your secure login session is missing or has expired.";
    case "expired-link":
      return "This secure login link has expired. Please request a new one.";
    case "access-denied":
      return "This account does not have access to Host Operations.";
    case "network":
      return "Unable to connect. Please check your connection and try again.";
    case "profile-missing":
      return "Your Host profile could not be verified. Please contact the account owner.";
    default:
      return "Host authentication failed. Please try again.";
  }
}

export const HOST_MAGIC_LINK_NOTICE_KEY = "pet-villa-host-magic-link-notice";
