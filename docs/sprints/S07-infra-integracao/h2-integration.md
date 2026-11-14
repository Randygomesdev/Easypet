# H2 — Integração S07

## S06 — evento de recuperação operacional

Pedido conciliado com o protocolo publicado pela S06. S07 usa `incidentId` estável, sequência 1 em `OPEN` e sequência 2 em `RECOVERED`, sem novos códigos. S06 conserva autoria ADMIN quando houver resolução manual e usa `SYSTEM` na recuperação automática. Diagnóstico local distingue o vencimento pelo campo `backupRecent`. [Contrato S06](../S06-notificacoes/h2-contracts.md).

## S03 e S05 — revisão da projeção de autoria

Contratos publicados conciliam `approvedBy → acceptedBy` e preservam a distinção entre identidade do tutor e autor da prova presencial. A projeção é interna e fica fora do Gateway. [Booking](../S03-agenda/h2-contracts.md) · [Payment](../S05-caixa/h2-contracts.md).

## Espera para o integrado

S07 prepara o roteamento a partir dos contratos publicados. A execução do E2E completo depende da liberação dos seis domínios, do slot Docker e da sonda de navegador. Smoke publicado de ADMIN e Google real permanece uma operação separada.

A sondagem de navegador já liberou Chrome local. A fila PostgreSQL está descrita no [gate](h2-resource-gate.md). Os ajustes dos mapas frontend de `BookingStatus` com `INTERRUPTED` são condição de build da stack. A S03 registrou os dois arquivos fora de seu escopo para os donos, e S07 aguarda confirmação no handoff antes do build. [Status S03](../S03-agenda/h2-status.md#validação-e-slot).

Pedido à R01 e aos donos de frontend: confirmar ownership e fechamento dos três mapas `Record<BookingStatus, string>` que faltam em `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx` e `Frontend/src/pages/partner/DashboardPage.tsx`. A S07 reproduziu a falha com `tsc --project tsconfig.app.json --noEmit --incremental false`. Os slots PostgreSQL de S02–S05 já terminaram, e S06 cedeu o próprio slot. O slot S07 está disponível assim que o frontend concluir seu handoff.
