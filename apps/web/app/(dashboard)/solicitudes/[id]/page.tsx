'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUser } from '@/hooks/useUser'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { STATUS_LABELS, STATUS_COLORS, getValidTransitions } from '@orbit/config'
import { ArrowLeft, Calendar, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { BriefTab } from './tabs/brief-tab'
import { CopiesTab } from './tabs/copies-tab'

interface Variant {
  id: string
  name: string
  description: string | null
  sortOrder: number
}

interface RequestDetail {
  id: string
  number: number
  title: string
  status: string
  channel: string
  objective: string
  brief: string
  dueDate: string | null
  createdAt: string
  updatedAt: string
  segment: { id: string; name: string } | null
  pm: { id: string; name: string; avatarUrl: string | null } | null
  copyUser: { id: string; name: string; avatarUrl: string | null } | null
  artUser: { id: string; name: string; avatarUrl: string | null } | null
  variants: Variant[]
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  paid_digital: 'Digital Pago',
}

const TRANSITION_LABELS: Record<string, string> = {
  start_copy: 'Iniciar copy',
  submit_copy: 'Enviar a revisión',
  request_changes: 'Pedir cambios',
  approve_copy: 'Aprobar copy',
  activate_client_copy: 'Enviar a cliente',
  give_art_go: 'Dar go a arte',
  give_art_go_after_client: 'Dar go a arte',
  submit_art: 'Enviar arte a revisión',
  request_art_changes: 'Pedir cambios en arte',
  approve_art: 'Aprobar arte',
  activate_client_art: 'Enviar arte a cliente',
  deliver: 'Marcar como entregado',
  deliver_after_client: 'Marcar como entregado',
  archive: 'Archivar',
  cancel: 'Cancelar',
}

export default function SolicitudDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: user } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: request, isLoading } = useQuery({
    queryKey: ['requests', id],
    queryFn: () =>
      api.get<{ data: RequestDetail }>(`/api/v1/requests/${id}`).then((r) => r.data),
  })

  const transition = useMutation({
    mutationFn: ({ action }: { action: string }) =>
      api.post(`/api/v1/requests/${id}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', id] })
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      toast({ title: 'Estado actualizado' })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message ?? 'No se pudo cambiar el estado',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Solicitud no encontrada</p>
        <Button variant="link" asChild>
          <Link href="/solicitudes">Volver</Link>
        </Button>
      </div>
    )
  }

  const validTransitions = user
    ? getValidTransitions(request.status as any, user.role as any)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
            <Link href="/solicitudes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">#{request.number}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <h1 className="text-xl font-bold">{request.title}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                className={`text-xs ${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}`}
              >
                {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS] ?? request.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {CHANNEL_LABELS[request.channel] ?? request.channel}
              </Badge>
              {request.segment && (
                <Badge variant="outline" className="text-xs">
                  {request.segment.name}
                </Badge>
              )}
              {request.dueDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(request.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transition actions */}
        {validTransitions.length > 0 && (
          <div className="flex gap-2 shrink-0">
            {validTransitions.map(({ action }) => (
              <Button
                key={action}
                size="sm"
                variant={action.includes('cancel') ? 'destructive' : action.includes('approve') || action.includes('deliver') ? 'default' : 'outline'}
                onClick={() => transition.mutate({ action })}
                disabled={transition.isPending}
              >
                {TRANSITION_LABELS[action] ?? action}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="brief">
        <TabsList>
          <TabsTrigger value="brief">Brief</TabsTrigger>
          <TabsTrigger value="copies">Copies</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="brief" className="mt-4">
          <BriefTab request={request} />
        </TabsContent>

        <TabsContent value="copies" className="mt-4">
          <CopiesTab requestId={id} variants={request.variants} requestStatus={request.status} />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Assets próximamente</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <RequestHistory requestId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RequestHistory({ requestId }: { requestId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['requests', requestId, 'history'],
    queryFn: () =>
      api
        .get<{ data: Array<{ id: string; action: string; userId: string; userName: string; createdAt: string; metadata: unknown }> }>(
          `/api/v1/requests/${requestId}/history`
        )
        .then((r) => r.data),
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial de cambios</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin historial</p>
        ) : (
          <div className="space-y-3">
            {data.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {entry.userName?.charAt(0) ?? '?'}
                </div>
                <div>
                  <span className="font-medium">{entry.userName}</span>
                  <span className="text-muted-foreground"> · {entry.action}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
