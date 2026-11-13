# Onda B — Revisão em andamento

Autorização e atribuições: [wave-b-dispatch.md](wave-b-dispatch.md). Critérios: [wave-b-acceptance.md](wave-b-acceptance.md). **Novo aceite integrado ainda pendente.** O aceite R01 anterior está preservado em [review.md](review.md).

## Entregas locais observadas

- S01: concluída; rotas, menus e guards com sessão real como contrato, tratamento de 401/403/503; typecheck/build/lint e Chrome com APIs simuladas aprovados.
- S02: concluída; 11 testes com PostgreSQL 15 descartável e SMTP real em loopback, Partner simulado. Sessão, destinatário e elegibilidade interna, equipe, seleção/vínculo de escala e contexto frontend.
- S05: concluída; 13 testes com PostgreSQL, Tomcat real e doubles HTTP. Permissões CASH_RECEIVE/CASH_CLOSE, autoria individual e retomada com mesma chave após reload, navegador com APIs simuladas.
- S06: concluída; 24 testes H2/doubles, recuperação SENDING para UNKNOWN e reenvio persistente na UI. PostgreSQL, SMTP da stack e reinício real ainda com S07.
- S03: entrega e correção R01-B01 concluídas localmente, 44 testes (18 PostgreSQL) e navegador simulado aprovados. Timeout/cancelamento pelo filtro Tomcat real retorna 503; reteste integrado pendente.
- S04: 45 testes locais (28 Partner e 17 Pet), migrations PostgreSQL e jornada completa de balcão com APIs simuladas aprovados; fontes declaradas estáveis.
- S07: três testes locais do Gateway aprovados; primeira rodada integrada com build completo executada: 11/18 cenários aprovados, sete falhas. Novo aceite ainda pendente.

[Observações dos chats](wave-b-worker-observations.json) guardam estados, cursores e mensagens finais. Os relatórios de cada responsável distinguem histórico da rodada atual.

## Pontos conferidos e devolvidos durante a implementação

1. Clientes de sessão devem exigir exatamente 200/corpo válido e recusar redirect e outros 2xx. S05 implementou o gate e cobriu 202/204/302/403/503 com HTTP real. S03/S04 ajustaram o gate; conferência dos relatórios finais ainda pendente.
2. Atribuição profissional deve persistir teamAccessId além de userId, sem ressuscitar após reconvite. S02 publicou e S04 implementou persistência/comparação e teste reportado.
3. Agenda/atendimento da equipe precisavam de identificação mínima de pet, pois as rotas de prontuário recusavam o novo perfil. S04 publicou projeção interna autenticada, S03 autoriza a reserva/atribuição antes de consultar e removeu spinner e controles de prontuário sem permissão. Ainda precisa de aceite com os serviços reais.
4. Gestão administrativa de contas: S04 entregou confirmação/ativação/desativação; S01 validou a integração frontend com APIs simuladas.
5. Ingresso/configuração: S07 recebeu as novas dependências de listagem de atribuições e segredos internos de elegibilidade/projeção de pet; conferir no snapshot final.
6. S07 deve incluir as jornadas pela interface e os testes de Notification em SENDING/UNKNOWN e pronto para retirada; testes isolados não substituem esses gates.

R01 lê e revisa; não altera produto nem inicia Compose. Os estados acima são parciais e não autorizam marcar todos os cards como concluídos. Publicação, piloto com pessoas e pagamentos online continuam fora da rodada.

## Primeira execução integrada da onda B

Projeto descartável `easypet-e2e-309716e13e`, log local `C:/Users/randy/AppData/Local/Temp/easypet-wave-b-run1.log`: build dos serviços e frontend aprovado, Playwright com **11 aprovados e sete reprovados em 2,6 minutos**. Recuperação representativa não aprovada nesta tentativa.

- Defeito confirmado R01-B01: Booking direto devolve 500 com Auth pausado, em vez do 503 recuperável contratado. Correção enviada à S03, preservando a expectativa da S07. É falha de classificação de indisponibilidade; a chamada permaneceu recusada.
- Três jornadas pararam na fixture que esperava 201 na criação de serviço, cujo contrato existente retorna 200. A S07 corrige a fixture sem alterar o contrato de produto.
- Recuperação parou na fixture de expiração (fuso do campo local). R01 confirmou no trace da galeria três sessões 200 seguidas por 429; S07 mantém o limitador e valida a recuperação da tela. Retestes pendentes.
- Defeito R01-B02: ao criar colaborador e navegar ao detalhe, ColaboradorPage reutiliza estado com loading=false; a leitura inicial da escala pode sobrescrever a edição já iniciada. Trace mostra leitura de 116 ms e switch clicado terminando em Folga. Encaminhado à S04, com ownership adicional explícito desse arquivo. Reload antes de editar mascararia a corrida; o aceite deve manter navegação direta criação → escala.
- Três arquivos Partner mudaram depois do snapshot inicial. Diferenças em [wave-b/run1-source-differences.json](wave-b/run1-source-differences.json). O próximo aceite exige novo build e hashes estáveis, além da suíte e restauração completas.

R01 conferiu separadamente 138 testes Java sem falhas em 22 relatórios e typecheck sem diagnósticos: [manifesto dos testes](wave-b/test-report-summary.json) e [typecheck](wave-b/typecheck.json). Esses testes locais não substituem os sete cenários reprovados na stack.

## Preparação da segunda execução

S03 corrigiu o cancelamento de transporte que escapava como erro não tratado; teste pelo filtro Tomcat real comprova 503, rejeição 401 e recuperação 200. S04 separou o editor por identidade da rota, impede edição antes da leitura inicial e ignora respostas de editores desmontados. Regressão Chromium local reteve a resposta e salvou a escala sem reload. Ambas as fontes foram conferidas por R01.

Snapshot S07 `wave-b-run2-before.json`, capturado às 18:20:50 UTC, inclui essas correções e os ajustes finais do Partner. Segunda rodada em execução. Novo manifesto local: **140 testes em 22 relatórios, sem falhas/erros/skips**; [typecheck após R01-B02](wave-b/typecheck-after-b02.json) sem diagnósticos. O manifesto de testes acima foi atualizado; 138 era a contagem anterior à regressão adicional S03.

### Resultado da segunda execução

Projeto `easypet-e2e-3d02748b29`: **16/18 aprovados em 4,2 minutos**. Passaram R01-B01 (Auth realmente pausado), R01-B02 (escala sem reload), todas as regressões anteriores, reserva com perda de resposta/reload, inativação transversal e Notification com SMTP/reinícios/ACK/UNKNOWN. R01 conferiu o log e as fontes dos cenários.

As duas falhas restantes são de preparação da suíte: seletor exato do campo obrigatório Nova senha e 429 no aceite do primeiro convite, confirmado por R01 no trace de rede. S07 recebeu ajustes para preservar a UI, observar o status e repetir somente após 429, mantendo as demais expectativas. Caixa, reivindicação e etapas posteriores do cenário de equipe ainda não foram alcançados. O ensaio de recuperação não prosseguiu, pois faltava a cobrança representativa dessa jornada. Novo aceite completo continua necessário.

### Terceira execução e preparo da quarta

Projeto `easypet-e2e-a3fcc375b8`: **16/18 aprovados em 5,7 minutos**, mesmo resultado global. Troca de senha e aceite da recepção chegaram a 200; replay do token de reset e leitura seguinte da equipe receberam 429. A tela de equipe ofereceu Tentar novamente, mas a fixture procurava diretamente o formulário. R01 conferiu o trace e solicitou tratamento consistente das chamadas Auth explícitas e das leituras durante navegação, sem mudar os códigos de token usado ou revogação. [Resultado e integridade](wave-b/run3-result.json).

Quarta rodada iniciada com helpers de espera limitada somente para 429, mantendo o limitador, os mesmos dados e as ações da interface. Recuperação representativa condicionada à aprovação da suíte completa.
