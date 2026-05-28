'use client'

import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/hooks/useUser'
import { api } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS_LABELS, STATUS_COLORS } from '@orbit/config'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

interface Request {
  id: string
  number: number
  title: string
  status: string
  channel: string
  dueDate: string | null
  updatedAt: string
  segment?: { name: string } | null
}

interface RequestsResponse {
  data: Request[]
  total: number
  page: number
  limit: number
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  paid_digital: 'Digital Pago',
}

export default function SolicitudesPage() {
  const { data: user } = useUser()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['requests', { search, status: statusFilter, channel: channelFilter }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50', sort: 'updatedAt:desc' })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (channelFilter !== 'all') params.set('channel', channelFilter)
      return api.get<RequestsResponse>(`/api/v1/requests?${params}`).then((r) => r)
    },
  })

  const requests = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} solicitudes en total
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar solicitudes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los canales</SelectItem>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <p className="text-sm">No hay solicitudes</p>
            {(user?.role === 'admin' || user?.role === 'pm') && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/solicitudes/nueva">Crear primera solicitud</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Canal</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Segmento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{req.number}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/solicitudes/${req.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {req.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {CHANNEL_LABELS[req.channel] ?? req.channel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs ${STATUS_COLORS[req.status as keyof typeof STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS] ?? req.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {req.segment?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {formatRelativeTime(req.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
