# S07 — Infraestrutura, integração e aceite H2

Leia `spec.md`. Ownership histórico de infraestrutura, Gateway, Compose, scripts, E2E e docs operacionais. R01 mantém roadmap e docs/H2. Não alterar domínios de outros donos.

Primeiro publique `S07-infra-integracao/h2-resource-gate.md`: Docker local não respondeu à versão e ao build na última rodada; navegador também expirou. Faça diagnóstico limitado e somente de leitura de recursos, processos e projetos existentes. Não reiniciar Docker/WSL, executar prune/reset, parar containers existentes ou limpar recursos antigos sem comprovação/escopo. Não usar a VPS compartilhada como fallback automático. Libere explicitamente os testes dependentes de Docker somente se o ambiente estiver utilizável e isolável; agende execuções para evitar concorrência pesada. Caso contrário, registre bloqueio e avance nos scripts/testes independentes.

Integre contratos H2 no Gateway/ingresso preservando fronteiras e rotas internas bloqueadas. Conecte o coletor/diagnóstico à central ADMIN S06 por ingresso interno autenticado e idempotente, com estado vencido/recuperação e dados mínimos. Falha de ingestão não derruba coleta nem serviços. Não colocar socket Docker no app.

Prepare backup agendável e retenção configurável com trava, manifesto, verificações, falha/recuperação e alerta local; exemplos systemd desativados. Não escolher RPO/RTO ou excluir backups existentes por suposição. Inventarie anexos/armazenamento e registre dependências reais; não afirmar recuperação completa se faltarem arquivos externos. Nenhuma instalação/agendamento na VPS nesta rodada.

Prepare e, quando todos os donos estiverem prontos e recursos liberados, execute novo aceite integrado H2 com regressões H1/OAuth/master/menu, auditoria, busca combinada, interrupção/adicionais, caixa, preferências/consentimento, central ADMIN e suporte. Usar dados/portas/volumes exclusivos, congelar snapshot de fontes antes/depois e provar restore/limpeza. Distinguir mocks, serviços reais e publicação. Complementação visual/ADMIN publicado é gate separado; não desativar convidados reais nem testar escrita na VPS sem coordenação.

Registre h2-status, h2-integration, evidências e bloqueios. Ao concluir infraestrutura independente, sinalize pronto para integração; não iniciar suíte contra contratos ainda incompletos nem chamar ausência de Docker de aprovação.
