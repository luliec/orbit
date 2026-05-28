'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui.store'
import { useUser } from '@/hooks/useUser'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Tags,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['admin', 'pm', 'copy', 'arte'],
  },
  {
    label: 'Solicitudes',
    href: '/solicitudes',
    icon: FileText,
    roles: ['admin', 'pm', 'copy', 'arte'],
  },
  {
    label: 'Segmentos',
    href: '/segmentos',
    icon: Tags,
    roles: ['admin', 'pm'],
  },
  {
    label: 'Equipo',
    href: '/equipo',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    roles: ['admin'],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { data: user } = useUser()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !user || item.roles.includes(user.role)
  )

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-background transition-all duration-300',
        sidebarOpen ? 'w-56' : 'w-14'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
            <span className="text-xs font-bold text-primary-foreground">O</span>
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm whitespace-nowrap">Orbit</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-2">
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2',
                    !sidebarOpen && 'justify-center px-0'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center"
          aria-label={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}
