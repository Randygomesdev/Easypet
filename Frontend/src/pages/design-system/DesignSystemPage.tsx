import { Moon, Sun } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useTheme } from '../../contexts/ThemeContext'
import AccountExamples from './AccountExamples'
import BookingExamples from './BookingExamples'
import ControlExamples from './ControlExamples'
import CustomerExamples from './CustomerExamples'
import DataExamples from './DataExamples'
import FoundationExamples from './FoundationExamples'
import OperationsExamples from './OperationsExamples'

const sections = [
  ['cores', 'Cores'],
  ['tipografia', 'Tipografia'],
  ['botoes', 'Botões'],
  ['campos', 'Campos e selects'],
  ['badges', 'Badges'],
  ['dialogos', 'Diálogos'],
  ['cards', 'Cards'],
  ['tabelas', 'Tabelas e paginação'],
  ['estados', 'Estados'],
  ['clientes', 'Busca de clientes'],
  ['contas', 'Recuperação e convite'],
  ['atendimento', 'Entrada para banho e tosa'],
  ['caixa', 'Caixa'],
  ['notificacoes', 'Tentativas de notificação'],
]

export default function DesignSystemPage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const ThemeIcon = isDark ? Sun : Moon

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Design system</h1>
          <p className="mt-1 text-sm text-text-body">Tokens, componentes e exemplos de uso no EasyPet.</p>
        </div>
        <Button variant="secondary" onClick={toggleTheme}>
          <ThemeIcon size={16} aria-hidden="true" /> {isDark ? 'Modo claro' : 'Modo escuro'}
        </Button>
      </div>
      <nav aria-label="Seções do design system" className="flex flex-wrap gap-x-4 gap-y-1 rounded-2xl border border-border bg-surface px-4 py-3">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`}
            className="rounded py-1 text-sm font-medium text-text-heading hover:underline focus-visible:outline-2 focus-visible:outline-primary-400">
            {label}
          </a>
        ))}
      </nav>
      <FoundationExamples />
      <ControlExamples />
      <DataExamples />
      <CustomerExamples />
      <AccountExamples />
      <BookingExamples />
      <OperationsExamples />
    </div>
  )
}
