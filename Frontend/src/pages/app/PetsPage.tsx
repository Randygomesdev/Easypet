import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, Plus, Loader2, Trash2, ClipboardList } from 'lucide-react'
import { petService, type PetResponse, SPECIES_LABEL, GENDER_LABEL } from '../../services/pet.service'

function PetCard({ pet, onDelete }: { pet: PetResponse; onDelete: () => void }) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Remover ${pet.name}?`)) return
    setDeleting(true)
    try { await petService.remove(pet.id); onDelete() }
    finally { setDeleting(false) }
  }

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm
                    overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Foto */}
      <div className="flex justify-center pt-6 pb-3">
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-(--color-secondary-400)
                        bg-(--color-bg) flex items-center justify-center">
          {pet.pictureUrl
            ? <img src={pet.pictureUrl} alt={pet.name} className="w-full h-full object-cover" />
            : <PawPrint size={28} className="text-(--color-text-muted) opacity-50" />
          }
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-4 flex flex-col items-center gap-1 text-center flex-1">
        <h3 className="text-lg font-bold text-(--color-text-heading)">{pet.name}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-bg) border border-(--color-border) text-(--color-text-muted)">
          {SPECIES_LABEL[pet.species]}
        </span>
        <p className="text-xs text-(--color-text-muted) mt-1">{pet.breed}</p>
        <p className="text-xs text-(--color-text-muted)">{GENDER_LABEL[pet.gender]} · {pet.weight} kg</p>

        {/* Ações */}
        <div className="flex gap-2 mt-3 w-full">
          <button onClick={() => navigate(`/app/pets/${pet.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-xl
                             bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600) transition-colors">
            <ClipboardList size={14} /> Prontuário
          </button>
          <button onClick={handleDelete} disabled={deleting}
                  className="px-3 py-2 rounded-xl border border-red-200 text-red-500
                             hover:bg-red-50 transition-colors disabled:opacity-40">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PetsPage() {
  const navigate        = useNavigate()
  const [pets, setPets] = useState<PetResponse[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    petService.list()
      .then(p => setPets(Array.isArray(p) ? p : (p.content ?? [])))
      .catch(() => setPets([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">Meus Pets</h1>
          <p className="text-sm text-(--color-text-muted) mt-1">Gerencie seus pets e acesse os prontuários</p>
        </div>
        <button onClick={() => navigate('/app/pets/novo')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
                           bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600) transition-colors">
          <Plus size={16} /> Adicionar Pet
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
        </div>
      ) : pets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24">
          <div className="w-16 h-16 rounded-full bg-(--color-bg) border border-(--color-border)
                          flex items-center justify-center">
            <PawPrint size={28} className="text-(--color-text-muted)" />
          </div>
          <p className="text-sm font-semibold text-(--color-text-body)">Nenhum pet cadastrado</p>
          <p className="text-xs text-(--color-text-muted)">Adicione seu primeiro pet para começar</p>
          <button onClick={() => navigate('/app/pets/novo')}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl
                             bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600) transition-colors">
            <Plus size={15} /> Adicionar Pet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pets.map(p => <PetCard key={p.id} pet={p} onDelete={load} />)}
        </div>
      )}
    </div>
  )
}
