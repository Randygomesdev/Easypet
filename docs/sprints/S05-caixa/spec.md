# S05 — Caixa e recebimentos no estabelecimento

## Objetivo

Implementar esta fatia do roadmap obedecendo às regras de [execução paralela](../README.md).

## Ownership exclusivo

Backend/Payment-Service/, Frontend/src/features/cashier/, Frontend/src/pages/partner/CaixaPage.tsx, Frontend/src/services/cashier.service.ts. Também pode editar esta pasta de sprint. Outros caminhos exigem pedido de integração ao dono; não editar diretamente.

## Entregas

- [ ] Criar recebimentos locais separados do checkout online: cobrança, adicionais, descontos, pagamentos parciais e saldo pendente.
- [ ] Implementar fechamento diário por estabelecimento, totais por forma de pagamento e ajustes com motivo/autor; usar valores monetários precisos.
- [ ] Garantir idempotência, concorrência e isolamento; serviço concluído não significa automaticamente dinheiro recebido.
- [ ] Publicar contratos de vínculo de cobrança a reserva para S03 e autorização para S02/S04.
- [ ] Entregar tela de caixa e extrato; manter checkout, concessão de créditos e estornos online bloqueados. Deixar endurecimento Mercado Pago para próxima onda.

## Dependências e início imediato

Ledger e testes podem começar já. Validar vínculo da reserva via contrato S03 e estabelecimento via S04; novas permissões via S02.

## Critérios de aceite

Caixa fecha com totais corretos, repetição não duplica recebimento, ajuste tem trilha e outro estabelecimento não lê/escreve movimentos.

## Validação

Testes de valores, pagamento parcial, idempotência, isolamento, fechamento concorrente e ajuste; build e estados da tela.

## Entrega obrigatória

contracts.md antes de integrar; integration.md para pedidos externos; status.md com evidências. Não alegar envio real, publicação, execução de teste ou conclusão integrada sem evidência. Qualquer frontend segue padrão visual, baixo acoplamento, atomização e galeria conforme README.
