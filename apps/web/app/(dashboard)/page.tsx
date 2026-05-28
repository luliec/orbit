'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUser } from '@/hooks/useUser'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileText, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS } from '@orbit/config'

interface Request {
  id: string
  number: number
  title: string
  status: string
  channel: string
  dueDate: string | null
  updatedAt: string
}

interface RequestsResponse {
  data: Request[]
  total: number
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  paid_digital: 'Digital Pago',
}

export default function DashboardPage() {
  const { data: user } = useUser()

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['requests', 'dashboard'],
    queryFn: () =>
      api
        .get<RequestsResponse>('/api/v1/requests?limit=10&sort=updatedAt:desc')
        .then((r) => r),
  })

  const requests = requestsData?.data ?? []

  const pending = requests.filter((r) =>
    ['draft', 'brief_ready', 'copy_in_progress', 'copy_review', 'art_in_progress', 'art_review'].includes(r.status)
  )
  const delivered = requests.filter((r) => r.status === 'delivered')
  const overdue = requests.filter(
    (r) =>
      r.dueDate &&
      new Date(r.dueDate) < new Date() &&
      !['delivered', 'archived'].includes(r.status)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hola, {user?.name?.split(' ')[0] ?? ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acá está el estado de tus solicitudes activas
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'pm') && (
          <Button asChild>
            <Link href="/solicitudes/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva solicitud
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En progreso
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregadas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delivered.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidas
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdue.length > 0 ? 'text-destructive' : ''}`}>
              {overdue.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Actividad reciente</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/solicitudes">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p className="text-sm">No hay solicitudes todavía</p>
              {(user?.role === 'admin' || user?.role === 'pm') && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/solicitudes/nueva">Crear primera solicitud</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {requests.slice(0, 8).map((req) => (
                <Link
                  key={req.id}
                  href={`/solicitudes/${req.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">
                      #{req.number}
                    </span>
                    <span className="text-sm font-medium truncate">{req.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {CHANNEL_LABELS[req.channel] ?? req.channel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <Badge
                      className={`text-xs ${STATUS_COLORS[req.status as keyof typeof STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS] ?? req.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(req.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
