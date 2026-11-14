# H2 — Fechamento técnico do roadmap

Autorização: continuar o roadmap com os workers existentes, em 14/11/2026. Coordenação e revisão R01 neste chat; execução nos chats S01–S07 registrados em `../threads.json`. Esta rodada usa os workers Codex já existentes do EasyPet, não o launcher Gemini das contas Windows do Setoriza.

## Base, ambiente e limites

- Base congelada: `daabe0a2424e99ef501e46090308d8d6c04810d5`, branch `codex/unificar-develop`, worktree compartilhada `C:/Projects/Easypet`. Cada worker edita somente seus caminhos. Não trocar branch, criar outro checkout por conta própria, resetar, limpar, fazer stash, commit/push ou tocar o índice Git. Commits por domínio serão serializados pela R01 após revisão.
- Ler esta spec, a mission H2 do responsável, `../README.md`, o contrato atual do domínio e `../../ROADMAP.md`. As missions anteriores são histórico; não repetir entregas já aceitas. Código e evidências atuais prevalecem sobre checkboxes antigos das specs iniciais.
- Homologação continua restrita a testes internos/demonstração, sem fluxo real. Frontend publicado `210e8df`; backend publicado `4f6ce3c`. Preservar Google convidado, painel master, menu que empurra o conteúdo, limites de memória e isolamento do Setoriza.
- Não fazer deploy, mudanças de DNS/credenciais, envio externo, cargas na VPS, migrações destrutivas, ativação de checkout/créditos ou contratação de provedor. Não acessar arquivos `.env*` privados nem copiar credenciais do Setoriza. Necessidades reais ficam explícitas no handoff.
- Docker local deixou de responder na última entrega; navegador também expirou. Somente S07 diagnostica a infraestrutura compartilhada, sem restart/prune/reset global ou remoção de recursos de outra rodada. Testcontainers e Compose aguardam liberação escrita em `S07-infra-integracao/h2-resource-gate.md`. Não substituir testes PostgreSQL por H2 e chamar de aceite. Testes sem Docker podem avançar com recursos moderados; não reinstalar npm simultaneamente.
- Migrations aditivas, contratos versionados/retrocompatíveis, nenhuma leitura direta de banco alheio. Preservar negativa por papel, tenant, usuário inativo, sessão revogada e indisponibilidade de Auth. Nunca publicar tokens, payloads secretos ou endereços pessoais nos relatórios.

## Decisões confirmadas pelo usuário

1. Interrupção do atendimento exige motivo e histórico; não cobra nem estorna automaticamente.
2. Adicionais exigem autorização explícita do tutor. No balcão, registrar o aceite presencial e seu autor; não inferir aceite por ter iniciado o atendimento.
3. Alertas e suporte ficam concentrados no usuário ADMIN/painel administrativo. Isso não equivale a alerta externo independente quando a plataforma inteira está indisponível.
4. Não há provedor transacional definido. Avaliar Zoho usado no Setoriza, preparar configuração separada do EasyPet e testes locais. Credencial, remetente, ativação e envio real continuam pendentes. Não usar endereço digitado como prova de titularidade.

## Entregas e dependências

| ID | Entrega | Donos e sequência |
| --- | --- | --- |
| H2-01 | Auditoria persistente de administração de contas e permissões, com ator, alvo, antes/depois mínimo, motivo e data; consulta ADMIN paginada | S02 API; S04 integra histórico na tela de tutores; S01 navegação/consulta geral |
| H2-02 | Busca por estabelecimento/cidade/serviço ativo, combinada com categoria, paginação sem duplicação | S04 API; S01 catálogo e integração |
| H2-03 | Interrupção e adicionais autorizados, histórico e idempotência; cobrança explícita e única vinculada ao aceite | S03 contrato/Booking/UI; S05 valida no Payment e caixa; S06 eventos obsoletos/avisos |
| H2-04 | Preferências de comunicação e destinatário autorizado de balcão; preparação SMTP Zoho sem envio externo | S04 contrato de contato/consentimento de balcão; S06 preferências/entrega; S02 somente ajustes Auth necessários ao contrato |
| H2-05 | Investigação de reservas problemáticas pelo ADMIN, com histórico, caixa e tentativas correlacionados, sem edição direta no banco | S03/S05/S06 publicam projeções mínimas; S01 compõe interface; S04 preserva isolamento de dados pessoais |
| H2-06 | Central persistente de alertas e solicitações de suporte ao ADMIN, reconhecimento/resolução com autoria; usuário vê apenas seus chamados | S06 API/estado; S01 telas e sino; S07 coleta/ingresso operacional autenticado |
| H2-07 | Preparação de backup agendado, retenção configurável, alertas locais e recuperação; objetivos e operação externa explicitamente pendentes | S07 scripts/configuração candidata e ensaio descartável; nenhum agendamento na VPS nesta rodada |
| H2-08 | Revisão visual do menu, regressões e novo aceite integrado com restauração e isolamento | S01 comportamento/temas/teclado/móvel; S07 stack real e evidências; R01 revisão independente |

S02, S03, S04, S05 e S06 publicam `h2-contracts.md` cedo em suas pastas. Para novas rotas, registrar método, caminho, autenticação, DTO, erros, idempotência, paginação e migration. Consumidores não inventam endpoints. S07 integra Gateway/ingresso após esses contratos, e S01 integra rotas frontend. Alterações em arquivos de outro dono vão em `h2-integration.md` com contrato e pedido concreto.

Adicionais: preço/descrição/valor aprovados devem ser um snapshot imutável identificado e vinculado à reserva/estabelecimento/tutor; aceite inclui versão, autoria e canal. Repetir aprovação ou aplicação no caixa não duplica estado/cobrança. Não confiar em booleano ou valor enviado pelo cliente para comprovar aprovação. A interrupção preserva atendimento/histórico e invalida avisos incompatíveis; não marca serviço como concluído nem cria movimentação financeira.

Central ADMIN: não adicionar containers. Persistir eventos deduplicados e estado de leitura/reconhecimento/resolução, com severidade e identificadores de correlação sem segredos. Ingresso operacional somente interno e autenticado, nunca exposto publicamente. Chamados do usuário podem referenciar somente reservas próprias/autorizadas. ADMIN consulta contexto mínimo; nenhum dado de outro tutor deve vazar ao solicitante. Falha no alerta não desfaz reserva/recebimento. E-mail externo opcional e desligado até configuração aprovada.

## Gates que esta rodada não pode declarar concluídos

- Rotação final da chave Google: ação própria no console; segredo antigo não foi desativado por este chat.
- Definições comerciais/segmento, parceiros/metas/duração do piloto e operação com dados reais (etapas 0 e 6).
- Provedor/remetente transacional, credenciais, entrega externa e canal independente de alertas.
- Produção separada, RPO/RTO/retenção aprovados, privacidade/termos e processo de exportação/exclusão com revisão adequada; anexos externos só após armazenamento e demanda definidos.
- Capacidade sustentada e recuperação na VPS compartilhada: ensaio requer planejamento próprio para proteger o Setoriza; nenhum worker deve executar carga ou restaurar bancos publicados.
- Etapas 7 e 8 preservam suas dependências: checkout/créditos, monetização e expansões não são habilitados por esta rodada.

## Aceite e handoff

Cada worker mantém `h2-status.md` com estado, arquivos, testes/comandos/resultados, contratos consumidos, bloqueios e próximos passos. Só declarar validado no ambiente efetivamente testado. R01 atualiza o roadmap; workers não marcam cards globais.

S07 só executa o integrado após contratos estabilizados e liberação dos donos: snapshot dos arquivos antes/depois, serviços reais, dados sintéticos, fronteiras de papel/tenant, concorrência/idempotência, migrações/backup/restore e limpeza exclusiva da rodada. Documentar resultados locais, simulados e publicados separadamente. Fim de processo ou tela existente não equivalem a aceite.
