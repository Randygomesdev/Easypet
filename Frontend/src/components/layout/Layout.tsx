import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  function closeSidebar() {
    setSidebarOpen(false)
    if (sidebarOpen) requestAnimationFrame(() => menuButton.current?.focus())
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 48rem)')
    const closeOnDesktop = (event: MediaQueryListEvent) => { if (event.matches) setSidebarOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden bg-(--color-bg)">

      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="flex flex-col flex-1 min-w-0" inert={sidebarOpen} aria-hidden={sidebarOpen || undefined}>
        <Header menuButtonRef={menuButton} menuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
          {children}
        </main>
      </div>

    </div>
  )
}
