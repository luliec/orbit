'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Role } from '@orbit/config'

interface UserProfile {
  id: string
  authId: string
  email: string
  name: string
  role: Role
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

export function useUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.get<{ data: UserProfile }>('/api/v1/users/me').then((r) => r.data),
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: false,
  })
}
