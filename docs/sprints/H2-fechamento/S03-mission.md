# S03 — Atendimento e investigação H2

Leia `spec.md` da rodada. Ownership histórico Booking e UI de agenda/atendimento, com tipos auxiliares exclusivos do Booking quando necessário e registrados. S05 é dono do Payment; S06 dos consumidores de eventos.

Implemente interrupção após início com motivo, autor, histórico e transição explícita, preservando integridade de capacidade e invalidando avisos incompatíveis. Nunca concluir silenciosamente, cobrar ou estornar automaticamente. Usuário aprovou essa regra para testes internos.

Implemente proposta e autorização explícita de adicionais vinculadas à reserva, com snapshot de descrição/preço/valor, versão, tutor e estabelecimento; aceite digital por tutor proprietário ou registro presencial por operador autorizado com prova declarada, motivo/canal/autor/data. Parceiro não pode se passar pelo tutor. Tratar rejeição, conflitos de versão, repetição e concorrência. Publique cedo contrato interno autenticado para S05 validar e aplicar uma única vez no caixa; nunca aceitar apenas um booleano do frontend como prova.

Entregue projeção ADMIN paginada de reservas problemáticas e detalhe mínimo/histórico para investigação S01; não criar acesso transversal para parceiros/tutores. Publique `S03-agenda/h2-contracts.md`, eventos para S06 e integração necessária para S07. Testar transições, autorização, idempotência, capacidade e falhas. PostgreSQL/Compose aguardam S07; sem mocks travestidos de aceite. Atualize h2-status/h2-integration.
