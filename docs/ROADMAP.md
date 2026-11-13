# Roadmap do Easypet

A primeira versão é para testes internos. A base do P0 já passou pelos testes de infraestrutura e de isolamento em localhost. A auditoria encontrou 65 commits nas branches `develop` de cinco repositórios, além de um commit de edição de serviços do Partner. A próxima entrega é integrar esse trabalho ao monorepo e validar a versão resultante no navegador em localhost. A publicação manual na VPS HOMOLOG do Setoriza vem depois do aceite local.

## 1. Entregas e pendências

- [x] **P0 — Base da primeira versão interna.** Preparar o Compose, provisionar contas de teste, isolar dados entre parceiros e validar a stack em localhost.
- [x] **Unificação — Auditoria.** Comparar os oito repositórios com os commits importados e identificar mudanças que ficaram de fora.
- [x] **Unificação — Integração.** Recuperar as versões de Partner, Pet, Booking, Payment e Frontend no monorepo, preservando o P0.
- [ ] **P0 — Aceite em localhost.** Percorrer cadastro, agenda e atendimento pelo navegador e corrigir os bloqueadores encontrados.
- [ ] **Deploy de teste — HOMOLOG.** Publicar manualmente na VPS compartilhada após o aceite local.
- [ ] **P1 — Operação do parceiro.** Completar o cadastro de parceiros e reduzir a dependência da API para a rotina do estabelecimento.
- [ ] **P2 — Confiabilidade.** Fortalecer as regras de agendamento, o controle de créditos e o diagnóstico de falhas.
- [ ] **P3 — Piloto com convidados.** Entregar a jornada mínima do tutor e os controles administrativos do piloto.
- [ ] **P4 — Evolução comercial.** Integrar pagamentos reais e acompanhar as movimentações financeiras.

## 2. Cards das próximas sprints

### Unificação — recuperar o trabalho dos repositórios separados

**Estado:** código integrado na branch `codex/unificar-develop` e fluxo combinado validado pela API em `localhost:18082`. O aceite no navegador permanece pendente. Auth, Gateway e Infra não têm mudanças funcionais adicionais nas branches remotas atuais.

- [x] Identificar as revisões de origem: Partner `bcaaa44` e `cf16577`, Pet `37b63f5`, Booking `8373d26`, Payment `c58c482` e Frontend `7e51ce9`.
- [x] Preservar a base local do P0 em um commit e trabalhar em uma branch de integração.
- [x] Integrar categorias, edição de serviços e vínculo com equipe no Partner. Integrar a origem dos registros no Pet com as regras de acesso do P0.
- [x] Integrar os estados e as regras de agenda do Booking. A migration V6 cria o índice sem apagar registros. Se houver duplicidades ativas, será preciso resolvê-las antes de aplicar a migration.
- [x] Recuperar checkout e carteira no Payment. O checkout fica desligado por padrão, e as rotas de concessão e estorno de crédito ficam bloqueadas até receberem autenticação entre serviços e proteção contra repetição.
- [x] Integrar as telas do Frontend. No piloto, o tutor pode consultar a vitrine, criar um pet e solicitar uma reserva sem passar pelo checkout.
- [ ] Validar a jornada do tutor e do parceiro no navegador e mapear as permissões e rotas necessárias para testar a área administrativa.
- [x] Compilar os serviços e o frontend, aplicar migrations em banco de teste e validar pela API catálogo, serviço com equipe, pet, reserva, estados do atendimento e isolamento entre parceiros.

### P0 — Aceite da primeira versão em localhost

**Estado:** versão unificada validada pela API. O aceite no navegador segue pendente. [Roteiro de testes e dados fictícios](../Backend/Infra/docs/homologacao.md#contas-e-dados-de-teste).

- [x] Subir a stack local, aplicar as 31 migrations em PostgreSQL 15 e verificar a saúde dos 13 containers.
- [x] Criar uma conta `PARTNER` pelo comando interativo e validar seu login pela API.
- [x] Criar e confirmar uma reserva pela API e verificar que outro parceiro não acessa a reserva, o prontuário ou a escala.
- [ ] No navegador, cadastrar um estabelecimento, criar um serviço e vincular um colaborador com escala.
- [ ] Criar um pet e solicitar uma reserva pela área do tutor. Confirmar a reserva na agenda do parceiro, registrar o atendimento e conferir o prontuário e o status final.
- [ ] Corrigir os bloqueadores encontrados, repetir o roteiro e registrar o aceite local.

### Deploy de teste — publicação manual na HOMOLOG

**Estado:** Dockerfiles, Compose e guia preparados. Publicação condicionada ao aceite em localhost. [Guia de homologação](../Backend/Infra/docs/homologacao.md).

- [ ] Conferir capacidade, porta e proxy da VPS HOMOLOG compartilhada com o Setoriza.
- [ ] Configurar o domínio, o acesso interno e as credenciais do EasyPet na VPS.
- [ ] Atualizar o checkout com `git pull --ff-only` e subir a stack com Docker Compose.
- [ ] Confirmar a saúde dos serviços e repetir o roteiro com dados fictícios no endereço de homologação.

### P1 — Operação do parceiro

**Estado:** planejada para depois do aceite da primeira versão.

- [ ] Completar o cadastro de parceiro para que a conta criada tenha o papel correto e chegue ao cadastro do estabelecimento.
- [ ] Implementar recuperação de senha com rotas web e link de e-mail configurado para o ambiente.
- [ ] Permitir o cadastro de tutores e pets pelo painel, com vínculo e permissões definidos.
- [ ] Melhorar as mensagens de erro e os estados vazios em agenda, serviços, equipe e atendimento.

### P2 — Confiabilidade de agenda e créditos

**Estado:** planejada. O uso de créditos está desabilitado na versão interna.

- [ ] Tratar conflitos de horário e capacidade quando duas reservas são feitas ao mesmo tempo.
- [ ] Garantir que repetir uma requisição não debite créditos duas vezes e que uma reserva que falhe não deixe crédito debitado.
- [ ] Cobrir agendamento, isolamento e créditos com testes de integração.
- [ ] Registrar operações importantes para auditoria e facilitar o diagnóstico de falhas entre serviços.

### P3 — Piloto com parceiros e tutores convidados

**Estado:** planejada. As áreas do tutor e do administrador ainda são provisórias.

- [ ] Completar e validar a área do tutor recuperada da `develop`, com gestão de pets, busca de serviços e agendamento.
- [ ] Exibir o status das reservas e enviar notificações de confirmação e cancelamento.
- [ ] Entregar uma área administrativa mínima para acompanhar parceiros e contas do piloto.
- [ ] Executar o piloto por convite e registrar os problemas antes de ampliar o acesso.

### P4 — Pagamentos e operação comercial

**Estado:** planejada para depois do piloto com convidados.

- [ ] Validar em sandbox o checkout Mercado Pago recuperado da `develop`, confirmando o recebimento antes de liberar créditos.
- [ ] Implementar conciliação, cancelamentos e estornos.
- [ ] Entregar relatórios financeiros que distingam agendamentos concluídos, valores recebidos e créditos utilizados.
