# Onda B — Aceite integrado e revisão concluídos

**Parecer favorável ao escopo local da onda B, em 13/11/2026.** Os responsáveis concluíram as integrações e as correções encaminhadas. A quarta rodada S07 passou em **18/18 cenários**, restaurou os seis bancos com registros das jornadas e removeu os recursos descartáveis. R01 conferiu código, fontes dos cenários, relatórios e integridade do conjunto. Isso não autoriza publicação ou operação com dados reais.

## Evidência conferida

| Verificação | Resultado |
| --- | --- |
| Build e Playwright S07 | Serviços e frontend compilados; 18/18 cenários em 2,6 minutos, sem skips. Projeto `easypet-e2e-d60c028996`, Chromium, PostgreSQL e SMTP exclusivamente local. Inclui as 12 regressões anteriores. |
| Recuperação representativa S07 | Seis dumps e restauração em `easypet-restore-6e7b9b18c7f18509`: Auth 4 tabelas, Pet 8, Partner 16, Booking 8, Payment 11 e Notification 7. Consultas de referência conferidas nos seis bancos. |
| Integridade R01 | HEAD `ceba61cc4ae325ddd8ff5012020508c6e55e5966`; 619 registros iguais antes/depois e no inventário independente atual: 609 arquivos presentes e dez exclusões rastreadas. Nenhuma divergência. Alterações locais ainda não representam commit/release. |
| Testes locais dos donos | 140 testes Java, 22 relatórios, zero falhas/erros/skips: Auth 11, Booking 44, Gateway 3, Notification 24, Partner 28, Payment 13 e Pet 17. Ambientes e doubles descritos nos status de cada sprint. |
| Frontend R01 | Typecheck independente sem diagnósticos após a correção da escala; fonte presente no snapshot aceito. Build, lint e navegadores simulados adicionais pelos donos. |
| Limpeza R01 | Consulta Docker somente leitura confirmou zero containers, volumes e redes dos dois projetos exatos do aceite/restore. |

[Evidência consolidada](wave-b/final-evidence.json) · [Comparação de hashes](wave-b/final-snapshot-verification.json) · [Inventário independente](wave-b/final-source-snapshot.json) · [Relatórios Java](wave-b/test-report-summary.json) · [Typecheck](wave-b/typecheck-after-b02.json) · [Resultado S07](../S07-infra-integracao/status.md).

## Integrações aprovadas e seus limites

- **S01/S02:** rotas, menus e guards conectados; recuperação pela UI e SMTP local, tokens inválido/expirado/usado, sessão antiga recusada e novo login. Convite/aceite de recepção e gestão/revogação de equipe pela UI, com perfis e vínculos no Auth.
- **S02/S03/S04:** equipe vinculada à escala, profissional restrito à atribuição, inclusive pet de tutor e de balcão. Reconvite da mesma conta não restaura a atribuição anterior. Recepção cadastra tutor, pet e reserva pela UI; outro estabelecimento continua isolado.
- **S04:** reivindicação exige prova expirada/repetida/tutor incorreto recusados e resgate correto pela UI. Pet e reserva mantêm os IDs e tornam-se acessíveis ao tutor verificado. A emissão da prova foi exercitada pela API integrada e pela UI com APIs simuladas; não há associação automática por e-mail.
- **S03/S05:** catálogo conserva chave/corpo após resposta perdida e reload, persistindo uma reserva/evento. Caixa cria cobrança, recebe parcialmente, retoma a mesma intenção após perda de resposta/reload e fecha pela interface. Conferidos uma baixa de 4.000 centavos, saldo de 2.000 centavos, autor individual e recusa de fechamento à recepção. Retry do balcão e carrinho também passaram em navegador simulado; créditos do carrinho não foram habilitados.
- **S02/S06/S07:** destinatário Auth, falha SMTP e reenvio ADMIN, lembretes obsoletos, confirmação/reagendamento/cancelamento/retirada, replay do ACK e reinício sem duplicação. Interrupção real durante SENDING conserva UNKNOWN e recusa retry; o teste envelhece o registro na base descartável para acelerar esse prazo. Revogação ADMIN e Auth indisponível recusados no Gateway e Notification direto.
- **Sessão transversal:** reset/inativação/revogação recusam JWT anterior nas rotas cobertas; Gateway e serviços diretos falham fechado. Auth pausado produz 503 recuperável. O limitador permaneceu ativo; fixtures repetem somente 429 com dados iguais e usam Tentar novamente na UI quando necessário.
- **Recuperação:** escritores parados para backup consistente da stack local; consultas compararam registros de tutor/pet/estabelecimento, vínculo de balcão reivindicado, reservas, cobrança/baixa/autoria, outbox com ACK e Notification. A comprovação é de dados restaurados, não de um exercício operacional em produção.

## Achados e tentativas

**R01-B01 e R01-B02 encerrados como corrigidos e revalidados.** O primeiro classificava timeout/cancelamento da consulta Auth como 500 no Booking; agora responde 503. O segundo permitia que a leitura inicial da escala sobrescrevesse interação após criar colaborador; a transição agora aguarda o editor correto e passou sem reload intermediário. [Achados detalhados](wave-b-findings.md). R01-001/002/003 anteriores continuam cobertos pelas regressões.

| Rodada | Resultado | Motivo de repetição |
| --- | --- | --- |
| 1 | 11/18, 2,6 min | Dois defeitos de produto, fixtures de status/fuso, limite na galeria e fontes Partner alteradas após captura. |
| 2 | 16/18, 4,2 min | Seletor de senha com campo obrigatório e 429 no aceite de convite; cobrança de referência ainda ausente. Hashes estáveis. |
| 3 | 16/18, 5,7 min | 429 no replay do reset e leitura de equipe; fixtures ainda não percorriam a recuperação da UI. Hashes estáveis. |
| 4 | 18/18, 2,6 min | Todos os cenários, restauração dos seis bancos, integridade e limpeza aprovados. |

[Histórico da revisão incremental](wave-b-review-progress.md) · [Disparos e ownership adicional](wave-b-dispatch.md) · [Matriz de aceite](wave-b-acceptance.md). Evidências anteriores R01 permanecem em [review.md](review.md) e `revalidation/`.

## Pendências preservadas

Publicação na VPS/HTTPS, piloto, carga, alertas/operadores, privacidade e procedimentos operacionais permanecem abertos. O ensaio não aprova backup de arquivos/anexos externos, retenção, RPO/RTO ou recuperação em ambiente publicado. Não houve envio externo, deploy, checkout ou créditos.

Também seguem pendentes canal/provedor e preferências de comunicação, destinatário de balcão, jornada móvel completa, interrupção de atendimento e autorização de adicionais, administração ampliada e suporte. Ativação/desativação de contas pela UI foi validada com APIs simuladas; a API Auth e seus efeitos transversais passaram na stack, mas essa tela ainda deve ser exercitada contra Auth real no ambiente publicado. Esses limites estão nos cards do [roadmap](../../ROADMAP.md).

R01 coordenou os donos por autorização humana, revisou evidências e atualizou documentação/roadmap. Não alterou produto nem executou Compose ou a suíte integrada. Não há monitoramento futuro associado a este fechamento.
