'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const variantSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
})

const schema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  channel: z.enum(['email', 'whatsapp', 'sms', 'paid_digital'], {
    required_error: 'Seleccioná un canal',
  }),
  objective: z.string().min(10, 'Describí el objetivo (mínimo 10 caracteres)'),
  brief: z.string().min(10, 'Completá el brief (mínimo 10 caracteres)'),
  segmentId: z.string().optional(),
  dueDate: z.string().optional(),
  variants: z.array(variantSchema).min(1, 'Agregá al menos 1 variante'),
})

type FormData = z.infer<typeof schema>

interface Segment {
  id: string
  name: string
  audience: string
}

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      variants: [{ name: 'Variante A', description: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

  const { data: segmentsData } = useQuery({
    queryKey: ['segments'],
    queryFn: () =>
      api.get<{ data: Segment[] }>('/api/v1/segments').then((r) => r.data),
  })

  const createRequest = useMutation({
    mutationFn: (data: FormData) => api.post('/api/v1/requests', data),
    onSuccess: (res: any) => {
      toast({ title: 'Solicitud creada', description: `#${res.data?.number} creada correctamente` })
      router.push(`/solicitudes/${res.data?.id}`)
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message ?? 'No se pudo crear la solicitud',
      })
    },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/solicitudes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva solicitud</h1>
          <p className="text-sm text-muted-foreground">
            Completá el brief para que el equipo pueda empezar a trabajar
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => createRequest.mutate(data))} className="space-y-6">
        {/* Brief */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título de la solicitud</Label>
              <Input
                id="title"
                placeholder="ej: Email campaña San Valentín — segmento premium"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select onValueChange={(v) => setValue('channel', v as FormData['channel'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="paid_digital">Digital Pago</SelectItem>
                  </SelectContent>
                </Select>
                {errors.channel && (
                  <p className="text-xs text-destructive">{errors.channel.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select onValueChange={(v) => setValue('segmentId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(segmentsData ?? []).map((seg) => (
                      <SelectItem key={seg.id} value={seg.id}>
                        {seg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha límite</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Textarea
                id="objective"
                placeholder="¿Qué queremos lograr con esta comunicación?"
                rows={2}
                {...register('objective')}
              />
              {errors.objective && (
                <p className="text-xs text-destructive">{errors.objective.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief">Brief</Label>
              <Textarea
                id="brief"
                placeholder="Detallá el contexto, tono deseado, restricciones, referencias..."
                rows={4}
                {...register('brief')}
              />
              {errors.brief && (
                <p className="text-xs text-destructive">{errors.brief.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Variantes</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: `Variante ${String.fromCharCode(65 + fields.length)}`, description: '' })}
              >
                <Plus className="mr-1 h-3 w-3" />
                Agregar variante
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Nombre de la variante"
                    {...register(`variants.${index}.name`)}
                  />
                  {errors.variants?.[index]?.name && (
                    <p className="text-xs text-destructive">
                      {errors.variants[index]?.name?.message}
                    </p>
                  )}
                  <Input
                    placeholder="Descripción (opcional)"
                    {...register(`variants.${index}.description`)}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="shrink-0 mt-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            {errors.variants?.root && (
              <p className="text-xs text-destructive">{errors.variants.root.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/solicitudes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={createRequest.isPending}>
            {createRequest.isPending ? 'Creando...' : 'Crear solicitud'}
          </Button>
        </div>
      </form>
    </div>
  )
}
