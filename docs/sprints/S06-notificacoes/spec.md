# S06 — Notificações transacionais

## Objetivo

Implementar esta fatia do roadmap obedecendo às regras de [execução paralela](../README.md).

## Ownership exclusivo

Backend/Notification-Service/ (novo módulo isolado), Frontend/src/features/notifications/, Frontend/src/services/notification.service.ts. Também pode editar esta pasta de sprint. Outros caminhos exigem pedido de integração ao dono; não editar diretamente.

## Entregas

- [ ] Definir e implementar consumidor idempotente de eventos e registro persistente de tentativa, sucesso, falha e reenvio autorizado.
- [ ] Integrar confirmação, reagendamento, cancelamento, lembrete e pronto; evitar lembrete obsoleto após mudança e minimizar dados sensíveis.
- [ ] Criar adaptador de e-mail configurável e transporte local/teste; WhatsApp apenas contrato de provedor se não houver credenciais e configuração existentes.
- [ ] Usar contrato de outbox S03 e autenticação interna; não adicionar leitura direta ao banco do Booking nem confiar em headers forjáveis.
- [ ] Publicar Dockerfile, healthcheck e configuração de exemplo sem segredos para S07 integrar. Não enviar mensagens reais a pessoas.

## Dependências e início imediato

Implementar núcleo com eventos de teste agora; integração real depende contrato/outbox S03, identidade S02 e infraestrutura S07.

## Critérios de aceite

Evento repetido gera no máximo uma entrega lógica; falhas transitórias têm retentativa e visibilidade; cancelamento/reagendamento invalida lembrete anterior; entrega real externa não é alegada sem validação.

## Validação

Testes de duplicação, retry, autorização, eventos fora de ordem e invalidação de lembretes; teste com transporte local.

## Entrega obrigatória

contracts.md antes de integrar; integration.md para pedidos externos; status.md com evidências. Não alegar envio real, publicação, execução de teste ou conclusão integrada sem evidência. Qualquer frontend segue padrão visual, baixo acoplamento, atomização e galeria conforme README.
