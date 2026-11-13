# Achados da onda B

Revisão independente R01, 13/11/2026. Achados anteriores R01-001/002/003 e seu aceite estão preservados em [findings.md](findings.md). Estes dois achados surgiram na primeira execução nova, com 11/18 cenários aprovados; não indicam acesso indevido confirmado.

## R01-B01 — P2 — Booking classifica timeout de sessão como erro 500

- Dono: S03; reteste integrado S07.
- Reprodução: autenticar tutor fictício, pausar Auth na stack descartável e chamar diretamente `GET /api/v1/bookings/my-bookings` no Booking com o Bearer válido. A primeira rodada devolveu 500, esperado 503. Gateway e Pet já respondiam 503.
- Impacto: a operação permanece recusada, mas a indisponibilidade recuperável deixa de seguir o contrato de erro do consumidor.
- Evidência: `wave-b-identity.spec.ts`, resultado da primeira rodada em [wave-b/run1-result.json](wave-b/run1-result.json). A inspeção da S03 identificou cancelamento direto do future como caminho compatível com o sintoma.
- Correção: `RestTemplateConfig` converte `CancellationException` em timeout de I/O, aproveitando o tratamento de indisponibilidade do cliente/filtro. Preserva 401 para sessão rejeitada.
- Validação local: 44 testes Booking aprovados, incluindo Tomcat real com Auth sem headers, cancelamento forçado, rejeição e recuperação. R01 conferiu fonte e XML.
- Estado: corrigido e revalidado na segunda rodada S07: Auth pausado real retornou 503 no Gateway e serviços diretos. Mantido no aceite final 18/18 da quarta rodada, com snapshot estável, restauração dos seis bancos e limpeza aprovados.

## R01-B02 — P2 — carga inicial da escala sobrescreve edição após criação

- Dono: S04, com atribuição adicional explícita de `Frontend/src/pages/partner/ColaboradorPage.tsx`; reteste integrado S07.
- Reprodução: criar colaborador e abrir a aba de escala imediatamente após navegar do formulário novo para o detalhe. O componente reutilizava estado carregado e permitia clicar antes da leitura inicial; `setEscala` posterior restaurava o estado anterior. Na primeira rodada, o GET durou 116 ms e o switch clicado terminou em Folga.
- Impacto: uma alteração iniciada na interface pode se perder antes de salvar, prejudicando a configuração da agenda.
- Correção: editor separado por identidade de rota, formulário condicionado à carga completa e respostas de editor desmontado ignoradas. Erro de carga apresenta nova tentativa. R01 conferiu essas condições no código.
- Validação local: Chromium com resposta retida após criar colaborador; controles indisponíveis durante a carga, edição/salvamento depois da resposta e prova de ausência de reload. Build/lint do worker e typecheck independente R01 aprovados.
- Estado: corrigido e revalidado na segunda rodada S07: criação → edição sem reload intermediário passou no Chromium. Mantido no aceite final 18/18 da quarta rodada, com snapshot estável, restauração dos seis bancos e limpeza aprovados.

## Falhas de preparação do aceite

S07 corrigiu expectativas de status de criação de serviço (contrato existente 200) e expiração sintética no fuso da coluna do Auth. O trace da galeria confirmou 429 na consulta de sessão após três respostas 200; a rota de sessão recebeu a política geral do Gateway, mantendo o limite menor de login/recuperação. Essas alterações passaram no reteste completo. As fixtures repetem somente 429 com os mesmos dados e pela recuperação visível da interface; autorização, isolamento e idempotência conservaram as expectativas.
