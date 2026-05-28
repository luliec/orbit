import type { Context, Next } from 'hono'
import { verifySupabaseToken } from '../lib/supabase'
import { getDb } from '@orbit/db'
import { users } from '@orbit/db'
import { eq } from 'drizzle-orm'
import { UnauthorizedError } from '../lib/errors'

export type AuthUser = {
  id: string
  authId: string
  email: string
  name: string
  role: 'admin' | 'pm' | 'copy' | 'arte'
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError()
  }

  const token = authHeader.slice(7)
  const supabaseUser = await verifySupabaseToken(token)

  if (!supabaseUser) {
    throw new UnauthorizedError('Token inválido o expirado')
  }

  const db = getDb()
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.authId, supabaseUser.id))
    .limit(1)

  if (!dbUser || !dbUser.isActive) {
    throw new UnauthorizedError('Usuario no encontrado o inactivo en Orbit')
  }

  c.set('user', {
    id: dbUser.id,
    authId: dbUser.authId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as AuthUser['role'],
  })

  await next()
}
