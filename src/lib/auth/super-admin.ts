// Super usuario protegido (Alan Guerrero): identidad única con
// controles exclusivos (auditoría, permisos, impersonación).
export const SUPER_ADMIN_ID = "13e879f8-fa06-4593-abf1-ad9d2fa90f53";

export function isSuperAdmin(userId: string | null | undefined): boolean {
  return userId === SUPER_ADMIN_ID;
}
