import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, '', options)
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const msg =
      error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    )
  }

  return response
}
