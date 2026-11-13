import { Badge } from '../../components/ui/Badge'
import type { ReceptionCustomer } from '../../services/customer.service'

export function CustomerAccountBadge({ status }: { status: ReceptionCustomer['accountStatus'] }) {
  return status === 'CLAIMED'
    ? <Badge tone="success">Conta vinculada</Badge>
    : <Badge tone="neutral">Sem conta vinculada</Badge>
}
