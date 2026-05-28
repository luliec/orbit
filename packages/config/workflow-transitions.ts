import type { Role } from './roles'

export const REQUEST_STATUS = {
  DRAFT: 'draft',
  BRIEF_READY: 'brief_ready',
  COPY_IN_PROGRESS: 'copy_in_progress',
  COPY_REVIEW: 'copy_review',
  COPY_APPROVED: 'copy_approved',
  CLIENT_COPY_REVIEW: 'client_copy_review',
  ART_IN_PROGRESS: 'art_in_progress',
  ART_REVIEW: 'art_review',
  ART_APPROVED: 'art_approved',
  CLIENT_ART_REVIEW: 'client_art_review',
  DELIVERED: 'delivered',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
} as const

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS]

export const COPY_VERSION_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
} as const

export type CopyVersionStatus =
  (typeof COPY_VERSION_STATUS)[keyof typeof COPY_VERSION_STATUS]

export const ASSET_STATUS = {
  UPLOADED: 'uploaded',
  AI_REVIEWING: 'ai_reviewing',
  AI_REVIEWED: 'ai_reviewed',
  COPY_VALIDATED: 'copy_validated',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS]

interface TransitionDef {
  from: RequestStatus
  to: RequestStatus
  allowedRoles: Role[]
  requires?: ('has_new_comment' | 'no_unresolved_comments' | 'no_critical_findings')[]
}

export const TRANSITIONS: Record<string, TransitionDef> = {
  start_copy: {
    from: REQUEST_STATUS.BRIEF_READY,
    to: REQUEST_STATUS.COPY_IN_PROGRESS,
    allowedRoles: ['copy', 'admin'],
  },
  submit_copy: {
    from: REQUEST_STATUS.COPY_IN_PROGRESS,
    to: REQUEST_STATUS.COPY_REVIEW,
    allowedRoles: ['copy', 'admin'],
  },
  request_changes: {
    from: REQUEST_STATUS.COPY_REVIEW,
    to: REQUEST_STATUS.COPY_IN_PROGRESS,
    allowedRoles: ['pm', 'admin'],
    requires: ['has_new_comment'],
  },
  approve_copy: {
    from: REQUEST_STATUS.COPY_REVIEW,
    to: REQUEST_STATUS.COPY_APPROVED,
    allowedRoles: ['pm', 'admin'],
    requires: ['no_unresolved_comments'],
  },
  activate_client_copy: {
    from: REQUEST_STATUS.COPY_APPROVED,
    to: REQUEST_STATUS.CLIENT_COPY_REVIEW,
    allowedRoles: ['pm', 'admin'],
  },
  give_art_go: {
    from: REQUEST_STATUS.COPY_APPROVED,
    to: REQUEST_STATUS.ART_IN_PROGRESS,
    allowedRoles: ['pm', 'admin'],
  },
  give_art_go_after_client: {
    from: REQUEST_STATUS.CLIENT_COPY_REVIEW,
    to: REQUEST_STATUS.ART_IN_PROGRESS,
    allowedRoles: ['pm', 'admin'],
  },
  submit_art: {
    from: REQUEST_STATUS.ART_IN_PROGRESS,
    to: REQUEST_STATUS.ART_REVIEW,
    allowedRoles: ['arte', 'admin'],
  },
  request_art_changes: {
    from: REQUEST_STATUS.ART_REVIEW,
    to: REQUEST_STATUS.ART_IN_PROGRESS,
    allowedRoles: ['pm', 'admin'],
    requires: ['has_new_comment'],
  },
  approve_art: {
    from: REQUEST_STATUS.ART_REVIEW,
    to: REQUEST_STATUS.ART_APPROVED,
    allowedRoles: ['pm', 'admin'],
    requires: ['no_critical_findings'],
  },
  activate_client_art: {
    from: REQUEST_STATUS.ART_APPROVED,
    to: REQUEST_STATUS.CLIENT_ART_REVIEW,
    allowedRoles: ['pm', 'admin'],
  },
  deliver: {
    from: REQUEST_STATUS.ART_APPROVED,
    to: REQUEST_STATUS.DELIVERED,
    allowedRoles: ['pm', 'admin'],
  },
  deliver_after_client: {
    from: REQUEST_STATUS.CLIENT_ART_REVIEW,
    to: REQUEST_STATUS.DELIVERED,
    allowedRoles: ['pm', 'admin'],
  },
  archive: {
    from: REQUEST_STATUS.DELIVERED,
    to: REQUEST_STATUS.ARCHIVED,
    allowedRoles: ['admin'],
  },
  cancel: {
    from: REQUEST_STATUS.DRAFT,
    to: REQUEST_STATUS.CANCELLED,
    allowedRoles: ['pm', 'admin'],
  },
}

export function getValidTransitions(
  currentStatus: RequestStatus,
  role: Role
): Array<{ action: string; to: RequestStatus }> {
  return Object.entries(TRANSITIONS)
    .filter(
      ([, def]) =>
        def.from === currentStatus && (def.allowedRoles as Role[]).includes(role)
    )
    .map(([action, def]) => ({ action, to: def.to }))
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Borrador',
  brief_ready: 'Brief listo',
  copy_in_progress: 'Copy en progreso',
  copy_review: 'Copy en revisión',
  copy_approved: 'Copy aprobado',
  client_copy_review: 'Revisión cliente (copy)',
  art_in_progress: 'Arte en progreso',
  art_review: 'Arte en revisión',
  art_approved: 'Arte aprobado',
  client_art_review: 'Revisión cliente (arte)',
  delivered: 'Entregado',
  archived: 'Archivado',
  cancelled: 'Cancelado',
}

export const STATUS_COLORS: Record<RequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  brief_ready: 'bg-blue-100 text-blue-700',
  copy_in_progress: 'bg-yellow-100 text-yellow-700',
  copy_review: 'bg-orange-100 text-orange-700',
  copy_approved: 'bg-green-100 text-green-700',
  client_copy_review: 'bg-purple-100 text-purple-700',
  art_in_progress: 'bg-cyan-100 text-cyan-700',
  art_review: 'bg-indigo-100 text-indigo-700',
  art_approved: 'bg-emerald-100 text-emerald-700',
  client_art_review: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-200 text-green-800',
  archived: 'bg-gray-200 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}
