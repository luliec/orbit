import type { Context, Next } from 'hono'
import type { Role } from '@orbit/config'
import { ForbiddenError } from '../lib/errors'

export function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) throw new ForbiddenError()

    if (!(roles as string[]).includes(user.role)) {
      throw new ForbiddenError()
    }

    await next()
  }
}
