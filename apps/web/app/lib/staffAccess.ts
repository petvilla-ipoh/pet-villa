export const STAFF_ROLES = ["owner", "admin", "manager", "staff", "viewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_STATUSES = ["invited", "active", "suspended", "disabled"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const STAFF_PERMISSIONS = [
  "dashboard.view",
  "bookings.view",
  "bookings.manage",
  "calendar.view",
  "calendar.manage",
  "crm.view",
  "crm.manage",
  "inbox.view",
  "inbox.manage",
  "diary.view",
  "diary.manage",
  "payments.view",
  "payments.manage",
  "vouchers.view",
  "vouchers.manage",
  "reviews.view",
  "reviews.manage",
  "notifications.view",
  "notifications.manage",
  "settings.view",
  "settings.manage",
  "staff.view",
  "staff.manage",
  "audit.view"
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

const ALL_PERMISSIONS = [...STAFF_PERMISSIONS];
const PRIVILEGED_ACCESS_PERMISSIONS = new Set<StaffPermission>([
  "staff.view",
  "staff.manage",
  "audit.view"
]);

export const ROLE_PERMISSION_PRESETS: Record<StaffRole, StaffPermission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  manager: STAFF_PERMISSIONS.filter(
    (permission) => permission !== "settings.manage" && !PRIVILEGED_ACCESS_PERMISSIONS.has(permission)
  ),
  staff: [
    "dashboard.view",
    "bookings.view",
    "bookings.manage",
    "calendar.view",
    "calendar.manage",
    "crm.view",
    "inbox.view",
    "inbox.manage",
    "diary.view",
    "diary.manage",
    "payments.view",
    "notifications.view"
  ],
  viewer: [
    "dashboard.view",
    "bookings.view",
    "calendar.view",
    "crm.view",
    "inbox.view",
    "diary.view",
    "payments.view",
    "vouchers.view",
    "reviews.view",
    "notifications.view"
  ]
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner / Admin",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  viewer: "Viewer"
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && STAFF_ROLES.includes(value as StaffRole);
}

export function isStaffStatus(value: unknown): value is StaffStatus {
  return typeof value === "string" && STAFF_STATUSES.includes(value as StaffStatus);
}

export function normalizePermissions(role: StaffRole, permissions?: readonly string[] | null): StaffPermission[] {
  if (role === "owner" || role === "admin") return [...ALL_PERMISSIONS];
  const allowed = new Set(STAFF_PERMISSIONS);
  if (permissions === undefined || permissions === null) return [...ROLE_PERMISSION_PRESETS[role]];
  const requested = permissions.filter((permission): permission is StaffPermission => (
    allowed.has(permission as StaffPermission)
    && !PRIVILEGED_ACCESS_PERMISSIONS.has(permission as StaffPermission)
  ));
  return [...new Set(requested)];
}

export function hasStaffPermission(permissions: readonly string[] | null | undefined, permission: StaffPermission) {
  return Boolean(permissions?.includes(permission));
}

export const WORKSPACE_VIEW_PERMISSIONS = {
  dashboard: "dashboard.view",
  bookings: "bookings.view",
  calendar: "calendar.view",
  customers: "crm.view",
  messages: "inbox.view",
  diary: "diary.view",
  payments: "payments.view",
  vouchers: "vouchers.view",
  reviews: "reviews.view",
  notifications: "notifications.view",
  settings: "settings.view"
} as const satisfies Record<string, StaffPermission>;

export const WORKSPACE_MANAGE_PERMISSIONS = {
  dashboard: null,
  bookings: "bookings.manage",
  calendar: "calendar.manage",
  customers: "crm.manage",
  messages: "inbox.manage",
  diary: "diary.manage",
  payments: "payments.manage",
  vouchers: "vouchers.manage",
  reviews: "reviews.manage",
  notifications: "notifications.manage",
  settings: "settings.manage"
} as const satisfies Record<string, StaffPermission | null>;
