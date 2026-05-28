'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useUser } from '@/hooks/useUser'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'

interface Segment {
  id: string
  name: string
  audience: string
  tone: string | null
  preferredChannels: string[] | null
  isActive: boolean
  createdAt: string
}

const schema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  audience: z.string().min(10, 'Describí la audiencia'),
  tone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function SegmentosPage() {
  const { data: currentUser } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'pm'

  const { data, isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: () =>
      api.get<{ data: Segment[] }>('/api/v1/segments').then((r) => r.data),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const save = useMutation({
    mutationFn: (data: FormData) =>
      editingSegment
        ? api.put(`/api/v1/segments/${editingSegment.id}`, data)
        : api.post('/api/v1/segments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] })
      toast({ title: editingSegment ? 'Segmento actualizado' : 'Segmento creado' })
      setDialogOpen(false)
      setEditingSegment(null)
      reset()
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })

  const deleteSegment = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/segments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] })
      toast({ title: 'Segmento eliminado' })
    },
  })

  function openEdit(segment: Segment) {
    setEditingSegment(segment)
    reset({ name: segment.name, audience: segment.audience, tone: segment.tone ?? '' })
    setDialogOpen(true)
  }

  function openCreate() {
    setEditingSegment(null)
    reset({ name: '', audience: '', tone: '' })
    setDialogOpen(true)
  }

  const segments = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Segmentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Perfiles de audiencia para guiar la generación de copy
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo segmento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : segments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay segmentos todavía</p>
            {canEdit && (
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                Crear primer segmento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((seg) => (
            <Card key={seg.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{seg.name}</CardTitle>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(seg)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('¿Eliminar este segmento?')) {
                            deleteSegment.mutate(seg.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-3">{seg.audience}</p>
                {seg.tone && (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{seg.tone}</Badge>
                  </div>
                )}
                {seg.preferredChannels && seg.preferredChannels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {seg.preferredChannels.map((ch) => (
                      <Badge key={ch} variant="secondary" className="text-xs">
                        {ch}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSegment ? 'Editar segmento' : 'Nuevo segmento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => save.mutate(d))}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="seg-name">Nombre</Label>
                <Input id="seg-name" {...register('name')} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="seg-audience">Descripción de la audiencia</Label>
                <Textarea
                  id="seg-audience"
                  rows={3}
                  placeholder="¿Quiénes son? Edad, intereses, comportamiento, etc."
                  {...register('audience')}
                />
                {errors.audience && (
                  <p className="text-xs text-destructive">{errors.audience.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="seg-tone">Tono de comunicación</Label>
                <Input
                  id="seg-tone"
                  placeholder="ej: formal, cercano, aspiracional"
                  {...register('tone')}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
