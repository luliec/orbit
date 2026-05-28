'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getInitials } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Mail } from 'lucide-react'

interface UserProfile {
  id: string
  authId: string
  email: string
  name: string
  role: string
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  pm: 'Project Manager',
  copy: 'Copywriter',
  arte: 'Arte',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  pm: 'bg-blue-100 text-blue-700',
  copy: 'bg-green-100 text-green-700',
  arte: 'bg-orange-100 text-orange-700',
}

export default function EquipoPage() {
  const { data: currentUser } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('copy')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () =>
      api.get<{ data: UserProfile[] }>('/api/v1/users').then((r) => r.data),
  })

  const invite = useMutation({
    mutationFn: () =>
      api.post('/api/v1/users/invite', { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Invitación enviada', description: `Se envió un email a ${inviteEmail}` })
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('copy')
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.put(`/api/v1/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Rol actualizado' })
    },
  })

  const toggleActive = useMutation({
    mutationFn: (userId: string) => api.put(`/api/v1/users/${userId}/deactivate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const users = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} miembro{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar miembro
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      {!user.isActive && (
                        <Badge variant="outline" className="text-xs">Inactivo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {currentUser?.role === 'admin' && user.id !== currentUser.id ? (
                        <Select
                          value={user.role}
                          onValueChange={(role) =>
                            changeRole.mutate({ userId: user.id, role })
                          }
                        >
                          <SelectTrigger className="h-6 text-xs w-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          className={`text-xs ${ROLE_COLORS[user.role] ?? 'bg-muted'}`}
                        >
                          {ROLE_LABELS[user.role] ?? user.role}
                        </Badge>
                      )}
                      {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => toggleActive.mutate(user.id)}
                        >
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar miembro al equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nombre@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => invite.mutate()}
              disabled={!inviteEmail || invite.isPending}
            >
              {invite.isPending ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
