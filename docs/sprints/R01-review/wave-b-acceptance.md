# Onda B — Matriz de aceite e revisão

Estado: aceite integrado concluído em 13/11/2026, no escopo e limites abaixo. Quarta rodada S07: 18/18, seis bancos restaurados com referências, hashes estáveis e limpeza conferida. Resultados da R01 anterior preservados em review.md e revalidation/. [Evidência final](wave-b/final-evidence.json).

| Jornada / propriedade | Implementação | Evidência exigida no novo aceite S07  Resultado observado |
| --- | --- | --- | --- |
| Sessão transversal | S02; S03/S04/S05/S06 e Gateway S07 | Reset, inativação e revogação recusam JWT anterior; Gateway e chamadas diretas; indisponibilidade Auth retorna erro recuperável sem efeito persistido; nenhum fallback autoriza pelo JWT isolado.  Aprovado nas rotas cobertas: wave-b-identity, team e notification; Gateway e serviços diretos, 401/503 preservados. |
| Recuperação | S02 + S01 + S07 | Link capturado em SMTP local, navegação, troca de senha, token repetido/expirado/inválido, sessão antiga recusada.  Aprovado pela UI/SMTP local com troca de senha e novo login. Fixture respeita 429 antes de verificar códigos de token. |
| Equipe | S02 + S01 + S04 | Titular convida/lista/revoga pela UI; link local aceito; profissional selecionado da escala e vinculado à conta; sem autoatribuição pelo operador.  Aprovado: convite/aceite UI de recepção, demais perfis também por API, gestão/vínculo/revogação UI e reconvite sem atribuição herdada. |
| Permissões operacionais | S03/S04/S05 | Recepção cadastra tutor/pet/reserva e recebe pagamento; fechamento recusado. Gestor fecha; profissional só lê/atende atribuições; troca de IDs e estabelecimento negada.  Aprovado pela jornada real de equipe, inclusive profissional próprio/alheio, recepção sem fechamento e gestor com fechamento. |
| Balcão e reivindicação | S04 + S03 + S01 | Jornada pela UI, prova vinculada ao tutor autenticado com uso único/expiração, sem associação automática por e-mail; pet/reserva históricos preservados e isolamento mantido.  Cadastro/reserva e resgate pela UI aprovados; emissão da prova pela API integrada e UI simulada. Histórico de pet/reserva preservado. |
| Reserva no catálogo/carrinho | S03 | Intenção preserva chave em retry e reload após resposta perdida; uma reserva e um evento; nova intenção deliberada continua possível.  Catálogo real aprovado com perda de resposta/reload e uma reserva/evento. Carrinho e retry do balcão com APIs simuladas; créditos permanecem bloqueados. |
| Caixa no painel | S05 + S01 | Recebimento parcial, retry após reload/resposta perdida, totais/centavos, autoria, fechamento e isolamento; sem duplicação.  Aprovado: cobrança, baixa parcial, reload/retry, uma movimentação, autor, saldo e fechamento na UI real. |
| Notificações | S02/S03/S06 + S01/S07 | Destinatário correto no coletor SMTP; ADMIN consulta/histórico/reenvio; replay/reinício/ACK e obsolescência sem entrega indevida; tentativa ambígua permanece visível.  Aprovado em SMTP local; falha/reenvio, READY, obsolescência, ACK/restart e SENDING/UNKNOWN. Aging de fixture acelera prazo; canal externo e balcão pendentes. |
| Recuperação de dados | S07 | Restauração representativa dos seis bancos, vínculos entre cadastros/reservas/recebimentos/outbox e anexos se existentes, com recursos exclusivos.  Aprovado para seis bancos/54 tabelas com consultas representativas. Sem comprovação de arquivos/anexos externos ou recuperação operacional publicada. |
| Regressões e frontend | S01/S07 | Build, navegador e recarga direta das novas rotas; R01-001/002/003 e navegação anterior continuam passando; 401 encerra sessão e 403 não a apaga.  Build, 18 cenários sem skip, R01-001/002/003, B01/B02 e typecheck independente aprovados. Jornada móvel completa permanece pendente. |

## Condições de revisão R01

- Conferir código e fontes de testes dos donos, resultados efetivamente executados e snapshot do conjunto S07; declarar testes isolados e integrados separadamente.
- Não transformar descoberta/listagem de cenários em aprovação; não considerar skips de jornada exigida como sucesso completo.
- Não reduzir expectativas de autorização, concorrência ou idempotência para fazer teste passar; fixture corrigida exige justificativa e reteste.
- Preservar dados e alterações existentes. R01 não altera produto e não executa Compose; correções são devolvidas ao responsável e retestadas pela S07 quando cruzam serviços.
- Fechar cards somente com implementação e evidência compatíveis. Publicação, decisões do piloto, operação com pessoas e pagamentos online permanecem fora desta rodada.
