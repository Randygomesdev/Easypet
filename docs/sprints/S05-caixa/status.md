# Status S05

H1-06 em 13/11/2026: implementação pronta e validada localmente. Aceite do artefato publicável pela S07 pendente. O aceite integrado da onda B permanece histórico.

## H1-06

- `CashierController.java`, `CashierModels.java` e `CashierService.java` acrescentam `closingId` ao extrato e `CASHIER_DAY_CLOSED` à recusa já existente. A trilha e o replay após fechamento usam o ledger V4. Contrato aditivo, sem migration.
- `CashierRequestLogFilter.java` registra operações e falhas sanitizadas com ID de requisição, operação, status e duração. O operador pode cruzar a referência do erro com o log local e consultar os dados do movimento e do fechamento na API autorizada. Nenhum endpoint de suporte ou permissão financeira nova.
- `CaixaPage.tsx` e `features/cashier/` mostram saldos, motivo, autor e referências da reversão em listas móveis. O detalhe da cobrança mostra as referências de cobrança/reserva e autoria. Se outra sessão fecha o dia antes de uma baixa, a recusa atualiza o painel e mantém o histórico. A perda de resposta conserva a intenção e a mesma chave no reload. O campo de adicionais explicita que é lançamento manual sem registro de autorização do tutor.
- O Payment continua conferindo atividade pelo catálogo do Partner, com o escopo do titular ou equipe e o Bearer original. A fixture do roteiro usa a operação administrativa auditada de S04 para testar inativação e reativação.

| Verificação H1 | Resultado local |
| --- | --- |
| `gradlew --offline --no-daemon test` no Payment, Tomcat real e PostgreSQL 15 descartável | 13 passaram. Os testes existentes agora verificam reversão por gestor, recusas de recepção/profissional/outro estabelecimento, autor e recebimento original, referência do fechamento concorrente, recusa de baixa tardia, inativo e log sanitizado. Auth, Booking e Partner usam doubles HTTP. |
| TypeScript e ESLint da S05 | Passaram. |
| Chromium a 390 px, APIs simuladas | Perda de resposta após gravação simulada, reload/replay, reversão com motivo e autor, referências, recusa após fechamento em outra sessão e leitura do dia fechado. |

[Contrato H1](contracts.md#h1-06--preparação-para-homologação-interna-13112026) e [roteiro com fixture e diagnóstico](h1-acceptance.md). A publicação, o release versionado e a validação no endereço de homologação continuam como etapas distintas. Checkout, créditos e pacotes seguem bloqueados no perfil de homologação.

Onda B em 13/11/2026: implementação S05 pronta e validada localmente. Aceite da stack sob responsabilidade da S07.

## Onda B

- `security/{AuthSessionClient,SessionAuthenticationFilter,VerifiedSession}.java`, `config/SecurityConfig.java` e `application.yaml` do Payment consultam o Auth com Bearer original a cada operação protegida, inclusive direto no serviço. Só `200` com sessão válida autentica. `401` do Auth invalida, e respostas inesperadas, redirect, corpo inválido ou falha de rede resultam em `503`. `403` é escrito diretamente e preserva R01-003. A configuração usa `AUTH_SERVICE_URL` e dispensa segredo JWT no Payment.
- `cashier/` aplica `CASH_RECEIVE` e `CASH_CLOSE`, com confirmação do vínculo e do estabelecimento ativo. O contexto `GET /payments/cashier/context` traz data corrente, estado do dia e capacidades. O autor individual vem da sessão. A checagem de reserva continua com o JWT original em Booking. A estrutura do ledger e a migration V4 são as da primeira entrega.
- `CaixaPage.tsx`, `features/cashier/` e `cashier.service.ts` usam contexto para o seletor de reservas, a projeção de pet do Booking para tutor e balcão e o estado de fechamento. O painel esconde extrato diário e ações de reversão/fechamento da recepção, que pode consultar os movimentos de uma cobrança. O aviso de intenção pendente permite retomar com o mesmo corpo e chave. A intenção fica no `sessionStorage` da aba, isolada por autor e estabelecimento, sobrevive a reload e é reenviada só por ação explícita.
- S01 conectou o guard e o menu em `/partner/caixa`. S07 incluiu o contexto do caixa no Nginx e a URL Auth no Payment. O aceite real de autorização, reserva de balcão, baixa após reload e fechamento fica com S07. O seletor mostra a referência abreviada se a projeção de pet estiver indisponível. A configuração de `BOOKING_PET_SUMMARY_TOKEN` no Booking e no Pet está registrada em [integração](integration.md#onda-b--aceite-integrado).

| Verificação da onda B | Resultado |
| --- | --- |
| Payment `gradlew --offline --no-daemon test`, PostgreSQL 15 descartável | 13 testes passaram, sem falhas nem skips. Sete são de caixa, com Tomcat embarcado e doubles HTTP de Auth, Booking e Partner. Preservados centavos, ledger, isolamento, replay, ajuste e concorrência no fechamento. |
| Auth no Payment via HTTP direto | `202` com sessão válida, `204`, redirect `302`, `403`, `503` e corpo incompleto resultaram em `503`. Uma sessão já usada e depois recusada pelo Auth resultou em `401` na próxima operação. O teste cobre o comportamento do consumidor, enquanto reset, inativação e revogação reais são exercitados no aceite S07. |
| Equipe no caixa | Recepção criou cobrança e registrou baixa com autor individual, e recebeu `403` em extrato, ajuste e fechamento. Gestor reverteu e fechou com seu ID. Profissional e headers forjados não deram acesso. Outro estabelecimento recebeu `404`. A revogação impediu até replay de comando válido. |
| Chromium local a 390 px, com respostas de API simuladas | Reserva de balcão, criação, baixa de R$ 40,00 com resposta perdida após registro, reload e reenvio com mesma chave. Um único movimento, saldo de R$ 60,00, intenção invisível para outro operador, controles de recepção e gestor, reversão e fechamento. |
| TypeScript/ESLint do caixa e `npm run build` compartilhado | Passaram. Vite emitiu aviso de tamanho do chunk principal. |

## Primeira entrega — histórico

Estado da primeira entrega em 13/11/2026: implementação pronta e validada localmente, com integração pendente na época.

## Entregas

- `Backend/Payment-Service/src/main/java/br/com/easypet/payment/cashier/`: API de cobranças vinculadas a reservas, recebimentos parciais, saldos, reversões com motivo e autor, extrato e fechamento diário com totais por forma. Valores em centavos inteiros. A transação de cada escrita serializa o acesso por estabelecimento e grava o resultado idempotente junto do movimento.
- `Backend/Payment-Service/src/main/resources/db/migration/V4__create_cashier_ledger.sql`: migration aditiva com unicidade por reserva, por reversão e por fechamento, além de FKs compostas por estabelecimento.
- `SecurityConfig.java` e `application.yaml` do Payment: acesso exclusivo do papel `PARTNER` e configuração do cliente Booking. O Payment encaminha o JWT ao Partner e ao Booking e confirma o vínculo ativo antes de autorizar acesso.
- `Frontend/src/pages/partner/CaixaPage.tsx`, `Frontend/src/features/cashier/` e `Frontend/src/services/cashier.service.ts`: seleção de reserva, criação de cobrança, lista e detalhe de saldos, lançamento, reversão e fechamento, com componentes da S01. O reenvio da mesma operação usa a mesma chave enquanto o formulário está aberto.
- [Contrato da API](contracts.md) e [pedidos de integração e exemplos para a galeria](integration.md).

## Validação local

| Verificação | Resultado |
| --- | --- |
| Payment `compileJava` e Gradle `--offline --no-daemon test` com Java 21 | Passaram. 9 testes, 4 de caixa e 5 de pacotes, sem falhas ou skips. |
| `CashierLedgerPostgresTest` com PostgreSQL 15 descartável, Spring MVC, JWT de teste e serviços externos simulados por HTTP | Flyway aplicou V1 a V4. Cobriu papéis e estabelecimento inativo, reserva inelegível ou indisponível, valores sem arredondamento, adicional/desconto, baixa parcial, replay simultâneo, isolamento, reversão auditada entre dias, corrida entre baixa e fechamento e dois fechamentos simultâneos. |
| TypeScript da página e importações com `tsc --ignoreConfig --noEmit`, usando as opções do frontend | Passou. |
| ESLint de `src/features/cashier`, `src/pages/partner/CaixaPage.tsx` e `src/services/cashier.service.ts` | Passou. |
| Chromium com Vite local, largura de 390 px e respostas fictícias de API | Passou. Cobriu carregamento, vazio, erro e nova tentativa, criação, baixa parcial em PIX, reaproveitamento da chave após falha, motivo de reversão e fechamento. Sem erro de JavaScript ou overflow horizontal da página. |
| `vite build` do checkout compartilhado para diretório temporário | Bundling passou com aviso de tamanho de chunk. A rota do caixa ainda não estava conectada nesse build. |
| `npm run build` | Falhou no TypeScript global. Há três mapas tipados sem `NO_SHOW` em `AgendamentosTab.tsx` e `DashboardPage.tsx`, fora da S05. |

O teste de caixa é opt-in. Para repetir, usar um PostgreSQL descartável vazio e definir `S05_TEST_DB_URL` (JDBC), `S05_TEST_DB_USER` e `S05_TEST_DB_PASSWORD` ao executar `gradlew test` no Payment Service.

## Pendências

- S01 conecta `/partner/caixa`, menu e exemplos da galeria. S07 já adicionou a regra de proxy e o endereço interno do Booking ao Compose. O aceite com os serviços reais e o teste da jornada a partir do painel ficam na integração.
- A primeira fatia autoriza o titular do estabelecimento ativo. Acesso de equipe depende da verificação de sessão e permissão da S02 e de autorização correspondente na consulta de reservas do Booking. A revogação imediata de um JWT válido do titular pelo Auth também depende dessa verificação de sessão.
- Checkout, compra/uso de créditos e estornos online seguem bloqueados para o piloto. Mercado Pago segue para a etapa financeira do roadmap.

## Correções R01 em 13/11/2026

- **R01-003 corrigido e reproduzido em Tomcat embarcado.** O handler padrão do Spring Security chama `sendError(403)`, que inicia despacho `ERROR` no servlet. Nesse despacho o filtro JWT não roda, e o entrypoint reclassificava a resposta para `401`. A regressão HTTP falhou antes da correção com “expected: 403 but was: 401”. `SecurityConfig` agora escreve status e corpo JSON diretamente na resposta de acesso negado. O matcher do caixa continua exigindo `PARTNER`.
- **R01-001, consumidor Payment migrado.** Criação e alteração de vínculo de templates em `PackageService` usam `PartnerServiceClient.getOperations` e leem só os IDs da projeção de S04. `PartnerServiceClientTest` conferiu caminho, método, encaminhamento do JWT original e desserialização. O caixa já consulta o perfil do titular e o catálogo ativo.
- **Validação da revisão.** `gradlew --offline --no-daemon test` passou com 11 testes, sem falhas nem skips. São cinco de caixa com PostgreSQL 15 descartável, um de contrato HTTP do cliente Partner e cinco de pacotes. O novo teste do caixa usa uma cobrança persistida e servidor real em loopback com porta alocada automaticamente. Confere `403` JSON para tutor, `401` para JWT ausente/inválido, `404` para outro estabelecimento e `200` para o titular. As regressões de ledger, idempotência e fechamento também passaram.
- **Integração pendente.** S07 repete a expectativa `403` pelo Gateway e valida o consumo da nova projeção com o Partner real. Os testes da S05 usam respostas simuladas de Partner e Booking.
