# S02 — Auditoria de identidade H2

Leia `spec.md` desta rodada. Ownership histórico Auth/identidade, sem escrever páginas de clientes de S04 nem componentes S01.

Implemente auditoria persistente para ativação/desativação CUSTOMER e alterações de acesso/permissões da equipe: ator autenticado, alvo/estabelecimento, ação, valores mínimos anteriores/posteriores, motivo e data. Não registrar senhas/tokens. Transação deve manter alteração e auditoria consistentes; ações idempotentes/no-op não fabricam mudanças. Consulta restrita a ADMIN, paginada, filtros limitados; preservar revogação e novo login após reativação.

Publique `S02-identidade/h2-contracts.md` cedo para UI S04/S01. Alteração de motivo deve preservar compatibilidade dos clientes existentes com comportamento documentado, sem inventar autor legado. Integre somente necessidades Auth comprovadas pelos contratos de preferências/destinatário S06/S04.

Testar autoria não forjável, acesso anônimo/tenant/papel, consulta, transação e revogação. Testes Docker aguardam S07. Atualize h2-status/h2-integration na sua pasta. Não modificar credenciais Google/contas reais, gerar política legal ou ativar e-mail externo.
