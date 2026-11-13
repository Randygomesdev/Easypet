package br.com.easypet.booking.service;

import br.com.easypet.booking.client.PartnerServiceClient;
import br.com.easypet.booking.client.PetServiceClient;
import br.com.easypet.booking.client.dto.PartnerResponseDto;
import br.com.easypet.booking.client.dto.ServiceResponseDto;
import br.com.easypet.booking.client.dto.StaffResponseDto;
import br.com.easypet.booking.client.dto.StaffScheduleResponseDto;
import br.com.easypet.booking.domain.enums.BillingUnit;
import br.com.easypet.booking.domain.enums.BookingStatus;
import br.com.easypet.booking.domain.enums.BookingType;
import br.com.easypet.booking.dto.request.AgendaBlockRequest;
import br.com.easypet.booking.dto.request.BookingCheckIn;
import br.com.easypet.booking.dto.request.BookingRequest;
import br.com.easypet.booking.dto.request.FittingDecisionRequest;
import br.com.easypet.booking.dto.request.RescheduleRequest;
import br.com.easypet.booking.dto.response.BookingEvent;
import br.com.easypet.booking.dto.response.BookingResponse;
import br.com.easypet.booking.dto.response.PartnerBusinessHourIntegrationResponse;
import br.com.easypet.booking.exception.BookingConflictException;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.repository.BookingAgendaStore;
import br.com.easypet.booking.security.BookingSession;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=${S03_POSTGRES_URL}",
        "spring.datasource.username=${S03_POSTGRES_USER:booking_s03}",
        "spring.datasource.password=${S03_POSTGRES_PASSWORD:booking_s03_local}",
        "app.booking-outbox-token=local-test-only-booking-outbox-token"
})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "S03_POSTGRES_URL", matches = "jdbc:postgresql:.*")
class BookingAgendaPostgresTest {
    private static final String INTERNAL_TOKEN = "Bearer local-test-only-booking-outbox-token";
    private static final String INTERNAL_EVENTS = "/internal/booking-events";

    @Autowired BookingService booking;
    @Autowired BookingAgendaStore agenda;
    @Autowired MockMvc http;
    @Autowired Clock clock;
    @Autowired JdbcTemplate jdbc;

    @MockitoBean PartnerServiceClient partners;
    @MockitoBean PetServiceClient pets;

    private final UUID partnerId = UUID.randomUUID();
    private final UUID tutorId = UUID.randomUUID();
    private final UUID operatorId = UUID.randomUUID();
    private final UUID petId = UUID.randomUUID();
    private final UUID staffId = UUID.randomUUID();
    private final UUID serviceId = UUID.randomUUID();
    private final UUID boardingId = UUID.randomUUID();
    private LocalDateTime date;

    @BeforeEach
    void configurePartner() {
        date = LocalDateTime.now(clock).toLocalDate().plusDays(3).atTime(10, 0);
        when(pets.getAccessiblePetOwner(petId)).thenReturn(tutorId);
        when(partners.getCurrentPartnerId()).thenReturn(partnerId);
        var grooming = new ServiceResponseDto(serviceId, "Banho", BigDecimal.TEN, 60, null);
        var boarding = new ServiceResponseDto(boardingId, "Hospedagem", BigDecimal.TEN, null, BillingUnit.DAILY);
        var staff = new StaffResponseDto(staffId, partnerId, "Profissional", null, "ACTIVE", List.of(serviceId));
        when(partners.getStaffByPartnerId(partnerId, serviceId)).thenReturn(List.of(staff));
        when(partners.getStaffByPartnerId(partnerId, null)).thenReturn(List.of(staff));
        when(partners.getStaffSchedule(staffId)).thenReturn(Arrays.stream(DayOfWeek.values()).map(day ->
                new StaffScheduleResponseDto(UUID.randomUUID(), staffId, day.getValue() % 7 + 1,
                        LocalTime.of(8, 0), LocalTime.of(18, 0), LocalTime.of(12, 0), LocalTime.of(13, 0))).toList());
        var hours = Arrays.stream(DayOfWeek.values()).map(day ->
                new PartnerBusinessHourIntegrationResponse(day, "08:00", "18:00", null, null, false)).toList();
        when(partners.getOperations(partnerId))
                .thenReturn(new PartnerResponseDto(partnerId, "Teste", 1, hours, List.of(grooming, boarding), true));
        authenticate(tutorId, "CUSTOMER");
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void concurrentOverlappingAppointmentsReserveOneSpotEvenAtDifferentStartTimes() throws Exception {
        var results = race(
                () -> booking.createBooking(appointment(date, false), "first"),
                () -> booking.createBooking(appointment(date.plusMinutes(30), false), "second"));
        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(events()).extracting(BookingEvent::eventType).containsExactly("BOOKING_CREATED");
    }

    @Test
    void concurrentBoardingRespectsCapacityAndAllowsAdjacentStays() throws Exception {
        var results = race(
                () -> booking.createBooking(boarding(date, date.plusDays(2))),
                () -> booking.createBooking(boarding(date, date.plusDays(2))));
        assertThat(results).containsExactlyInAnyOrder(true, false);
        booking.createBooking(boarding(date.plusDays(2), date.plusDays(3)));
        assertThat(events()).hasSize(2);
    }

    @Test
    void concurrentIdenticalRequestsReturnSameIdAndBodyChangeConflicts() throws Exception {
        var request = appointment(date, false);
        List<UUID> ids = parallel(() -> booking.createBooking(request, "same-attempt").id(),
                () -> booking.createBooking(request, "same-attempt").id());
        assertThat(ids.get(0)).isEqualTo(ids.get(1));
        assertThat(events()).hasSize(1);
        assertThrows(BookingConflictException.class,
                () -> booking.createBooking(appointment(date.plusHours(2), false), "same-attempt"));
    }

    @Test
    void legacyIntervalStillConflictsWithDifferentStartAndAdjacentSlotIsAvailable() {
        UUID legacyId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO bookings (id, pet_id, partner_id, user_id, booking_date, type, status, price, service_id, staff_id)
                VALUES (?, ?, ?, ?, ?, 'GROOMING', 'CONFIRMED', 10, ?, ?)
                """, legacyId, petId, partnerId, tutorId, date, serviceId, staffId);
        assertThrows(BookingConflictException.class, () -> booking.createBooking(appointment(date.plusMinutes(30), false)));
        assertThat(booking.getAvailability(partnerId, serviceId, date.toLocalDate(), null))
                .filteredOn(slot -> slot.time().equals("10:30") || slot.time().equals("11:00"))
                .extracting("available").containsExactly(false, true);
        booking.createBooking(appointment(date.plusHours(1), false));
    }

    @Test
    void conflictingRescheduleRetainsOriginalAndSuccessfulRetryRecordsOneChange() {
        var original = booking.createBooking(appointment(date, false));
        booking.createBooking(appointment(date.plusHours(1), false));
        assertThrows(BookingConflictException.class,
                () -> booking.reschedule(original.id(), move(date.plusMinutes(30))));
        assertThat(booking.getBookingById(original.id()).bookingDate()).isEqualTo(date);
        assertThat(booking.history(original.id())).extracting("action").containsExactly("CREATED");
        assertThat(events()).hasSize(2);

        var next = date.plusDays(1);
        assertThat(booking.reschedule(original.id(), move(next)).bookingDate()).isEqualTo(next);
        booking.reschedule(original.id(), move(next));
        assertThat(booking.history(original.id())).filteredOn(entry -> entry.action().equals("RESCHEDULED")).singleElement().satisfies(entry -> {
            assertThat(entry.previousBookingDate()).isEqualTo(date);
            assertThat(entry.bookingDate()).isEqualTo(next);
        });
        assertThat(events().getLast()).satisfies(event -> {
            assertThat(event.eventType()).isEqualTo("BOOKING_RESCHEDULED");
            assertThat(event.bookingVersion()).isEqualTo(2);
            assertThat(event.previousBookingDate()).isEqualTo(date);
        });
    }

    @Test
    void fittingCannotConsumeAnOccupiedSlotAndCanBeApprovedAfterCancellation() {
        var original = booking.createBooking(appointment(date, false));
        var fitting = booking.createBooking(appointment(date.plusMinutes(30), true));
        assertThat(fitting.isFittingRequest()).isTrue();
        authenticate(operatorId, "PARTNER");
        assertThrows(BookingConflictException.class,
                () -> booking.processFittingDecision(fitting.id(), new FittingDecisionRequest("APPROVE")));
        assertThat(booking.getBookingById(fitting.id()).status()).isEqualTo(BookingStatus.PENDING);
        booking.updateStatus(original.id(), BookingStatus.CANCELLED, "Tutor solicitou");
        booking.processFittingDecision(fitting.id(), new FittingDecisionRequest("APPROVE"));
        assertThat(booking.getBookingById(original.id()).cancellationReason()).isEqualTo("Tutor solicitou");
        assertThat(booking.getBookingById(fitting.id()).status()).isEqualTo(BookingStatus.CONFIRMED);
        authenticate(tutorId, "CUSTOMER");
        assertThrows(BookingConflictException.class, () -> booking.createBooking(appointment(date, false)));
    }

    @Test
    void blockRejectsExistingReservationAndPreventsNewAllocationUntilRemoved() {
        var original = booking.createBooking(appointment(date, false));
        authenticate(operatorId, "PARTNER");
        booking.updateStatus(original.id(), BookingStatus.CONFIRMED);
        assertThrows(BookingConflictException.class, () -> booking.createBlock(partnerId,
                new AgendaBlockRequest(date.plusMinutes(15), date.plusHours(1), staffId, "Manutenção")));
        assertThat(booking.getBookingById(original.id()).status()).isEqualTo(BookingStatus.CONFIRMED);

        var next = date.plusDays(1);
        var block = booking.createBlock(partnerId, new AgendaBlockRequest(next, next.plusHours(1), null, "Manutenção"));
        assertThrows(BookingConflictException.class, () -> booking.reschedule(original.id(), move(next)));
        assertThat(booking.getAvailability(partnerId, serviceId, next.toLocalDate(), null))
                .filteredOn(slot -> slot.time().equals("10:00"))
                .singleElement().satisfies(slot -> {
                    assertThat(slot.reason()).isEqualTo("BLOCKED_EXCEPTION");
                    assertThat(slot.allowFittingRequest()).isFalse();
                });
        booking.deleteBlock(partnerId, block.id());
        assertThat(booking.reschedule(original.id(), move(next)).bookingDate()).isEqualTo(next);
    }

    @Test
    void cancellationNoShowAndReadyKeepHistoryAndOutboxStable() throws Exception {
        var first = booking.createBooking(appointment(date, false));
        var second = booking.createBooking(appointment(date.plusDays(1), false));
        authenticate(operatorId, "PARTNER");
        booking.updateStatus(first.id(), BookingStatus.CONFIRMED);
        booking.updateStatus(first.id(), BookingStatus.IN_PROGRESS);
        booking.saveCheckIn(first.id(), new BookingCheckIn(true, true, "Shampoo específico", null, null, null));
        var ready = booking.markReady(first.id());
        assertThat(ready.readyAt()).isNotNull();
        assertThat(booking.markReady(first.id()).readyAt()).isEqualTo(ready.readyAt());

        booking.updateStatus(second.id(), BookingStatus.CONFIRMED);
        jdbc.update("UPDATE bookings SET booking_date = ?, scheduled_end = ? WHERE id = ?",
                date.minusDays(5), date.minusDays(5).plusHours(1), second.id());
        booking.updateStatus(second.id(), BookingStatus.NO_SHOW, "Sem comparecimento");
        assertThat(booking.history(second.id()).getLast().reason()).isEqualTo("Sem comparecimento");
        assertThat(events()).extracting(BookingEvent::eventType).containsExactly(
                "BOOKING_CREATED", "BOOKING_CREATED", "BOOKING_CONFIRMED", "BOOKING_READY", "BOOKING_CONFIRMED", "BOOKING_NO_SHOW");

        var pending = events().getFirst();
        http.perform(get(INTERNAL_EVENTS)).andExpect(status().isUnauthorized());
        http.perform(get(INTERNAL_EVENTS).header("Authorization", INTERNAL_TOKEN).param("limit", "0"))
                .andExpect(status().isBadRequest());
        http.perform(get(INTERNAL_EVENTS).header("Authorization", INTERNAL_TOKEN))
                .andExpect(status().isOk());
        var ack = post(INTERNAL_EVENTS + "/" + pending.eventId() + "/ack").header("Authorization", INTERNAL_TOKEN);
        http.perform(ack).andExpect(status().isNoContent());
        http.perform(ack).andExpect(status().isNoContent());
        assertThat(events()).doesNotContain(pending);
    }

    @Test
    void anotherPartnerCannotChangeReadHistoryOrClaimAvailabilityExclusion() {
        var original = booking.createBooking(appointment(date, false));
        authenticate(UUID.randomUUID(), "PARTNER");
        when(partners.getCurrentPartnerId()).thenReturn(UUID.randomUUID());
        assertThrows(ResourceNotFoundException.class, () -> booking.reschedule(original.id(), move(date.plusDays(1))));
        assertThrows(ResourceNotFoundException.class, () -> booking.history(original.id()));
        assertThrows(ResourceNotFoundException.class,
                () -> booking.getAvailability(partnerId, serviceId, date.toLocalDate(), original.id()));
    }

    @Test
    void receptionBookingUsesVerifiedCustomerAndNeverAppearsAsAnAuthTutorsBooking() {
        UUID customerId = UUID.randomUUID();
        var request = new BookingRequest(petId, partnerId, date, BookingType.GROOMING, null,
                BigDecimal.TEN, null, null, serviceId, null, null, staffId, false, customerId);
        assertThrows(AccessDeniedException.class, () -> booking.createBooking(request, "reception"));

        authenticate(operatorId, "PARTNER");
        doThrow(new ResourceNotFoundException("Pet sem vínculo"))
                .when(pets).requireReceptionPet(partnerId, customerId, petId);
        assertThrows(ResourceNotFoundException.class, () -> booking.createBooking(request, "reception"));
        org.mockito.Mockito.doNothing().when(pets).requireReceptionPet(partnerId, customerId, petId);
        var created = booking.createBooking(request, "reception");
        assertThat(created.userId()).isNull();
        assertThat(created.receptionCustomerId()).isEqualTo(customerId);
        assertThat(booking.createBooking(request, "reception").id()).isEqualTo(created.id());
        booking.updateStatus(created.id(), BookingStatus.CONFIRMED);
        assertThat(booking.history(created.id())).hasSize(2);
        assertThat(events()).isEmpty();

        authenticate(tutorId, "CUSTOMER");
        assertThrows(ResourceNotFoundException.class, () -> booking.getBookingById(created.id()));
    }

    private BookingRequest appointment(LocalDateTime start, boolean fitting) {
        return new BookingRequest(petId, partnerId, start, BookingType.GROOMING, null,
                BigDecimal.TEN, null, null, serviceId, null, null, staffId, fitting);
    }

    private BookingRequest boarding(LocalDateTime start, LocalDateTime end) {
        return new BookingRequest(petId, partnerId, null, BookingType.BOARDING, null,
                BigDecimal.TEN.multiply(BigDecimal.valueOf(Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(
                        start.toLocalDate(), end.toLocalDate())))), start, end, boardingId, null, null, null, null);
    }

    private RescheduleRequest move(LocalDateTime start) {
        return new RescheduleRequest(start, null, null, staffId);
    }

    private List<BookingEvent> events() {
        return agenda.pendingEvents(100).stream().filter(event -> event.partnerId().equals(partnerId)).toList();
    }

    private List<Boolean> race(Callable<BookingResponse> first, Callable<BookingResponse> second) throws Exception {
        return parallel(() -> reserve(first), () -> reserve(second));
    }

    private boolean reserve(Callable<BookingResponse> create) throws Exception {
        try {
            create.call();
            return true;
        } catch (BookingConflictException occupied) {
            return false;
        }
    }

    private <T> List<T> parallel(Callable<T> first, Callable<T> second) throws Exception {
        var start = new CyclicBarrier(2);
        try (var threads = Executors.newFixedThreadPool(2)) {
            Future<T> a = threads.submit(() -> authenticatedCall(first, start));
            Future<T> b = threads.submit(() -> authenticatedCall(second, start));
            return List.of(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS));
        }
    }

    private <T> T authenticatedCall(Callable<T> action, CyclicBarrier start) throws Exception {
        authenticate(tutorId, "CUSTOMER");
        try {
            start.await(5, TimeUnit.SECONDS);
            return action.call();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate(UUID userId, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new BookingSession(userId, role, null, null, List.of(), null), null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
