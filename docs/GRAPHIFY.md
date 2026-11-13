# Graphify no Easypet

Na raiz do monorepo, com o Graphify e o Python com PyYAML disponíveis, rode:

```powershell
$env:PYTHONUTF8 = '1'
graphify extract . --code-only
python scripts/indexar-compose.py
graphify cluster-only . --no-label --no-viz
graphify path "Compose: frontend" "Compose: booking-db"
```

Use `graphify-out/graph.json` para consultas e `graphify-out/GRAPH_REPORT.md` para o resumo. O diretório é ignorado pelo Git. A extração foi executada com o Graphify 0.9.61, localmente e sem LLM. O modo `--code-only` indexa Java, TypeScript e as migrations SQL. O script lê apenas `compose.homolog.yml` e acrescenta os serviços e seus vínculos `depends_on`, sem copiar valores de ambiente.

## Mudança de status da reserva

1. Em **Agendamentos**, o parceiro confirma a reserva com `CONFIRMED`. O botão **Iniciar Atendimento** abre a consulta e envia `IN_PROGRESS`. Finalizar envia `COMPLETED`. [Agendamentos](../Frontend/src/pages/partner/AgendamentosPage.tsx#L228) · [Iniciar atendimento](../Frontend/src/pages/partner/AtendimentoPage.tsx#L818) · [Finalizar atendimento](../Frontend/src/pages/partner/AtendimentoPage.tsx#L740)
2. O frontend envia `PATCH /api/v1/bookings/{id}/status?status=<STATUS>` com o token Bearer. O Nginx encaminha `/api/v1/` ao Gateway, que valida o JWT e roteia `/api/v1/bookings/**` ao Booking Service. [Cliente de reservas](../Frontend/src/services/booking.service.ts#L140) · [Cliente HTTP](../Frontend/src/lib/api.ts#L4) · [Nginx](../Frontend/nginx.homolog.conf#L50) · [JWT](../Backend/Gateway-Service/src/main/java/br/com/innkercode/gateway/security/JwtGlobalFilter.java#L44) · [Rota do Gateway](../Backend/Gateway-Service/src/main/resources/application.yml#L72)
3. O `BookingController` recebe o status e chama `BookingService.updateStatus`. O serviço consulta o estabelecimento do parceiro em `/partners/me`, compara o ID com o da reserva e, se autorizado, salva o status na tabela `bookings` e devolve a reserva atualizada. Um parceiro de outro estabelecimento recebe `404`. [Controller](../Backend/Booking-Service/src/main/java/br/com/easypet/booking/controller/BookingController.java#L122) · [Serviço](../Backend/Booking-Service/src/main/java/br/com/easypet/booking/service/BookingService.java#L403) · [Consulta do parceiro](../Backend/Booking-Service/src/main/java/br/com/easypet/booking/client/PartnerServiceClient.java#L26) · [Migration](../Backend/Booking-Service/src/main/resources/db/migration/V1__create_bookings_table.sql#L1)

O grafo localiza a chamada do controller ao serviço e as verificações de acesso. A consulta do Compose mostra a sequência de dependências `frontend → gateway-service → booking-service → booking-db`. Os saltos HTTP foram conferidos nas configurações e nos contratos acima. A suíte Playwright cobre a sequência normal, a persistência de `COMPLETED`, a leitura do prontuário pelo tutor e a recusa da alteração por outro parceiro. [Cenários Playwright](../Frontend/e2e/pilot.spec.ts)

O Booking Service aceita `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED` e permite cancelar reservas pendentes ou confirmadas. Para o tutor, o cancelamento exige pelo menos duas horas de antecedência. A API devolve `400` para saltos, regressões ou tentativas de reabrir uma reserva concluída ou cancelada. Repetir o status atual, com a autorização exigida, devolve a reserva sem gravar novamente. [Regras de transição](../Backend/Booking-Service/src/main/java/br/com/easypet/booking/domain/enums/BookingStatus.java#L10) · [Roadmap](ROADMAP.md#p2--confiabilidade-de-agenda-e-créditos)
