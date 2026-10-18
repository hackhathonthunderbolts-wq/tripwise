import type { ReactNode } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-forest-600 focus:px-4 focus:py-2 focus:text-ivory-50"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1 pb-16 pt-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
