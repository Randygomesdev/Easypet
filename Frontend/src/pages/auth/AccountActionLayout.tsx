import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/Card'
import LogoEasypet from '../../assets/LogoEasypet.svg'

export const authLinkClass = 'font-semibold text-text-heading underline-offset-4 hover:underline'

export default function AccountActionLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3 text-center">
            <Link to="/login" aria-label="EasyPet — voltar ao login" className="inline-flex">
              <img src={LogoEasypet} alt="EasyPet" className="size-10" />
            </Link>
            <h1 className="text-2xl font-bold text-text-heading">{title}</h1>
          </div>
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
