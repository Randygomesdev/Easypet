# Reativação Google — despacho e acompanhamento

Autorizado pelo usuário em 13/11/2026: reativar Google para `easypet.innker.com.br`, ajustar configurações, realizar novo aceite integrado S07, atualizar roadmap e enviar commits ao remoto. Base: `67d8db9`, branch `codex/unificar-develop`.

## Distribuição enviada aos chats existentes

| Responsável | Entrega |
| --- | --- |
| S02 — Identidade | Auth e páginas de autenticação; flag explícita, estado OAuth e troca vinculada ao navegador, sessão/permissões, erros e testes locais. Publicar contrato cedo. |
| S01 — Frontend compartilhado | `env.ts`, rota `/login-success` e integração da flag Google sem desligar `internalPilot`; typecheck/build e roteamento. |
| S07 — Infra/aceite | Compose, Dockerfile, exemplos de ambiente, Gateway/Nginx, ingresso HTTPS e suíte integrada com provedor local controlado; distinguir login real Google e smoke publicado. |
| R01 — Coordenação/revisão | Console Google, revisão independente, roadmap e commits/push serializados após validação. |

A autoria adicional de `Frontend/src/config/env.ts` foi atribuída a S01; `Frontend/Dockerfile` e `.env.homolog.example`, a S07. Nenhum worker deve disputar o índice Git, modificar o escopo de outro ou expor segredos. Não haverá deploy VPS nesta rodada sem o preflight e os demais requisitos de publicação.

## Contrato inicial para convergência

- Backend `app.google-auth.enabled` / `GOOGLE_AUTH_ENABLED`, false por padrão; frontend `VITE_GOOGLE_AUTH_ENABLED`, independente do piloto.
- Autorização `GET /api/v1/oauth2/authorization/google`; callback `GET /api/v1/login/oauth2/code/google`; troca `POST /api/v1/auth/oauth2/exchange`.
- Callback HTTPS alvo: `https://easypet.innker.com.br/api/v1/login/oauth2/code/google`, configurável por ambiente; retorno interno `/login-success`.
- Preservar bloqueio de equipe/inatividade, papéis, versão da sessão e restrições do piloto. Não abrir cadastro/social público acidentalmente.
- Aceite: flag desligada/ligada, sucesso, cancelamento, estado inválido, código expirado/reutilizado, troca por navegador alheio, inatividade/equipe e regressões H1. Provedor simulado não equivale a Google real.

## Dependências externas consultadas

- O usuário informou cinco contas convidadas. A lista foi preparada em `.env.google.local`, ignorado pelo Git, sem reproduzir endereços pessoais neste relatório. Contas devem existir no Auth com papel correto; endereço corporativo requer identidade Google Workspace para o contrato atual.
- A inspeção de presença não encontrou `GOOGLE_CLIENT_SECRET` nos arquivos de ambiente usuais (`.env`, `.env.homolog`, Auth/Infra `.env`, Frontend `.env`/`.env.local`) nem nas variáveis Process/User/Machine do Windows. Nenhum valor secreto foi impresso.
- O diagnóstico prévio, somente de leitura, está em [google-oauth-preflight.md](google-oauth-preflight.md). As alterações posteriores autorizadas estão registradas abaixo.
- Atualização após autorização do usuário: callback `https://easypet.innker.com.br/api/v1/login/oauth2/code/google` salvo no cliente existente e conferido após reabrir a página. URLs locais preservadas; não são necessárias ao deploy, somente a eventual desenvolvimento com Google real.
- Usuário informou perda do segredo antigo e concluiu a criação de uma nova chave no console. R01 conferiu status ativo da nova chave e presença/formato esperado em `.env.google.local`, sem imprimir seu valor. A chave antiga permanece ativa até validar o uso efetivo da nova no aplicativo. Não houve envio de segredo ao chat/Git nem login Google real.
- Consulta DNS A de `easypet.innker.com.br` retornou nome inexistente (NXDOMAIN). Smoke HTTPS publicado depende de DNS/TLS e deploy.
- A [política oficial de público Google](https://support.google.com/cloud/answer/15549945?hl=en) excepciona solicitações somente de nome/e-mail/perfil/openid da restrição a usuários de teste. Logo, modo Testing não é controle de acesso suficiente para o piloto. S02 foi orientada a exigir allowlist explícita no Auth em homologação, com lista vazia recusando acesso, inclusive para contas existentes.

Resultado: S01/S02 concluíram a implementação e as validações locais. A rodada final S07 aprovou 28 cenários com Google ligado, um cenário separado com a flag desligada e restauração dos seis bancos com 14 consultas de referência. R01 conferiu os snapshots e a limpeza dos projetos Docker. [Revisão final](google-oauth-review.md). Publicação na VPS e smoke Google real permanecem pendentes; commits e push são coordenados por R01 após a auditoria de conteúdo.
