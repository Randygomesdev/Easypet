# S05 — Integração H2

Aberto em 14/11/2026. [Contrato H2](h2-contracts.md).

- S03 publicou `GET /internal/booking-extra-authorizations/{authorizationId}?partnerId=…&bookingId=…&version=…` e a lista do próprio agendamento em `GET /bookings/{bookingId}/extras`. O Payment usa o primeiro caminho e o painel usa o segundo para seleção. A equipe do caixa não registra autorização em nome do tutor. O Payment preserva a autoria, origem tutora, canal, data e ID do aceite, além do autor individual da aplicação. A evidência declarada fica na auditoria ADMIN do Booking.
- S01 consome `GET /api/v1/admin/cashier/bookings/{bookingId}?partnerId={id}` na investigação. Usar o contexto da reserva ADMIN S03 e controlar a página do histórico financeiro separadamente. `charge: null` significa sem cobrança para o contexto consultado. Exibir adicional legado como valor histórico quando presente, e autoria de aplicação quando houver registro H2.
- S07 encaminha `GET /api/v1/admin/cashier/bookings/{bookingId}` ao Payment sob `ADMIN` e acrescenta somente `POST /api/v1/payments/cashier/charges/{chargeId}/approved-extras` ao ingresso permitido. Usar `BOOKING_PAYMENT_AUTHORIZATION_TOKEN` dedicado e idêntico apenas em Booking e Payment. Preservar o bloqueio de rotas internas, checkout e créditos. Banco/stack aguardam o resource gate S07.

## Fixture para o aceite real

1. Na reserva fictícia em atendimento, crie a cobrança sem adicionais e proponha um adicional de 1500 centavos. Tente aplicá-lo no caixa antes do aceite e espere `404`. Registre o aceite presencial com operador e prova declarada conforme S03.
2. Interrompa o atendimento com motivo e confirme que não apareceu recebimento ou reversão. Aplique o adicional aprovado pela ação **Vincular adicional**. O total sobe 1500 centavos e o recebido fica igual. Reenvie a mesma chave após perder a resposta. Deve haver um só adicional e o mesmo ID de aplicação. Nova chave para o mesmo aceite recebe `409`.
3. Verifique `400` para valor injetado no corpo, `404` para outro estabelecimento e `409` para versão incorreta. Feche o dia e tente aplicar outro aceite aprovado. Espere `409` e total anterior preservado.
4. Abra a reserva pelo ADMIN, compare o aceite e aplicação com a trilha Booking e consulte os movimentos paginados. Sessões de parceiro/tutor recebem `403` na projeção ADMIN. Um par reserva/estabelecimento sem cobrança retorna `charge: null` e página vazia.
