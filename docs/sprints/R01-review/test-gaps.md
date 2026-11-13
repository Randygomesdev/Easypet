# R01 — Cobertura e lacunas após revalidação

**Atualizado em 13/11/2026:** R01-001, R01-002 e R01-003 encerrados; build e typecheck desbloqueados. A [cobertura anterior](test-gaps-initial.md) preserva as provas que levaram aos achados. O [parecer atual](review.md) distingue execução independente, testes dos responsáveis e aceite integrado S07.

## Cobertura confirmada

| Executor | Evidência examinada pelo R01 | Alcance |
| --- | --- | --- |
| R01 | TypeScript sem emissão, código 0, sem diagnósticos | Verificação independente dos tipos do frontend corrigido. |
| S02 | Oito testes Auth | PostgreSQL/MockMvc, sessão e reset no Auth, SMTP em memória, Partner simulado. |
| S03 | 40 testes Booking, incluindo 14 com PostgreSQL | Concorrência, rollback, idempotência, agenda/estados/outbox, timeout HTTP parcial, espera real pela trava e retomada. Dependências HTTP simuladas nesses testes. |
| S04 | 20 testes Partner e nove Pet | Autorização, isolamento, vínculo e duplicidade; seis testes Partner de leitura com HTTP real/H2. |
| S05 | 11 testes Payment | Ledger PostgreSQL, autorização em Tomcat real, projeção Partner, idempotência e fechamento. |
| S06 | 16 testes Notification | H2/doubles, deduplicação, retry, revisão, UNKNOWN, autorização e transporte. |
| S07 | Build completo; 12/12 Playwright em 28,2 s | Chromium/PostgreSQL 15, navegação existente e galeria, ingresso, administração, balcão, agenda/caixa, três regressões R01 e duas confirmações LOCAL. |

Os 18 relatórios Java somam 104 testes, sem falhas/erros/skips. R01 leu fontes e relatórios; não os reexecutou. Os 18 arquivos do snapshot S07 coincidem com o checkout. Resultados e hashes estão em [revalidation/](revalidation/evidence.json).

A retomada após falha de Pet foi comprovada também entre serviços reais pela S07 (503 em 2.252 ms seguido de 201). A evidência de ausência de histórico/outbox/idempotência parciais é do teste PostgreSQL do S03. O diagnóstico em stack estável passou na S07; a recuperação dos seis bancos continua sendo um ensaio com dados sintéticos.

## Lacunas remanescentes

| Dono | Trabalho e validação ainda necessários |
| --- | --- |
| S02/S07 e serviços de domínio | Aplicar sessão/revogação/reset/inativação transversalmente. Hoje Auth invalida a sessão, mas serviços legados verificam assinatura sem consultar sessão. Validar JWT anterior e falha fechada quando Auth está indisponível. |
| S02/S03/S04/S05 | Integrar permissões operacionais de gestor, recepção e profissional com autoria individual e estabelecimento. A chave separada mantém TEAM_MEMBER fora dos serviços legados; não há bypass demonstrado. |
| S03/S01 | Enviar chave estável nas telas legadas de catálogo/carrinho e testar resposta perdida após commit seguida de retry. A idempotência da API é opcional e os consumidores antigos não a enviam. |
| S04/S02/S03 | Conectar a criação de reserva de balcão à UI e validar identidade de recepção. Implementar reivindicação com prova de identidade, expiração e uso único. Cadastros permanecem UNCLAIMED, sem transferência automática por e-mail. |
| S05/S07 | Conectar a rota de caixa e validar jornada no painel, retry após reload e acesso por conta revogada. A tela isolada preserva a chave somente enquanto o formulário permanece aberto. |
| S06/S07 | Testar na cadeia real queda após commit antes do ACK, reinício após SENDING, revisão/cancelamento antes do lembrete e administração com Auth real. As duas confirmações LOCAL aprovadas não cobrem esses casos, ainda exercitados com doubles. |
| S02/S06 | Entregar resolução autenticada de destinatário e validar recuperação/convite com coletor SMTP local. Canais externos e preferências continuam pendentes. |
| S01/S07 | Conectar e validar rotas de recuperação, equipe, caixa e notificações. Galeria, build e navegação existente já passaram; não equivalem à integração dessas novas telas. Tratar separadamente os sete erros e três avisos de lint preexistentes relatados por S01. |
| S07 | Restaurar cadastros, reservas, recebimentos, outbox/ACKs e anexos representativos nos seis bancos. Completar alertas recebidos por responsável, correlação operacional, critérios de recuperação e ensaio de incidente. |
| Produto/S07 | Definir piloto e suporte, publicar na homologação e cumprir os critérios operacionais do roadmap antes de dados reais. Checkout e créditos continuam bloqueados. |

Essas pendências não reabrem os três achados corrigidos nem afirmam ocorrência de todas as falhas hipotéticas. Somente S07 executou Compose/aceite integrado; R01 não iniciou outra stack.
