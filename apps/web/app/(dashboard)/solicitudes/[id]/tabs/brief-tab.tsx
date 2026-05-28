'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface BriefTabProps {
  request: {
    objective: string
    brief: string
    dueDate: string | null
    createdAt: string
    variants: Array<{ id: string; name: string; description: string | null }>
    pm: { id: string; name: string; avatarUrl: string | null } | null
    copyUser: { id: string; name: string; avatarUrl: string | null } | null
    artUser: { id: string; name: string; avatarUrl: string | null } | null
    segment: { id: string; name: string } | null
  }
}

function UserChip({
  user,
  label,
}: {
  user: { name: string; avatarUrl: string | null } | null
  label: string
}) {
  if (!user) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-10">{label}</span>
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.avatarUrl ?? undefined} />
        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm">{user.name}</span>
    </div>
  )
}

export function BriefTab({ request }: BriefTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Objective */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Objetivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{request.objective}</p>
          </CardContent>
        </Card>

        {/* Team & meta */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <UserChip user={request.pm} label="PM" />
            <UserChip user={request.copyUser} label="Copy" />
            <UserChip user={request.artUser} label="Arte" />
            {request.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground w-10">Fecha</span>
                {formatDate(request.dueDate)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Brief */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{request.brief}</p>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">
            Variantes ({request.variants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {request.variants.map((v) => (
              <div key={v.id} className="flex flex-col gap-0.5">
                <Badge variant="secondary" className="text-xs">
                  {v.name}
                </Badge>
                {v.description && (
                  <span className="text-xs text-muted-foreground pl-1">{v.description}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
