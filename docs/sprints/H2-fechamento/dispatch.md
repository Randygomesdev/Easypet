# Despacho H2 — 14/11/2026

Missões enviadas aos sete chats existentes registrados em `../threads.json`. O acompanhamento confirmou todos em execução; nenhuma entrega H2 recebeu aceite integrado nesta abertura. Planejamento enviado ao remoto em `7373e53`, com base de código `daabe0a` preservada.

| Worker | Missão enviada | Estado observado |
| --- | --- | --- |
| S01 | [Frontend e central ADMIN](S01-mission.md) | Em execução; contrato de rotas publicado |
| S02 | [Auditoria de identidade](S02-mission.md) | Em execução; contrato de auditoria publicado |
| S03 | [Interrupção e adicionais](S03-mission.md) | Em execução; contrato Booking publicado |
| S04 | [Busca e consentimento de balcão](S04-mission.md) | Em execução; contratos publicados |
| S05 | [Caixa com adicionais aprovados](S05-mission.md) | Em execução; contrato Payment publicado |
| S06 | [Alertas, suporte e preferências](S06-mission.md) | Em execução; contrato Notification publicado |
| S07 | [Infraestrutura e aceite integrado](S07-mission.md) | Em execução; gate inicial de recursos publicado, testes dependentes aguardam liberação |

## Orientações adicionais já enviadas

- S03/S05: alinhar nomes e autoria real do aceite entre as projeções; distinguir operador presencial de tutor. Não inventar autoria nem valor no consumidor.
- S06: correlacionar incidente estável e recuperação, identificar serviço por allowlist, proteger contra repetição/ordem invertida e registrar autoria de recuperação automática. Resolução de chamado deve conter resposta visível ao próprio solicitante.
- S07: ausência de processo no sandbox não comprova Docker ausente. Sonda elevada da rodada anterior encontrou processos, mas `docker version` expirou. Diagnóstico limitado sem restart/prune global e sem usar a VPS como fallback de E2E/carga.

## Zoho e responsabilidades

O usuário concentrou suporte e alertas no ADMIN e aprovou as regras de interrupção/adicionais da spec para testes internos. Ainda não definiu provedor transacional/remetente. A referência local do Setoriza documenta `smtp.zoho.com`; nenhuma credencial foi lida ou copiada.

A documentação oficial apresenta [Zoho CPaaS, antigo ZeptoMail](https://www.zoho.com/cpaas/help/introduction.html?src=resource), para comunicação transacional por SMTP/API; a [política de uso Zoho Mail](https://www.zoho.com/mail/help/usage-policy.html) direciona e-mails automáticos transacionais ao serviço próprio. Avaliar configuração/conta aplicável antes de ativar entrega real. A preparação H2 usa transporte local e configurações separadas por aplicação; não cria conta, contrata serviço nem envia mensagens externas.

## Próximo aceite

Revisar contratos e handoffs de cada domínio, resolver integrações, congelar fontes e só então executar o integrado S07 quando o gate de recursos permitir. Registrar separadamente implementação, testes simulados, serviços reais, publicação e pendências operacionais/comerciais. As etapas futuras e gates externos da spec continuam abertos.
