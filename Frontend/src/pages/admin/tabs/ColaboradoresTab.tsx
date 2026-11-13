import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, UserRound, Pencil, Trash2, Users } from 'lucide-react'
import { staffService, type StaffResponse } from '../../../services/staff.service'

export default function ColaboradoresTab({ partnerId }: { partnerId: string }) {
  const navigate             = useNavigate()
  const [staff, setStaff]    = useState<StaffResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    staffService.getByPartner(partnerId)
      .then(members => setStaff(members.filter(s => s.status === 'ACTIVE')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [partnerId])

  async function handleRemove(id: string) {
    if (!confirm('Deseja desativar este colaborador?')) return
    setRemoving(id)
    try {
      await staffService.remove(id)
      setStaff(prev => prev.filter(s => s.id !== id))
    } finally { setRemoving(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-(--color-text-heading)">Colaboradores</h2>
          <p className="text-sm text-(--color-text-muted) mt-1">Equipe do estabelecimento — agenda e dados profissionais</p>
        </div>
        <button
          onClick={() => navigate(`/admin/parceiros/${partnerId}/colaboradores/novo`)}
          className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
          text-white font-semibold px-4 py-2.5 rounded-full text-sm transition-colors shrink-0"
        >
          <Plus size={16} /> Colaborador
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-(--color-surface) border border-(--color-border) flex items-center justify-center">
            <Users size={28} className="text-(--color-text-muted)" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--color-text-body)">Nenhum colaborador cadastrado</p>
            <p className="text-xs text-(--color-text-muted) mt-1">Adicione os membros da equipe.</p>
          </div>
          <button
            onClick={() => navigate(`/admin/parceiros/${partnerId}/colaboradores/novo`)}
            className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
            text-white font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
          >
            <Plus size={15} /> Adicionar Colaborador
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {staff.map(s => (
            <StaffCard
              key={s.id}
              staff={s}
              removing={removing === s.id}
              onEdit={() => navigate(`/admin/parceiros/${partnerId}/colaboradores/${s.id}`)}
              onRemove={() => handleRemove(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StaffCard({ staff, removing, onEdit, onRemove }: {
  staff: StaffResponse; removing: boolean; onEdit: () => void; onRemove: () => void
}) {
  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-5 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        {staff.photoUrl ? (
          <img src={staff.photoUrl} alt={staff.name} referrerPolicy="no-referrer" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-(--color-bg) border-2 border-(--color-border) flex items-center justify-center">
            <UserRound size={32} className="text-(--color-text-muted)" />
          </div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-semibold text-(--color-text-heading) truncate">{staff.name}</p>
        <p className="text-xs text-(--color-text-muted) mt-0.5 truncate">{staff.jobTitle ?? staff.speciality ?? 'Colaborador'}</p>
        {staff.email && <p className="text-xs text-(--color-text-muted) truncate mt-0.5">{staff.email}</p>}
      </div>
      <div className="flex items-center gap-2 mt-1 w-full">
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-(--color-border)
          rounded-lg py-1.5 text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
          <Pencil size={13} /> Editar
        </button>
        <button onClick={onRemove} disabled={removing}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-(--color-border)
          text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50">
          {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  )
}
