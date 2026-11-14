# Revisão R01 — reativação Google

Data: 13/11/2026. Base anterior à entrega: `67d8db9`. Revisão independente do checkout compartilhado, conferida contra o snapshot final S07.

## Implementação conferida

- Flag própria, desligada por padrão, atravessa Auth, frontend, Gateway e ingresso. Não desliga `internalPilot`, não libera cadastro público, checkout ou créditos.
- OIDC usa o cliente Spring com assinatura, emissor, audiência, nonce e PKCE. Callback e origem são explícitos; cabeçalhos externos não escolhem o endereço de retorno.
- Auth exige conta prévia ativa, papel elegível e allowlist. A migration V5 acrescenta vínculo por identificador estável Google, com unicidade; não altera migrations históricas. Primeiro vínculo usa e-mail confirmado por Google como Gmail/Workspace. Sub divergente, duplicidade por capitalização e equipe são recusados.
- Sessão transitória guarda estado e digest do código; identificador muda após o callback. Código de troca vence em dois minutos e exige o mesmo navegador, corpo JSON e origem exata. Consumo invalida a sessão e revalida estado, papel e versão da conta antes de gerar JWT. Tokens Google não são persistidos pela aplicação.
- Frontend remove o fragmento antes da troca, não recebe JWT por URL e apresenta cancelamento/erro recuperáveis. Rotas e métodos no ingresso são explícitos; callback e retorno usam `no-store`/`no-referrer`.
- Configuração e sessão OAuth são locais a uma instância Auth. Reinício interrompe a tentativa; múltiplas réplicas exigem afinidade ou armazenamento de sessão compartilhado antes de escalar.

## Evidência local conferida

R01 leu os sete relatórios XML Surefire de Auth/Gateway: **26 testes Auth e seis Gateway**, zero falhas, erros ou skips. Os seis testes OAuth do Auth usam PostgreSQL e provedor OIDC local com assinatura RSA; cobrem emissor/audiência/nonce/assinatura inválidos, estado, cancelamento, vínculo de identidade, elegibilidade, expiração, origem, navegador, replay e revogação entre callback e troca. As 20 regressões Auth passaram na mesma rodada.

S01/S02 registraram typecheck, lint e teste Chrome de dois builds de produção, com flag ligada/desligada e APIs simuladas. R01 conferiu o código desse ensaio, inclusive troca JSON sem query, limpeza do fragmento, sucesso/erro e bloqueios do piloto. Essa evidência não substitui serviços reais ou Google real.

O cenário com Google desligado passou na imagem real: botão ausente, três rotas OAuth fechadas e retorno à tela de login. Na primeira tentativa completa, o banco Payment não ficou saudável; a causa operacional não foi determinada e não houve aceite. Na segunda, passaram 24 cenários e quatro pararam na mesma asserção: Auth e Nginx enviavam `Referrer-Policy: no-referrer` em duplicidade. Login e cancelamento na interface passaram nessa rodada. S07 corrigiu o ingresso com `proxy_hide_header Referrer-Policy`, preservando a verificação estrita, e iniciou uma nova execução completa.

### Aceite integrado final

A terceira rodada (`easypet-e2e-69c2502629`) aprovou **28 cenários em 4,8 minutos**, sem falhas. O único skip corresponde à flag desligada, aprovada separadamente. O ensaio usa serviços reais, Chromium, SMTP local e provedor OIDC descartável; preserva as 22 regressões H1 e acrescenta seis cenários OAuth. Passaram login, cancelamento, origem, navegador, uso único, expiração real, estado adulterado, revogação após callback e contas inelegíveis. O diagnóstico da stack também passou.

Após simular schema incompatível na origem descartável, a restauração no projeto `easypet-restore-9e2af5097c12be27` conferiu seis bancos, 55 tabelas e 14 consultas de referência, incluindo os vínculos Google de duas contas fictícias. R01 conferiu no log as aprovações e comparou os [snapshots inicial](../S07-infra-integracao/google-oauth-run3-before.json) e [final](../S07-infra-integracao/google-oauth-run3-after.json): 641 entradas, sendo 638 arquivos e três exclusões, sem alteração durante o aceite nem divergência com o checkout revisado.

R01 consultou o Docker após a limpeza: zero containers, volumes e redes nos projetos das três rodadas, do ensaio de flag desligada e da restauração final. A liberação é para esta integração local; publicação e Google real continuam pendentes. Commits e envio remoto são executados por R01 após a auditoria final de conteúdo.

### Versionamento e auditoria

A implementação foi organizada em `d71b419` (Auth/interface) e `5c8dfef` (ingresso, configuração e aceite), acompanhados por um commit documental com roadmap e evidências. Os snapshots preservam o HEAD anterior e os hashes dos arquivos efetivamente testados; o versionamento não altera esse registro histórico.

A auditoria dos 64 arquivos candidatos presentes encontrou 386 alertas Gitleaks, todos valores SHA-256 nos snapshots e na evidência estruturada. Os hashes dos dois logs também foram conferidos contra os arquivos locais. Nenhum outro achado foi encontrado. A comparação privada com a chave nova e os cinco endereços convidados não encontrou esses valores nos candidatos. O arquivo local de credenciais permanece ignorado pelo Git.

## Configuração externa e limites

**Atualização posterior — publicação de 13/11/2026:** DNS/TLS, configuração protegida e contas instalados na VPS. Google habilitado para quatro contas Gmail convidadas, com login real aprovado para parceiro e tutor, cancelamento recuperável e papéis corretos. ADMIN corporativo usa senha por decisão explícita do usuário e não integra a allowlist OAuth publicada. Nova chave comprovada; desativação da antiga segue separada. [Aceite da publicação](../../production/publicacao-homolog-2026-11-13.md). As observações abaixo descrevem a inspeção anterior ao deploy.

O callback `https://easypet.innker.com.br/api/v1/login/oauth2/code/google` foi salvo no cliente existente após autorização humana e conferido por reabertura da página. URLs locais foram preservadas; não são necessárias ao deploy. A lista de cinco contas recebida foi guardada somente em arquivo local ignorado, sem endereços pessoais nestas evidências.

O usuário informou perda do segredo e gerou uma nova chave. R01 conferiu chave nova ativa no console e presença/formato esperado no arquivo local ignorado, sem revelar o valor. A chave antiga permanece ativa até validar a nova no aplicativo. DNS A do domínio retornou NXDOMAIN na consulta desta rodada. Provisionamento das contas, instalação da configuração no ambiente, DNS/TLS, deploy e smoke Google real permanecem requisitos separados. Não houve login Google real nem publicação na VPS nesta revisão.

O modo Testing do Google não restringe por si só os escopos básicos de login, conforme [política oficial](https://support.google.com/cloud/answer/15549945?hl=en); a restrição do piloto é aplicada também pelo Auth.
