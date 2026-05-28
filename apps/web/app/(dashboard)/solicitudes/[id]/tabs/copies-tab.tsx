'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUser } from '@/hooks/useUser'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, Plus, Save, ChevronDown, ChevronUp } from 'lucide-react'

interface CopySection {
  key: string
  label: string
  value: string
  charLimit?: number
}

interface CopyVersion {
  id: string
  variantId: string | null
  versionNumber: number
  content: CopySection[]
  generationType: 'manual' | 'ai_generated' | 'ai_edited'
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved'
  authorName: string
  createdAt: string
}

interface Variant {
  id: string
  name: string
}

interface CopiesTabProps {
  requestId: string
  variants: Variant[]
  requestStatus: string
}

const COPY_STATUS_LABELS = {
  draft: 'Borrador',
  in_review: 'En revisión',
  changes_requested: 'Con cambios',
  approved: 'Aprobado',
}

const COPY_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  in_review: 'bg-yellow-100 text-yellow-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
}

export function CopiesTab({ requestId, variants, requestStatus }: CopiesTabProps) {
  const { data: user } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null
  )
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})

  const canEditCopy = user?.role === 'copy' || user?.role === 'admin'
  const canReviewCopy = user?.role === 'pm' || user?.role === 'admin'
  const canGenerateAI = canEditCopy

  const { data: copies, isLoading } = useQuery({
    queryKey: ['copies', requestId, selectedVariantId],
    queryFn: () =>
      api
        .get<{ data: CopyVersion[] }>(
          `/api/v1/requests/${requestId}/copies${selectedVariantId ? `?variantId=${selectedVariantId}` : ''}`
        )
        .then((r) => r.data),
    enabled: !!requestId,
  })

  const generateAI = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/requests/${requestId}/copies/generate`, {
        variantId: selectedVariantId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copies', requestId] })
      toast({ title: 'Copy generado por IA', description: 'Revisá el resultado antes de enviarlo' })
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })

  const saveCopy = useMutation({
    mutationFn: ({ versionId, content }: { versionId: string; content: CopySection[] }) =>
      api.put(`/api/v1/requests/${requestId}/copies/${versionId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copies', requestId] })
      toast({ title: 'Copy guardado' })
    },
  })

  const submitCopy = useMutation({
    mutationFn: (versionId: string) =>
      api.post(`/api/v1/requests/${requestId}/copies/${versionId}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copies', requestId] })
      toast({ title: 'Copy enviado a revisión' })
    },
  })

  const approveCopy = useMutation({
    mutationFn: (versionId: string) =>
      api.post(`/api/v1/requests/${requestId}/copies/${versionId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copies', requestId] })
      toast({ title: 'Copy aprobado' })
    },
  })

  const latestVersion = copies?.[0]

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      {variants.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {variants.map((v) => (
            <Button
              key={v.id}
              variant={selectedVariantId === v.id ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSelectedVariantId(v.id)}
            >
              {v.name}
            </Button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canGenerateAI && ['brief_ready', 'copy_in_progress'].includes(requestStatus) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAI.mutate()}
            disabled={generateAI.isPending}
          >
            <Sparkles className="mr-2 h-3 w-3" />
            {generateAI.isPending ? 'Generando...' : 'Generar con IA'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !copies || copies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No hay versiones de copy todavía</p>
            {canGenerateAI && (
              <p className="text-xs mt-1">Generá con IA o esperá que un copywriter empiece a trabajar</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {copies.map((version, idx) => (
            <Card key={version.id} className={idx === 0 ? 'border-primary/20' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">
                      Versión {version.versionNumber}
                    </CardTitle>
                    <Badge
                      className={`text-xs ${COPY_STATUS_COLORS[version.status] ?? 'bg-muted'}`}
                    >
                      {COPY_STATUS_LABELS[version.status] ?? version.status}
                    </Badge>
                    {version.generationType === 'ai_generated' && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="mr-1 h-2 w-2" />
                        IA
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {version.authorName} · {formatRelativeTime(version.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        setExpandedVersionId(
                          expandedVersionId === version.id ? null : version.id
                        )
                      }
                    >
                      {expandedVersionId === version.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {(expandedVersionId === version.id || idx === 0) && (
                <CardContent className="space-y-3">
                  {version.content.map((section) => (
                    <div key={section.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {section.label}
                        </Label>
                        {section.charLimit && (
                          <span
                            className={`text-xs ${
                              (editingContent[section.key] ?? section.value).length >
                              section.charLimit
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {(editingContent[section.key] ?? section.value).length}/{section.charLimit}
                          </span>
                        )}
                      </div>
                      {canEditCopy && version.status === 'draft' && idx === 0 ? (
                        <Textarea
                          value={editingContent[section.key] ?? section.value}
                          onChange={(e) =>
                            setEditingContent((prev) => ({
                              ...prev,
                              [section.key]: e.target.value,
                            }))
                          }
                          rows={section.label.toLowerCase().includes('body') ? 4 : 2}
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md px-3 py-2 min-h-[2rem]">
                          {section.value || <span className="text-muted-foreground italic">Sin contenido</span>}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Actions for latest version */}
                  {idx === 0 && (
                    <div className="flex gap-2 pt-2 border-t">
                      {canEditCopy && version.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updatedContent = version.content.map((s) => ({
                                ...s,
                                value: editingContent[s.key] ?? s.value,
                              }))
                              saveCopy.mutate({ versionId: version.id, content: updatedContent })
                            }}
                            disabled={saveCopy.isPending}
                          >
                            <Save className="mr-1 h-3 w-3" />
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => submitCopy.mutate(version.id)}
                            disabled={submitCopy.isPending}
                          >
                            Enviar a revisión
                          </Button>
                        </>
                      )}
                      {canReviewCopy && version.status === 'in_review' && (
                        <Button
                          size="sm"
                          onClick={() => approveCopy.mutate(version.id)}
                          disabled={approveCopy.isPending}
                        >
                          Aprobar copy
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
