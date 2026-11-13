# S04 — Clientes, pets e operação de balcão

## Objetivo

Implementar esta fatia do roadmap obedecendo às regras de [execução paralela](../README.md).

## Ownership exclusivo

Backend/Partner-Service/, Backend/Pet-Service/, Frontend/src/features/customers/, Frontend/src/pages/partner/ClientesPage.tsx, Frontend/src/pages/admin/ClientesPage.tsx, Frontend/src/services/customer.service.ts. Também pode editar esta pasta de sprint. Outros caminhos exigem pedido de integração ao dono; não editar diretamente.

## Entregas

- [ ] Entregar cadastro e busca de clientes e pets pela recepção com vínculo explícito ao parceiro e prevenção de duplicidades.
- [ ] Definir com S02 identidade de cliente sem conta e processo verificável para reivindicação; nunca vincular histórico só porque alguém informou o mesmo e-mail.
- [ ] Preservar isolamento de pets/prontuários e acesso mínimo; implementar fluxo de reserva de balcão consumindo contrato S03 quando pronto.
- [ ] Entregar telas de clientes do parceiro e administração com paginação, estados úteis e componentes reaproveitáveis.
- [ ] Publicar contratos de acesso a cliente/pet e establishment membership para S02/S03/S05 antes das integrações.

## Dependências e início imediato

Modelagem local pode começar já. Identidade/conta via contrato S02, reservas via S03, rotas e design system via S01.

## Critérios de aceite

Parceiro cadastra tutor e pet sem API manual; outro parceiro não acessa indevidamente; duplicidades são tratadas e reivindicação exige verificação. Reserva integrada somente se validada com S03.

## Validação

Testes de isolamento, duplicidade, reivindicação indevida e APIs administrativas; testes do fluxo de balcão quando integrado.

## Entrega obrigatória

contracts.md antes de integrar; integration.md para pedidos externos; status.md com evidências. Não alegar envio real, publicação, execução de teste ou conclusão integrada sem evidência. Qualquer frontend segue padrão visual, baixo acoplamento, atomização e galeria conforme README.
