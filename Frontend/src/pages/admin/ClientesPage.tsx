import { Users, Search } from 'lucide-react'

export default function ClientesPage() {
  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">Clientes</h1>
        <p className="text-sm text-(--color-text-muted) mt-1">
          Gerencie todos os clientes cadastrados na plataforma
        </p>
      </div>

      {/* Busca (desabilitada) */}
      <div className="relative max-w-sm opacity-50 pointer-events-none">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
        <input
          placeholder="Buscar por nome ou e-mail…"
          disabled
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-(--color-border)
                     bg-(--color-surface) text-(--color-text-body)"
        />
      </div>

      {/* Tabela / estado pendente */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--color-border)">
                {['Nome', 'E-mail', 'Telefone', 'Pets', 'Cadastro', 'Status', 'Ações'].map(col => (
                  <th key={col}
                    className="text-left px-5 py-3.5 text-[11px] font-bold text-(--color-text-muted)
                               uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-(--color-bg) border border-(--color-border)
                                    flex items-center justify-center">
                      <Users size={24} className="text-(--color-text-muted)" />
                    </div>
                    <p className="text-sm font-semibold text-(--color-text-body)">
                      Endpoint em desenvolvimento
                    </p>
                    <p className="text-xs text-(--color-text-muted) max-w-xs">
                      O <strong>User-service</strong> está sendo construído.
                      Em breve esta tela exibirá a lista completa de clientes com busca, paginação e gestão de perfil.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
