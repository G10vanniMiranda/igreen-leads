export function isPublicExperiencePath(pathname: string): boolean {
  return pathname !== "/admin" && !pathname.startsWith("/admin/");
}
