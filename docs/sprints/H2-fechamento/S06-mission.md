# S06 — Central ADMIN, preferências e comunicação H2

Leia `spec.md`. Ownership histórico Notification e features/services de notificações. Não editar páginas/rotas/sino compartilhados S01.

Implemente central persistente de alertas/chamados do ADMIN, deduplicação/correlação, severidade, leitura/reconhecimento/resolução com autoria. Solicitantes acessam apenas seus próprios chamados e só referenciam reservas autorizadas. Integre projeção mínima de tentativas por reserva para investigação S01. Publique cedo contrato para S01 e ingresso operacional interno autenticado para S07; não adicionar containers, expor rota interna no ingresso público ou receber identidade ADMIN de header forjável.

Implemente preferências de comunicação do tutor, preservando mensagens obrigatórias de segurança como recuperação de senha. Resolver contato autorizado de balcão pelo contrato S04, sem aceitar destinatário arbitrário do evento. Revalidar obsolescência de lembretes após interrupção S03, consentimento/preferência, retry/UNKNOWN/replay. Transporte local deve provar entrega e ausência de envio indevido.

Preparar adaptador/configuração SMTP compatível com Zoho e documentação de requisitos, mantendo envio externo desligado. O usuário ainda não tem provedor/remetente definido. R01 avalia a referência Setoriza; não acessar/copiar suas credenciais. Zoho oferece serviço transacional CPaaS (antigo ZeptoMail); verificar documentação oficial antes de recomendar a ativação. Sem envio real ou contratação.

Relatórios em `S06-notificacoes/h2-contracts.md`, h2-status/h2-integration; testes Docker aguardam S07. Alertas no ADMIN não substituem canal independente em indisponibilidade total.
