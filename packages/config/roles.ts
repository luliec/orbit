export const ROLES = {
  ADMIN: 'admin',
  PM: 'pm',
  COPY: 'copy',
  ARTE: 'arte',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Permisos por acción
export const PERMISSIONS = {
  // Solicitudes
  CREATE_REQUEST: ['admin', 'pm'],
  EDIT_REQUEST: ['admin', 'pm'],
  VIEW_ALL_REQUESTS: ['admin', 'pm'],

  // Copies
  EDIT_COPIES: ['admin', 'copy'],
  GENERATE_AI_COPY: ['admin', 'copy'],
  APPROVE_COPIES: ['admin', 'pm'],
  COMMENT_COPIES: ['admin', 'pm', 'copy'],

  // Arte
  GIVE_ART_GO: ['admin', 'pm'],
  UPLOAD_ASSETS: ['admin', 'arte'],
  VALIDATE_AI_FINDINGS: ['admin', 'copy'],
  APPROVE_ART: ['admin', 'pm'],
  COMMENT_ART: ['admin', 'pm', 'copy', 'arte'],

  // Segmentos
  MANAGE_SEGMENTS: ['admin', 'pm'],

  // Usuarios
  MANAGE_USERS: ['admin'],

  // Analytics
  VIEW_ANALYTICS: ['admin', 'pm'],

  // Links de cliente
  GENERATE_CLIENT_LINKS: ['admin', 'pm'],
} as const satisfies Record<string, Role[]>

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as Role[]).includes(role)
}
