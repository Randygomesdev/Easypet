# S03 — Agenda confiável e atendimento

## Objetivo

Implementar esta fatia do roadmap obedecendo às regras de [execução paralela](../README.md).

## Ownership exclusivo

Backend/Booking-Service/, Frontend/src/pages/partner/AgendamentosPage.tsx, Frontend/src/pages/partner/AtendimentoPage.tsx, Frontend/src/pages/app/MeusAgendamentosPage.tsx, Frontend/src/services/booking.service.ts, Frontend/src/features/booking/. Também pode editar esta pasta de sprint. Outros caminhos exigem pedido de integração ao dono; não editar diretamente.

## Entregas

- [ ] Preservar transições já implementadas e impedir conflito de intervalos/capacidade com concorrência real no banco.
- [ ] Implementar idempotência de criação, reagendamento atômico com histórico e manutenção da reserva original se falhar.
- [ ] Implementar falta, motivos de cancelamento e bloqueio excepcional sem alterar reservas confirmadas silenciosamente.
- [ ] Adicionar checklist básico de entrada, observações e pronto para retirada adequado ao banho e tosa, sem prometer prontuário clínico completo.
- [ ] Preparar outbox transacional de eventos de reserva, mudança, cancelamento e pronto, com IDs estáveis para S06; publicar contrato com versão e dados mínimos.

## Dependências e início imediato

Concorrência e estados começam já. Identidades de balcão dependem do contrato S04; consumidor de eventos é S06; novas permissões dependem S02.

## Critérios de aceite

Testes concorrentes respeitam última vaga; repetir solicitação não duplica reserva; reagendamento malsucedido preserva original; UI reflete estados reais e eventos são recuperáveis.

## Validação

Testes de integração PostgreSQL para concorrência/idempotência/reagendamento e regressão de isolamento; testes frontend focados em estados alterados.

## Entrega obrigatória

contracts.md antes de integrar; integration.md para pedidos externos; status.md com evidências. Não alegar envio real, publicação, execução de teste ou conclusão integrada sem evidência. Qualquer frontend segue padrão visual, baixo acoplamento, atomização e galeria conforme README.
