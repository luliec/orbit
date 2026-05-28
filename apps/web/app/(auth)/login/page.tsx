import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  searchParams: { error?: string }
}

export default function LoginPage({ searchParams }: Props) {
  const error = searchParams?.error

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">O</span>
          </div>
          <span className="text-xl font-bold">Orbit</span>
        </div>
        <CardTitle className="text-2xl">Bienvenido</CardTitle>
        <CardDescription>
          Ingresá con tu cuenta de trabajo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" action="/api/auth/login" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nombre@empresa.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <Button type="submit" className="w-full">
            Ingresar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
