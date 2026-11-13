# S02 — Identidade, onboarding e acessos

## Objetivo

Implementar esta fatia do roadmap obedecendo às regras de [execução paralela](../README.md).

## Ownership exclusivo

Backend/Auth-Service/, Frontend/src/pages/auth/, Frontend/src/services/auth.service.ts, Frontend/src/types/auth.types.ts, Frontend/src/contexts/AuthContext.tsx. Também pode editar esta pasta de sprint. Outros caminhos exigem pedido de integração ao dono; não editar diretamente.

## Entregas

- [ ] Entregar registro específico de parceiro controlado pelo servidor, preservando registro de CUSTOMER e impedindo escalada para ADMIN.
- [ ] Completar recuperação de senha ponta a ponta, telas e estados de token inválido/expirado/usado; SMTP configurável sem mensagens reais nesta execução.
- [ ] Entregar API administrativa paginada de clientes e ativação/desativação autorizada, minimizando dados retornados.
- [ ] Definir e implementar base de acessos individuais vinculados ao estabelecimento, convite e revogação; publicar contrato antes de exigir mudanças em outros serviços.
- [ ] Publicar contratos de identidade de tutor/cliente de balcão para S04, e de autorização para S03/S05/S06; não afrouxar isolamento para destravar integração.

## Dependências e início imediato

Backend e telas auth podem começar já. Integração de rotas via S01; contratos de cliente e permissões devem ser publicados cedo para S04.

## Critérios de aceite

Cadastro PARTNER e CUSTOMER produzem papéis corretos, reset não pode ser reutilizado, listagem restrita a ADMIN e acesso revogado não continua válido no Auth; enforcement nos demais serviços deve constar como integração pendente até S07 validar.

## Validação

Testes de registro sem escalada, reset, paginação/permissões e revogação; compilar Auth e frontend quando dependências prontas.

## Entrega obrigatória

contracts.md antes de integrar; integration.md para pedidos externos; status.md com evidências. Não alegar envio real, publicação, execução de teste ou conclusão integrada sem evidência. Qualquer frontend segue padrão visual, baixo acoplamento, atomização e galeria conforme README.
