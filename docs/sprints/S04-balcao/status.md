# Status S04

## H1 — 13/11/2026

Implementação H1-04 validada localmente. O aceite do artefato integrado segue com S07. O [contrato de configuração](contracts.md#dados-de-configuração-para-o-checklist-s01) da S01 usa cadastro, serviços, vínculos e escalas persistidos. O [roteiro H1](integration.md#roteiro-h1-para-s07) inclui as etapas pelos controles da UI.

- As telas de cadastro, serviços e equipe exibem erro de leitura com tentativa de recuperação e impedem escrita sob contexto administrativo divergente. O bloqueio `404` de staff é aplicado na API quando o `partnerId` diverge. A edição individual de serviço preserva ID e vínculos omitidos. Remoção de serviço permanece indisponível.
- A situação do estabelecimento pode ser desativada e reativada sob ADMIN, com histórico de ator, motivo, horário e situações anterior/nova. O menu administrativo tem consulta dos inativos. O Auth continua autenticando o titular. A S03 usa o estado da projeção operacional para novas alocações e preserva o histórico.
- O [inventário de fotos e anexos](contracts.md#cobertura-de-arquivos) identifica URLs nos bancos e cobertura dos dumps. O upload de foto da configuração fica explicitamente indisponível.

| Verificação | Resultado |
| --- | --- |
| Partner `gradlew.bat test --offline --no-daemon`, Tomcat e H2 | 31 testes, incluindo cadastro por titular, duplicidade, preservação da escala ao atualizar perfil, associações cruzadas de serviços/staff, substituições inválidas de escala, suspensão/reativação e auditoria, além dos cenários de reivindicação. |
| Pet `gradlew.bat test --offline --no-daemon --rerun --tests '*ControllerTest' --tests '*PetAccessServiceTest' --tests '*AuthSessionClientTest'` | 17 testes de sessão, acesso, cadastro de balcão e projeção de agenda. O teste de contexto da aplicação permanece no aceite da stack. |
| PostgreSQL 15 descartável | Cadeia Partner V1–V20 aplicada com `ON_ERROR_STOP`. Conferidos índice único de `user_id`, tabela e índice de histórico. |
| Frontend `npm run build` e ESLint nos arquivos alterados | Build, typecheck e lint aprovados. Chromium local com API simulada cobriu recuperação de leitura, cadastro ausente, bloqueio administrativo cruzado, filtro de inativos, auditoria, desativação/reativação de estabelecimento e conta, emissão e resgate presencial da prova. |

## Onda B — 13/11/2026

Estado: implementação validada localmente e no aceite integrado de jornadas da S07 (18/18). A restauração representativa dos seis bancos segue em execução com S07.

- **Partner e Pet:** substituíram autenticação local por `AuthSessionClient`/`AuthSessionFilter` com bearer original a cada operação protegida, inclusive acesso direto. Só admitiram `200` com sessão válida. Responderam `401` para rejeição Auth, `403` para papel/permissão insuficiente e `503` para falhas de validação, sem cache ou redirecionamentos. Titular ou `DESK_CUSTOMERS_MANAGE` opera somente no próprio estabelecimento. Leituras fiscais de R01 permanecem protegidas.
- **Equipe:** `StaffAssignmentController`/`StaffAssignmentService` e migration V18 persistem o `teamAccessId` da atribuição confirmada no Auth. Titular vincula/desvincula, equipe resolve apenas a atribuição vigente. Novo convite com a mesma conta exige nova atribuição explícita.
- **Reivindicação:** `CustomerClaimController`/`CustomerClaimService` e V19 implementam verificação da conta ativa pelo Auth, emissão presencial, prova de 15 minutos vinculada à conta, digest, consumo atômico e auditoria. `CustomerMembershipClient`, `PetAccessService` e `PetService` resolvem pets históricos pelo vínculo atual e conservam a identidade do pet. Booking consulta os mesmos pares de vínculo para acesso ao histórico das reservas. `BookingPetSummaryController` e `InternalClaimOwnerController` entregam leitura de nome e espécie para reservas autorizadas sem liberar a API de prontuário da equipe.
- **Frontend:** `ReceptionPetDirectory` usa `ReceptionBookingDialog` da S03 e o ator da sessão Auth. `features/claims/` oferece cópia do código da conta e da prova, emissão com confirmação presencial e resgate pelo tutor. `CustomerAccountDirectory` e `CustomerAccountStatusDialog` usam o PATCH Auth com confirmação e recarga da lista. `customer.service.ts` integra as operações. Rotas de S01 e configuração de tokens descartáveis/ingresso de S07 estão no checkout.

| Validação local | Resultado |
| --- | --- |
| Partner Service `gradlew.bat test --offline --no-daemon` | 28 testes, 0 falhas na última execução, às 14:58 BRT. Inclui Tomcat/H2 para regressão R01-001, escopo de recepção, titularidade e revogação seguida por novo convite, prova repetida/substituída/expirada, titular incorreto, consumo concorrente e consulta interna do vínculo. |
| Pet Service `gradlew.bat test --offline --no-daemon --tests '*ControllerTest' --tests '*PetAccessServiceTest' --tests '*AuthSessionClientTest'` | 17 testes, 0 falhas. Inclui acesso de equipe/revogação, troca de IDs, resumo de pet para agenda e escopo do tutor reclamante. O teste de contexto contra dependências externas ficou com a stack. |
| Fixtures HTTP de sessão nos dois serviços | Validado `200`, recusa de `202`, `204` e `302` que aponta para um `200`, e rejeição `401` na consulta seguinte com a mesma credencial. |
| PostgreSQL 15 descartável, `psql -v ON_ERROR_STOP=1` | Cadeia Partner V1–V19 aplicada em container independente sem porta publicada. Conferidos constraint do par de IDs da escala e persistência auditável de vínculo de tutor. |
| `npm run build` e ESLint de clientes/reivindicação | Aprovados. Vite advertiu sobre o tamanho do bundle principal. |
| Chromium/Vite local com respostas simuladas | Aprovados o cenário completo de recepção individual, cadastro de tutor/pet, retry de reserva com a mesma chave e corpo, emissão e resgate da prova, e o teste administrativo de desativação/reativação. O teste de resgate foi reexecutado com seletor do input que aceita a marcação de campo obrigatório. |

Após o snapshot S07 de 17:57:24 UTC, o Partner recebeu três ajustes finais. `Staff.java` usa atualização restrita a colunas alteradas para preservar a atribuição em uma edição de perfil concorrente. `ReceptionCustomerRepository.java` e `CustomerClaimService.java` usam uma consulta de existência antes do lock para que a emissão leia o estado atual de reivindicação sob trava, sem uma entidade JPA carregada antes da disputa. A última suíte Partner cobre o snapshot final, com teste de dois resgates simultâneos que produz um `200` e um `409`. A coordenação encaminhou esses caminhos à S07 para conferência da imagem e novo build se necessário.

[Contrato da onda B](contracts.md#onda-b--sessão-escala-e-reivindicação-13112026-implementado) e [roteiro](integration.md#onda-b--pontos-publicados-em-13112026).

### Aceite integrado S07 da quarta rodada

`E2E_WAVE_B=1 node e2e/run-local.mjs`, projeto `easypet-e2e-d60c028996`, aprovou 18 de 18 cenários em 2,6 minutos. A jornada de equipe, balcão, caixa e reivindicação passou em 18,8 s. A recepção cadastrou tutor, pet e reserva pela interface. O profissional abriu somente suas atribuições, com os dados mínimos do pet e do serviço. O tutor resgatou o código na interface e os IDs históricos do pet e da reserva continuaram acessíveis. O teste também confirmou códigos de prova expirada, conta divergente e reutilização, revogação direta da recepção, e recusa de leitura pelo profissional reconvidado sem nova atribuição. Passaram os casos de inativação, indisponibilidade Auth, isolamento e R01-001. O cenário de escala sem recarga anterior à edição passou em 3,1 s.

O teste integrado emitiu a prova pela API e resgatou pela interface. A emissão presencial pela interface foi exercitada na regressão Chromium isolada com respostas simuladas. Log S07 em `C:/Users/randy/AppData/Local/Temp/easypet-wave-b-run4.log`. A S07 mantém os snapshots e a restauração representativa; os resultados de restauração são independentes do 18/18 de jornadas.

### R01-B02 — edição de escala após cadastro

`Frontend/src/pages/partner/ColaboradorPage.tsx` remonta o editor a cada mudança de estabelecimento administrativo ou ID de colaborador. O formulário aguarda colaborador, escala e afastamentos do destino e descarta respostas de um editor desmontado. Falha de carregamento oferece nova tentativa. A edição da escala também fica indisponível durante o próprio salvamento.

Chromium/Vite local com API simulada aprovado. O teste cadastrou o colaborador, reteve o GET da escala após a navegação, confirmou que a aba e os switches ainda estavam indisponíveis, liberou uma escala vazia, editou e enviou segunda-feira de 09h a 17h. Conferiu o corpo do PUT, a confirmação de sucesso e um marcador em `window` que provou que a página não recarregou. ESLint do arquivo passou. A S07 deve usar a versão atual do frontend no reteste, removendo a recarga usada antes como contorno.

No segundo aceite S07, `partner-onboarding.spec.ts` passou em 3,7 s sem recarga entre a criação e a edição. Também passaram a inativação do tutor e o teste de indisponibilidade do Auth com chamadas diretas ao Partner e ao Pet. O cenário novo de equipe e reivindicação parou antes do cadastro de balcão, pois `POST /auth/team/invitations/accept` recebeu `429` no navegador, conforme o trace dessa execução. A regressão de balcão e isolamento e a leitura fiscal protegida passaram. O novo cenário segue pendente de reteste com S07.

Na terceira rodada, o convite foi aceito (`200`) e a listagem de atribuições da S04 respondeu `200`; a página Equipe parou após `GET /auth/team/accesses` receber `429` antes do segundo convite. A escala, isolamento de balcão, R01-001, inativação e indisponibilidade Auth passaram novamente. O fluxo integrado de reivindicação ainda não chegou à etapa de cadastro nessa rodada.

## Registro anterior à onda B

Estado em 13/11/2026: implementação independente pronta e validada localmente. Aceite integrado pendente.

## Entregas e arquivos

- `Backend/Partner-Service/src/main/` contém `ReceptionCustomerController`, `ReceptionCustomerService`, entidade, repositório e DTOs de balcão, tratamento HTTP, regras em `SecurityConfig` e migration `V17__create_reception_customers.sql`. O cadastro resolve o estabelecimento ativo pela sessão de titular, normaliza nome e contato e tem restrições de unicidade por estabelecimento. A API administrativa fica em `/admin/reception-customers` e a verificação interna devolve somente os IDs de vínculo.
- `Backend/Pet-Service/src/main/` contém `ReceptionPetController`, `ReceptionPetService`, `CustomerMembershipClient`, DTO, tratamento HTTP e migration `V10__add_reception_pet_membership.sql`, mais alterações em `Pet`, `PetRepository`, `PetAccessService` e `SecurityConfig`. O Pet consulta a prova de vínculo no Partner Service com o JWT original e restringe as consultas por estabelecimento e cliente. Pets sem conta ficam fora dos endpoints de prontuário existentes.
- `Frontend/src/features/customers/`, `Frontend/src/services/customer.service.ts` e as duas `ClientesPage.tsx` implementam as telas de balcão e administração. Há busca e paginação, detalhe, criação de cliente e pet no parceiro, estados de carregamento, vazio, erro, conflito e confirmação. A tela administrativa consulta o cadastro de balcão e também lista contas e estados do Auth pelo contrato real de S02.
- `ReceptionCustomerControllerTest`, `ReceptionPetControllerTest` e `PetAccessServiceTest` testam a nova superfície. [Contratos](contracts.md) publicados na abertura e atualizados após S02. [Pedidos e roteiro de integração](integration.md) incluem exemplos para a galeria.

## Validação

| Comando ou verificação | Resultado |
| --- | --- |
| Partner Service `gradlew.bat test --offline --no-daemon` com JDK 21 | 14 testes, 0 falhas. Cinco novos testes com MockMvc e H2 cobrem dois estabelecimentos, busca e paginação, acesso administrativo, contato obrigatório, duplicidade normalizada e rejeição do tutor com o mesmo e-mail. |
| Pet Service `gradlew.bat test --offline --no-daemon --tests '*PetAccessServiceTest' --tests '*ReceptionPetControllerTest'` com JDK 21 | 9 testes, 0 falhas. Contrato HTTP, papéis, troca de IDs, conflitos, verificação de vínculo indisponível e preservação das regras de prontuário. O teste completo de contexto do Pet requer configuração dos serviços externos. |
| PostgreSQL 15 em container isolado, PSQL com `ON_ERROR_STOP=1` | Aplicadas em ordem as cadeias V1–V17 do Partner e V1–V10 do Pet em dois bancos descartáveis. Inserção de pet com dono e de pet de balcão, e rejeição por unicidade nas duas tabelas. O container usou imagem local, memória temporária, sem portas publicadas. |
| ESLint dos arquivos frontend da S04 | Aprovado. |
| Chromium local com Vite e APIs simuladas | Aprovado. Em mobile, cadastro e validação de tutor, cadastro e conflito de pet e busca vazia. Em desktop, detalhe administrativo e filtro das contas Auth. Os guards e as rotas usados são os da aplicação. |
| Frontend `npm run build` | O primeiro build passou. No snapshot final, `tsc -b` encontrou três erros de `NO_SHOW` em `AgendamentosTab.tsx` e `DashboardPage.tsx`, fora da S04. Nenhum diagnóstico nos arquivos da S04. |

## Pendências

- **S07:** executar o aceite com Gateway, Nginx, Partner e Pet reais em stack descartável. S01 conectou os caminhos web e S07 configurou as rotas do Gateway e a URL interna do Partner no Pet. A aba de contas depende da configuração de S02 no Auth.
- **S03:** reservas de balcão precisam aceitar `customerId` separado de `userId` e validar o vínculo por meio do Pet Service. O fluxo atual usa o dono Auth do pet. A criação de reserva pelo balcão segue pendente.
- **S02/S04:** finalizar a prova de reivindicação auditável com uso único e expiração e integrar o papel individual de recepção. A implementação atual opera pelo titular `PARTNER`. Os cadastros permanecem sem conta vinculada.

## Correção R01-001

Aplicada e validada em 13/11/2026 no Partner Service. `SecurityConfig` restringe as leituras completas por papel, inclusive `HEAD`, e `PartnerService.findById` aplica `PartnerAccess.requireOwnerOrAdmin` antes de mapear a resposta. `PartnerController` restringe a coleção completa ao administrador. As consultas do titular e da administração continuam disponíveis para os papéis previstos.

`InternalPartnerController`, `PartnerOperationsResponse`, `PartnerMapper` e `PartnerService` entregam `GET /api/v1/internal/partners/{partnerId}/operations` com JWT original e dados operacionais necessários. Inclui capacidade, expediente e serviços, preservando a consulta a estabelecimentos inativos para os consumidores existentes. Dados fiscais e de contato ficam restritos à leitura completa. O [contrato](contracts.md#leituras-de-estabelecimento--r01-001) foi publicado antes da alteração, e a [migração dos consumidores](integration.md#r01-001--migração-dos-consumidores) foi conferida nos clientes Booking e Payment.

- **Partner:** `gradlew.bat test --offline --no-daemon` com JDK 21. 20 testes, 0 falhas. Os seis casos de `PartnerReadAccessTest` usam Tomcat em porta aleatória, banco H2 exclusivo e JWTs assinados. Verificam `401` para credencial ausente/inválida, `403` para tutor e parceiro alheio na leitura completa, sucesso do titular e admin, catálogo ativo e campos exatos da projeção interna.
- **Pet:** `gradlew.bat test --offline --no-daemon --tests '*PetAccessServiceTest' --tests '*ReceptionPetControllerTest' --rerun-tasks` com JDK 21. 9 testes, 0 falhas em escopo de balcão e prontuário.
- **Integração pendente:** S07 deve testar a projeção interna com Booking/Payment reais e confirmar o bloqueio da rota no ingresso público. A validação acima chamou o Partner diretamente.
