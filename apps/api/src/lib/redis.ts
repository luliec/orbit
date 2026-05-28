import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limit: 10 generaciones de copy por usuario por hora
export const aiCopyRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'orbit:ai:copy',
})

// Rate limit: 50 revisiones de arte por día por workspace
export const aiArtRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 d'),
  prefix: 'orbit:ai:art',
})
