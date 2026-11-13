package br.com.easypet.notification;

import static br.com.easypet.notification.BookingEvent.Type.*;
import static br.com.easypet.notification.Delivery.Outcome.TRANSIENT_FAILURE;
import static br.com.easypet.notification.Delivery.Status.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:s06;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "notification.poll-delay=3600000"
})
class NotificationFlowTest {
    private static final Instant NOW = Instant.parse("2026-11-13T12:00:00Z");
    private static final ZoneId BOOKING_ZONE = ZoneId.of("America/Sao_Paulo");

    @Autowired BookingEventConsumer consumer;
    @Autowired NotificationStore store;
    @Autowired DeliveryProcessor processor;
    @Autowired NotificationAdmin admin;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoBean Clock clock;
    @MockitoSpyBean LocalEmailTransport transport;

    private UUID bookingId;
    private UUID partnerId;
    private UUID userId;

    @BeforeEach
    void setup() {
        when(clock.instant()).thenReturn(NOW);
        bookingId = UUID.randomUUID();
        partnerId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void diagnosticsCountDueWorkAndOnlySanitizedRecentStates() throws Exception {
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", 48));
        var confirmation = delivery(Delivery.Type.CONFIRMATION);
        doReturn(new EmailTransport.Result(Delivery.Outcome.PERMANENT_FAILURE, "RECIPIENT_DOMAIN_BLOCKED"))
                .when(transport).send(any());
        dispatch(confirmation);
        assertThat(delivery(Delivery.Type.CONFIRMATION).canRetry(NOW)).isFalse();
        assertThatThrownBy(() -> admin.retry(confirmation.id(), UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class);

        String url = "http://booking.test/api/v1";
        var builder = RestClient.builder().baseUrl(url);
        var http = mock(InternalHttp.class);
        when(http.client(url)).thenReturn(builder);
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(url + "/internal/booking-events?limit=50")).andRespond(withServiceUnavailable());
        var jobs = new NotificationJobs(http, url, "outbox-test-token", consumer, store, processor, clock);
        jobs.tick();
        server.verify();
        // Keep other fixtures out of this aggregate by taking a baseline and making this reminder due.
        var endpoint = new NotificationQueueEndpoint(store, jobs, clock, "SMTP");
        var before = endpoint.queue();
        assertThat(before.outboxSyncState()).isEqualTo(NotificationJobs.SyncState.UNAVAILABLE);
        assertThat(before.lastOutboxCheckAt()).isEqualTo(NOW);
        assertThat(before.unroutableLastHour()).isGreaterThanOrEqualTo(1);
        jdbc.update("UPDATE notification_delivery SET due_at = ? WHERE id = ?",
                NotificationStore.timestamp(NOW.minusSeconds(30)), delivery(Delivery.Type.REMINDER).id());
        var after = endpoint.queue();
        assertThat(after.due()).isEqualTo(before.due() + 1);
        assertThat(after.oldestDueAgeSeconds()).isGreaterThanOrEqualTo(30);
        assertThat(json.writeValueAsString(after)).doesNotContain(bookingId.toString(), userId.toString(), "example.test");
    }

    @Test
    void concurrentReplayAndDuplicateRevisionCreateOneLogicalConfirmation() throws Exception {
        BookingEvent event = event(BOOKING_CONFIRMED, 2, "CONFIRMED", 48);
        try (var threads = Executors.newFixedThreadPool(2)) {
            var first = threads.submit(() -> consumer.consume(event));
            var second = threads.submit(() -> consumer.consume(event));
            first.get(10, TimeUnit.SECONDS);
            second.get(10, TimeUnit.SECONDS);
        }
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", 48));
        dispatch(delivery(Delivery.Type.CONFIRMATION));
        assertThat(store.list(bookingId, 0, 20)).hasSize(2);
        Delivery confirmation = delivery(Delivery.Type.CONFIRMATION);
        assertThat(confirmation.status()).isEqualTo(SENT);
        assertThat(confirmation.attemptCount()).isEqualTo(1);
        assertThat(captures(confirmation)).containsExactly("notifications@example.test");
        assertThat(store.attempts(confirmation.id())).singleElement()
                .satisfies(attempt -> assertThat(attempt.outcome()).isEqualTo(Delivery.Outcome.SENT));
        assertThat(delivery(Delivery.Type.REMINDER).dueAt()).isEqualTo(NOW.plus(Duration.ofHours(24)));
    }

    @Test
    void reschedulingReplacesReminderAndLateEventsCannotRestoreIt() {
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", 48));
        Delivery previous = delivery(Delivery.Type.REMINDER);
        consumer.consume(event(BOOKING_RESCHEDULED, 3, "CONFIRMED", 72));
        consumer.consume(event(BOOKING_CREATED, 1, "PENDING", 48));

        assertThat(store.find(previous.id())).get().extracting(Delivery::status).isEqualTo(SUPERSEDED);
        var next = store.list(bookingId, 0, 20).stream()
                .filter(item -> item.type() == Delivery.Type.REMINDER && item.status() == PENDING)
                .findFirst().orElseThrow();
        assertThat(next.dueAt()).isEqualTo(NOW.plus(Duration.ofHours(48)));
        when(clock.instant()).thenReturn(next.dueAt());
        assertThat(processor.start(candidate(previous))).isEmpty();
        dispatch(next);
        assertThat(captures(previous)).isEmpty();
        assertThat(captures(next)).hasSize(1);
    }

    @Test
    void cancellationAfterClaimButBeforeHandoffInvalidatesReminder() {
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", 12));
        Delivery reminder = delivery(Delivery.Type.REMINDER);
        var claim = processor.start(candidate(reminder)).orElseThrow();
        consumer.consume(event(BOOKING_CANCELLED, 3, "CANCELLED", 12));
        processor.deliver(claim);

        assertThat(delivery(Delivery.Type.REMINDER).status()).isEqualTo(SUPERSEDED);
        assertThat(captures(reminder)).isEmpty();
        dispatch(delivery(Delivery.Type.CANCELLED));
        assertThat(captures(delivery(Delivery.Type.CANCELLED))).hasSize(1);
    }

    @Test
    void olderConfirmationCannotScheduleReminderAfterNoShow() {
        consumer.consume(event(BOOKING_NO_SHOW, 3, "NO_SHOW", -1));
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", -1));
        assertThat(store.list(bookingId, 0, 20)).isEmpty();
    }

    @Test
    void expiredReminderAndReadyEventHaveDistinctOutcomes() {
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", 2));
        Delivery reminder = delivery(Delivery.Type.REMINDER);
        when(clock.instant()).thenReturn(NOW.plus(Duration.ofHours(2)));
        assertThat(processor.start(candidate(reminder))).isEmpty();
        assertThat(delivery(Delivery.Type.REMINDER).status()).isEqualTo(SUPERSEDED);
        consumer.consume(event(BOOKING_READY, 3, "IN_PROGRESS", 2));
        dispatch(delivery(Delivery.Type.READY));
        assertThat(captures(delivery(Delivery.Type.READY))).hasSize(1);
    }

    @Test
    void transientFailuresBackOffAndAuditedRetryIsIdempotent() {
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", 48));
        Delivery confirmation = delivery(Delivery.Type.CONFIRMATION);
        doReturn(new EmailTransport.Result(TRANSIENT_FAILURE, "SMTP_TEMPORARY")).when(transport)
                .send(argThat(mail -> confirmation.id().equals(mail.deliveryId())));

        dispatch(confirmation);
        assertThat(delivery(Delivery.Type.CONFIRMATION).status()).isEqualTo(RETRY_SCHEDULED);
        assertThat(processor.start(candidate(confirmation))).isEmpty();
        when(clock.instant()).thenReturn(NOW.plusSeconds(60));
        dispatch(confirmation);
        assertThat(delivery(Delivery.Type.CONFIRMATION).dueAt()).isEqualTo(NOW.plusSeconds(180));
        when(clock.instant()).thenReturn(NOW.plusSeconds(180));
        dispatch(confirmation);
        assertThat(delivery(Delivery.Type.CONFIRMATION).status()).isEqualTo(FAILED);
        assertThat(admin.attempts(confirmation.id())).extracting(Delivery.Attempt::number).containsExactly(3, 2, 1);

        UUID actor = UUID.randomUUID();
        UUID key = UUID.randomUUID();
        admin.retry(confirmation.id(), key, actor);
        admin.retry(confirmation.id(), key, actor);
        assertThatThrownBy(() -> admin.retry(confirmation.id(), key, UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class);
        assertThat(store.retryActor(confirmation.id(), key)).contains(actor);
        doCallRealMethod().when(transport).send(argThat(mail -> confirmation.id().equals(mail.deliveryId())));
        dispatch(confirmation);
        admin.retry(confirmation.id(), key, actor);

        assertThat(delivery(Delivery.Type.CONFIRMATION).status()).isEqualTo(SENT);
        assertThat(delivery(Delivery.Type.CONFIRMATION).attemptCount()).isEqualTo(4);
        assertThat(captures(confirmation)).hasSize(1);
    }

    @Test
    void interruptedAttemptIsVisibleAndCannotBeReplayed() {
        consumer.consume(event(BOOKING_CONFIRMED, 2, "CONFIRMED", 48));
        Delivery confirmation = delivery(Delivery.Type.CONFIRMATION);
        var claim = processor.start(candidate(confirmation)).orElseThrow();
        when(clock.instant()).thenReturn(NOW.plus(DeliveryProcessor.ABANDONED_AFTER));

        String url = "http://booking.test/api/v1";
        var builder = RestClient.builder().baseUrl(url);
        var http = mock(InternalHttp.class);
        when(http.client(url)).thenReturn(builder);
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(url + "/internal/booking-events?limit=50"))
                .andRespond(withServiceUnavailable());

        // A fresh job instance recovers persisted SENDING even while Booking is unavailable.
        new NotificationJobs(http, url, "outbox-test-token", consumer, store, processor, clock).tick();
        server.verify();
        processor.deliver(claim);
        assertThat(delivery(Delivery.Type.CONFIRMATION).status()).isEqualTo(UNKNOWN);
        assertThat(captures(confirmation)).isEmpty();
        assertThat(store.attempts(confirmation.id())).singleElement()
                .satisfies(attempt -> assertThat(attempt.error()).isEqualTo("ATTEMPT_INTERRUPTED"));
        assertThatThrownBy(() -> admin.retry(confirmation.id(), UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void outboxReplayAfterCommitAndLostAckKeepsTheSameDelivery() throws Exception {
        BookingEvent event = event(BOOKING_CONFIRMED, 2, "CONFIRMED", 48);
        String url = "http://booking.test/api/v1";
        String token = "outbox-test-token";
        var builder = RestClient.builder().baseUrl(url);
        var http = mock(InternalHttp.class);
        when(http.client(url)).thenReturn(builder);
        var server = MockRestServiceServer.bindTo(builder).build();

        server.expect(requestTo(url + "/internal/booking-events?limit=50"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andRespond(withSuccess(json.writeValueAsString(List.of(event)), MediaType.APPLICATION_JSON));
        server.expect(requestTo(url + "/internal/booking-events/" + event.eventId() + "/ack"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(request -> assertThat(delivery(Delivery.Type.CONFIRMATION).status()).isEqualTo(PENDING))
                .andRespond(withServiceUnavailable());
        server.expect(requestTo(url + "/internal/booking-events?limit=50"))
                .andRespond(withSuccess(json.writeValueAsString(List.of(event)), MediaType.APPLICATION_JSON));
        server.expect(requestTo(url + "/internal/booking-events/" + event.eventId() + "/ack"))
                .andRespond(withNoContent());
        server.expect(requestTo(url + "/internal/booking-events?limit=50"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        new NotificationJobs(http, url, token, consumer, store, processor, clock).tick();
        var beforeReplay = delivery(Delivery.Type.CONFIRMATION);
        assertThat(captures(beforeReplay)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_event WHERE id = ?",
                Integer.class, event.eventId())).isEqualTo(1);
        new NotificationJobs(http, url, token, consumer, store, processor, clock).tick();

        server.verify();
        var afterReplay = delivery(Delivery.Type.CONFIRMATION);
        assertThat(afterReplay.id()).isEqualTo(beforeReplay.id());
        assertThat(afterReplay.status()).isEqualTo(SENT);
        assertThat(afterReplay.attemptCount()).isEqualTo(1);
        assertThat(captures(afterReplay)).containsExactly("notifications@example.test");
    }

    @Test
    void staleClaimCannotSendOnBehalfOfTheNextAttempt() {
        consumer.consume(event(BOOKING_READY, 1, "IN_PROGRESS", 2));
        Delivery ready = delivery(Delivery.Type.READY);
        doReturn(new EmailTransport.Result(TRANSIENT_FAILURE, "SMTP_TEMPORARY")).when(transport).send(any());
        var previous = processor.start(candidate(ready)).orElseThrow();
        processor.deliver(previous);

        when(clock.instant()).thenReturn(NOW.plusSeconds(60));
        var next = processor.start(candidate(ready)).orElseThrow();
        processor.deliver(previous);
        assertThat(delivery(Delivery.Type.READY).status()).isEqualTo(SENDING);
        assertThat(captures(ready)).isEmpty();
        doCallRealMethod().when(transport).send(any());
        processor.deliver(next);
        assertThat(delivery(Delivery.Type.READY).status()).isEqualTo(SENT);
        assertThat(captures(ready)).hasSize(1);
    }

    @Test
    void bookingWithoutAuthTutorIsAcknowledgableWithoutQueuingMail() {
        var event = new BookingEvent(UUID.randomUUID(), BOOKING_READY, 1, NOW, bookingId, 1,
                partnerId, null, LocalDateTime.ofInstant(NOW, BOOKING_ZONE), null, "IN_PROGRESS");
        consumer.consume(event);
        assertThat(store.list(bookingId, 0, 20)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_event WHERE id = ?",
                Integer.class, event.eventId())).isEqualTo(1);
    }

    private BookingEvent event(BookingEvent.Type type, long revision, String status, long hoursUntilBooking) {
        var date = LocalDateTime.ofInstant(NOW.plus(Duration.ofHours(hoursUntilBooking)), BOOKING_ZONE);
        return new BookingEvent(UUID.randomUUID(), type, 1, NOW, bookingId, revision, partnerId, userId, date,
                type == BOOKING_RESCHEDULED ? date.minusDays(1) : null, status);
    }

    private Delivery delivery(Delivery.Type type) {
        return store.list(bookingId, 0, 20).stream().filter(item -> item.type() == type).findFirst().orElseThrow();
    }

    private void dispatch(Delivery delivery) {
        processor.deliver(processor.start(candidate(delivery)).orElseThrow());
    }

    private NotificationStore.Candidate candidate(Delivery delivery) {
        return new NotificationStore.Candidate(delivery.id(), bookingId);
    }

    private List<String> captures(Delivery delivery) {
        return jdbc.queryForList("SELECT recipient FROM notification_local_mail WHERE delivery_id = ?",
                String.class, delivery.id());
    }
}
