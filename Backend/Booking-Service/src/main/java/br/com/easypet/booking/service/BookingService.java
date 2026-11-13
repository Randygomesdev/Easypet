package br.com.easypet.booking.service;

import org.springframework.beans.factory.annotation.Value;

import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.domain.enums.BookingStatus;
import br.com.easypet.booking.domain.enums.BookingType;
import br.com.easypet.booking.dto.request.AgendaBlockRequest;
import br.com.easypet.booking.dto.request.BookingCheckIn;
import br.com.easypet.booking.dto.request.RescheduleRequest;
import br.com.easypet.booking.dto.response.AgendaBlock;
import br.com.easypet.booking.dto.response.BookingAccessResponse;
import br.com.easypet.booking.dto.response.BookingPartnerSummary;
import br.com.easypet.booking.dto.response.BookingPetSummary;
import br.com.easypet.booking.dto.response.BookingPolicyResponse;
import br.com.easypet.booking.dto.response.TutorBookingActions;
import br.com.easypet.booking.dto.response.BookingHistoryEntry;
import br.com.easypet.booking.exception.BookingConflictException;
import br.com.easypet.booking.repository.BookingAgendaStore;
import br.com.easypet.booking.repository.BookingAgendaStore.EventType;
import br.com.easypet.booking.repository.BookingAgendaStore.Snapshot;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.access.AccessDeniedException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Objects;
import java.util.Optional;
import br.com.easypet.booking.dto.request.BookingRequest;
import br.com.easypet.booking.dto.request.FittingDecisionRequest;
import br.com.easypet.booking.dto.response.BookingResponse;
import br.com.easypet.booking.dto.response.FittingDecisionResponse;
import br.com.easypet.booking.mapper.BookingMapper;
import br.com.easypet.booking.repository.BookingRepository;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.exception.BusinessException;
import br.com.easypet.booking.dto.response.AvailabilitySlot;
import br.com.easypet.booking.client.PaymentServiceClient;
import br.com.easypet.booking.client.PetServiceClient;
import br.com.easypet.booking.client.dto.CreditConsumeResponse;
import br.com.easypet.booking.domain.enums.PaymentMethod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.easypet.booking.dto.response.ClientStatsResponse;
import br.com.easypet.booking.dto.response.DailyStatsEntry;
import br.com.easypet.booking.dto.response.RevenueStatsResponse;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingMapper bookingMapper;
    private final PaymentServiceClient paymentServiceClient;
    private final PetServiceClient petServiceClient;
    private final BookingSchedule schedule;
    private final BookingAgendaStore agenda;
    private final ObjectMapper objectMapper;
    private final Clock bookingClock;
    private final BookingAuthorization authorization;

    @Value("${app.booking-tutor-notice-minutes:120}")
    private long tutorNoticeMinutes = 120;

    @Value("${app.package-credits-enabled:false}")
    private boolean packageCreditsEnabled;

    @Transactional(readOnly = true)
    public BookingPolicyResponse policy() {
        return new BookingPolicyResponse(tutorNoticeMinutes, BookingSchedule.DEFAULT_DURATION_MINUTES);
    }

    @Transactional(readOnly = true)
    public TutorBookingActions tutorActions(UUID id) {
        authorization.requireTutor();
        Booking booking = findBookingOrThrow(id);
        authorization.requireBookingRead(booking);
        boolean editable = (booking.getStatus() == BookingStatus.PENDING || booking.getStatus() == BookingStatus.CONFIRMED)
                && meetsTutorNotice(booking);
        boolean canReschedule = editable;
        if (editable) {
            try {
                schedule.requireActivePartner(booking.getPartnerId());
            } catch (ResourceNotFoundException unavailable) {
                canReschedule = false;
            }
        }
        return new TutorBookingActions(editable, canReschedule, tutorNoticeMinutes);
    }

    public BookingResponse createBooking(BookingRequest request) {
        return createBooking(request, null);
    }

    public BookingResponse createBooking(BookingRequest request, String key) {
        authorization.requireCreate(request.partnerId(), request.receptionCustomerId() != null);
        UUID actorId = getCurrentUserId();
        agenda.lockPartner(request.partnerId());
        String hash = key == null ? null : requestHash(request, key);
        if (key != null) {
            var previous = agenda.findRequest(request.partnerId(), actorId, key);
            if (previous.isPresent()) {
                if (!previous.get().requestHash().equals(hash)) {
                    throw new BookingConflictException("A chave de idempotência já foi usada com outros dados.");
                }
                Booking existing = findBookingOrThrow(previous.get().bookingId());
                if (authorization.tutor()) authorization.requireBookingRead(existing);
                return bookingMapper.toResponse(existing);
            }
        }

        validatePaymentMethod(request.paymentMethod());
        Booking booking = bookingMapper.toEntity(request);
        if (request.receptionCustomerId() == null) {
            UUID owner = petServiceClient.getAccessiblePetOwner(request.petId());
            if (authorization.tutor() && !actorId.equals(owner)) {
                throw new ResourceNotFoundException("Pet não encontrado ou acesso negado.");
            }
            booking.setUserId(owner);
        } else {
            if (request.paymentMethod() == PaymentMethod.PACKAGE_CREDIT) {
                throw new BusinessException("Reservas de balcão sem conta não aceitam créditos de pacote.");
            }
            authorization.requireActiveDesk(request.partnerId());
            petServiceClient.requireReceptionPet(request.partnerId(), request.receptionCustomerId(), request.petId());
            booking.setReceptionCustomerId(request.receptionCustomerId());
        }
        booking.setStatus(BookingStatus.PENDING);
        booking.setPaymentMethod(request.paymentMethod() == null ? PaymentMethod.CARD : request.paymentMethod());

        RescheduleRequest dates = new RescheduleRequest(request.bookingDate(), request.checkIn(), request.checkOut(), request.staffId());
        BookingSchedule.Allocation allocation = allocate(request.partnerId(), request.serviceId(), request.type(), dates,
                null, Boolean.TRUE.equals(request.requestFitting()));
        if (request.paymentMethod() != PaymentMethod.PACKAGE_CREDIT) {
            BigDecimal displayedPrice = request.price().setScale(2, java.math.RoundingMode.HALF_UP);
            if (displayedPrice.compareTo(allocation.price()) != 0) {
                throw new BookingConflictException("O preço do serviço mudou. Atualize os dados do estabelecimento e confira o valor antes de reservar.", "price");
            }
            booking.setPrice(allocation.price());
        }
        applyAllocation(booking, allocation);
        UUID consumedPackageId = null;
        try {
            if (request.paymentMethod() == PaymentMethod.PACKAGE_CREDIT) {
                if (allocation.fitting()) {
                    throw new BusinessException("Créditos de pacote exigem uma vaga disponível.");
                }
                CreditConsumeResponse credit = paymentServiceClient.consumeCredit(actorId, request.partnerId(), request.serviceId());
                if (credit == null || !credit.success()) {
                    throw new BusinessException("Não foi possível debitar os créditos do seu pacote. Verifique seu saldo.");
                }
                consumedPackageId = credit.customerPackageId();
                booking.setCustomerPackageId(consumedPackageId);
                booking.setStatus(BookingStatus.CONFIRMED);
                booking.setPrice(BigDecimal.ZERO);
            }
            Booking saved = bookingRepository.saveAndFlush(booking);
            agenda.addHistory(saved, actorId, "CREATED", new Snapshot(null, null, null, null), null);
            if (saved.getUserId() != null) {
                agenda.addEvent(saved, EventType.BOOKING_CREATED, null);
            }
            if (saved.getStatus() == BookingStatus.CONFIRMED) {
                agenda.addEvent(saved, EventType.BOOKING_CONFIRMED, null);
            }
            if (key != null) {
                agenda.saveRequest(request.partnerId(), actorId, key, hash, saved.getId());
            }
            return bookingMapper.toResponse(saved);
        } catch (RuntimeException ex) {
            if (consumedPackageId != null) {
                paymentServiceClient.restorePackageCredit(consumedPackageId);
            }
            throw ex;
        }
    }

    private String requestHash(BookingRequest request, String key) {
        if (!key.matches("[!-~]{1,128}")) {
            throw new BusinessException("Chave de idempotência inválida.");
        }
        try {
            byte[] body = objectMapper.writeValueAsBytes(request);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body));
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new IllegalStateException("Não foi possível identificar a solicitação.", e);
        }
    }

    private BookingSchedule.Allocation allocate(UUID partnerId, UUID serviceId, BookingType type, RescheduleRequest request,
                                                UUID excludedId, boolean fitting) {
        return type == BookingType.BOARDING
                ? schedule.boarding(partnerId, serviceId, request.checkIn(), request.checkOut(), excludedId)
                : schedule.appointment(partnerId, serviceId, request.bookingDate(), request.staffId(), excludedId, fitting, false, null);
    }

    private void applyAllocation(Booking booking, BookingSchedule.Allocation allocation) {
        booking.setBookingDate(allocation.start());
        booking.setScheduledEnd(allocation.end());
        booking.setStaffId(allocation.staffId());
        booking.setIsFittingRequest(allocation.fitting());
        if (booking.getType() == BookingType.BOARDING) {
            booking.setCheckIn(allocation.start());
            booking.setCheckOut(allocation.end());
            if (booking.getPaymentMethod() != PaymentMethod.PACKAGE_CREDIT) {
                booking.setPrice(allocation.price());
            }
        } else {
            booking.setCheckIn(null);
            booking.setCheckOut(null);
        }
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID id) {
        log.info("Buscando agendamento por ID: {}", id);
        Booking booking = findBookingOrThrow(id);
        authorization.requireBookingRead(booking);
        return bookingMapper.toResponse(booking);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyBookings(BookingStatus status, Pageable pageable) {
        authorization.requireTutor();
        UUID userId = getCurrentUserId();
        var claims = authorization.customerClaims();
        Specification<Booking> scope = (root, query, cb) -> {
            List<Predicate> sources = new ArrayList<>();
            sources.add(cb.equal(root.get("userId"), userId));
            for (var claim : claims) {
                sources.add(cb.and(cb.equal(root.get("receptionCustomerId"), claim.customerId()),
                        cb.equal(root.get("partnerId"), claim.partnerId())));
            }
            return cb.or(sources.toArray(Predicate[]::new));
        };
        if (status != null) scope = scope.and((root, query, cb) -> cb.equal(root.get("status"), status));
        return bookingRepository.findAll(scope, pageable).map(bookingMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public BookingAccessResponse getAgendaAccess() {
        return authorization.agendaAccess(authorization.currentPartner());
    }

    @Transactional(readOnly = true)
    public BookingAccessResponse getAgendaAccess(UUID partnerId) {
        return authorization.agendaAccess(partnerId);
    }

    @Transactional(readOnly = true)
    public BookingPetSummary getPetSummary(UUID id) {
        Booking booking = findBookingOrThrow(id);
        authorization.requireBookingRead(booking);
        return petServiceClient.getBookingSummary(booking);
    }

    @Transactional(readOnly = true)
    public BookingPartnerSummary getPartnerSummary(UUID partnerId) {
        authorization.agendaAccess(partnerId);
        return schedule.partnerSummary(partnerId);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getBookingsByPartnerId(UUID partnerId, Pageable pageable) {
        return getBookingsByPartnerId(partnerId, null, null, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getBookingsByPartnerId(UUID partnerId, LocalDate date, UUID staffId, Pageable pageable) {
        return getBookingsByPartnerId(partnerId, date, staffId, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getBookingsByPartnerId(
            UUID partnerId, LocalDate date, UUID staffId,
            BookingStatus status, br.com.easypet.booking.domain.enums.BookingType type,
            LocalDate startDate, LocalDate endDate, Pageable pageable) {
        UUID assigned = authorization.agendaAccess(partnerId).staffId();
        if (assigned != null && staffId != null && !assigned.equals(staffId)) {
            throw new ResourceNotFoundException("Profissional não encontrado.");
        }
        UUID effectiveStaff = assigned == null ? staffId : assigned;
        log.info("Buscando agendamentos do parceiro {}, date: {}, staffId: {}, status: {}, type: {}", partnerId, date, staffId, status, type);

        LocalDateTime start = startDate != null ? startDate.atStartOfDay()
                : date != null ? date.atStartOfDay() : null;
        LocalDateTime end = endDate != null ? endDate.atTime(LocalTime.MAX)
                : date != null ? date.atTime(LocalTime.MAX) : null;

        final LocalDateTime effectiveStart = start;
        final LocalDateTime effectiveEnd   = end;

        Specification<Booking> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("partnerId"), partnerId));
            if (effectiveStaff != null) predicates.add(cb.equal(root.get("staffId"), effectiveStaff));
            if (status         != null) predicates.add(cb.equal(root.get("status"),     status));
            if (type           != null) predicates.add(cb.equal(root.get("type"),       type));
            if (effectiveStart != null) predicates.add(cb.greaterThanOrEqualTo(root.get("bookingDate"), effectiveStart));
            if (effectiveEnd   != null) predicates.add(cb.lessThanOrEqualTo(root.get("bookingDate"),   effectiveEnd));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return bookingRepository.findAll(spec, pageable).map(bookingMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getBookingsByPetId(UUID petId, Pageable pageable) {
        log.info("Buscando agendamentos do pet {}", petId);
        if (authorization.admin()) return bookingRepository.findByPetId(petId, pageable).map(bookingMapper::toResponse);
        UUID partnerId = authorization.currentPartner();
        UUID assigned = authorization.agendaAccess(partnerId).staffId();
        Page<Booking> bookings = assigned == null
                ? bookingRepository.findByPetIdAndPartnerId(petId, partnerId, pageable)
                : bookingRepository.findByPetIdAndPartnerIdAndStaffId(petId, partnerId, assigned, pageable);
        return bookings.map(bookingMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public boolean hasPetAccess(UUID petId, UUID ownerId) {
        UUID partnerId = authorization.currentPartner();
        UUID assigned = authorization.agendaAccess(partnerId).staffId();
        return assigned == null
                ? bookingRepository.existsByPetIdAndUserIdAndPartnerIdAndStatusNot(petId, ownerId, partnerId, BookingStatus.CANCELLED)
                : bookingRepository.existsByPetIdAndUserIdAndPartnerIdAndStaffIdAndStatusNot(
                        petId, ownerId, partnerId, assigned, BookingStatus.CANCELLED);
    }

    public BookingResponse updateBooking(UUID id, BookingRequest request) {
        validatePaymentMethod(request.paymentMethod());
        Booking booking = findForAllocationUpdate(id);
        requireEditable(booking);
        if (!booking.getPetId().equals(request.petId()) || !booking.getPartnerId().equals(request.partnerId())) {
            throw new BusinessException("Não é possível trocar o pet ou o estabelecimento de um agendamento.");
        }
        if (request.receptionCustomerId() != null && !request.receptionCustomerId().equals(booking.getReceptionCustomerId())) {
            throw new BusinessException("Não é possível trocar o cliente de balcão de um agendamento.");
        }
        if (booking.getType() != request.type() || !Objects.equals(booking.getServiceId(), request.serviceId())) {
            throw new BusinessException("Não é possível trocar o serviço de um agendamento.");
        }
        RescheduleRequest dates = new RescheduleRequest(
                request.type() == BookingType.BOARDING ? null : request.bookingDate(),
                request.checkIn(), request.checkOut(), request.staffId());
        changeAllocation(booking, dates);
        booking.setNotes(request.notes());
        return bookingMapper.toResponse(bookingRepository.saveAndFlush(booking));
    }

    public BookingResponse reschedule(UUID id, RescheduleRequest request) {
        Booking booking = findForAllocationUpdate(id);
        requireEditable(booking);
        changeAllocation(booking, request);
        return bookingMapper.toResponse(bookingRepository.saveAndFlush(booking));
    }

    private void changeAllocation(Booking booking, RescheduleRequest request) {
        boolean boarding = booking.getType() == BookingType.BOARDING;
        if ((boarding && (request.bookingDate() != null || request.staffId() != null))
                || (!boarding && (request.checkIn() != null || request.checkOut() != null))) {
            throw new BusinessException("As datas informadas não correspondem ao tipo de agendamento.");
        }
        UUID staff = request.staffId() == null ? booking.getStaffId() : request.staffId();
        if (boarding ? Objects.equals(booking.getCheckIn(), request.checkIn()) && Objects.equals(booking.getCheckOut(), request.checkOut())
                : Objects.equals(booking.getBookingDate(), request.bookingDate()) && Objects.equals(booking.getStaffId(), staff)) {
            return;
        }
        requireTutorNotice(booking, "Reagendamentos");
        var before = Snapshot.of(booking);
        var dates = new RescheduleRequest(request.bookingDate(), request.checkIn(), request.checkOut(), staff);
        applyAllocation(booking, allocate(booking.getPartnerId(), booking.getServiceId(), booking.getType(), dates,
                booking.getId(), false));
        recordChange(booking, "RESCHEDULED", before, null, EventType.BOOKING_RESCHEDULED);
    }

    private void requireEditable(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessException("Somente reservas pendentes ou confirmadas podem ser alteradas.");
        }
    }

    private void validatePaymentMethod(PaymentMethod paymentMethod) {
        if (!packageCreditsEnabled && paymentMethod == PaymentMethod.PACKAGE_CREDIT) {
            throw new BusinessException("O uso de créditos de pacote está indisponível neste ambiente.");
        }
    }

    public BookingResponse updateStatus(UUID id, BookingStatus status) {
        return updateStatus(id, status, null);
    }

    public BookingResponse updateStatus(UUID id, BookingStatus status, String reason) {
        Booking booking;
        switch (status) {
            case IN_PROGRESS, COMPLETED -> booking = findForAttendance(id);
            case CONFIRMED -> {
                authorization.requireManagement();
                booking = findForAllocationUpdate(id);
            }
            case CANCELLED -> booking = findForWrite(id);
            default -> {
                authorization.requireManagement();
                booking = findForWrite(id);
            }
        }
        if (booking.getStatus() == status) {
            return bookingMapper.toResponse(booking);
        }
        if (status == BookingStatus.CONFIRMED && Boolean.TRUE.equals(booking.getIsFittingRequest())) {
            approveFitting(booking);
        } else {
            transition(booking, status, reason);
        }
        return bookingMapper.toResponse(bookingRepository.saveAndFlush(booking));
    }

    public BookingResponse updateAdminStatus(UUID partnerId, UUID bookingId, BookingStatus status, String reason) {
        requireAdminBooking(partnerId, bookingId);
        return updateStatus(bookingId, status, reason);
    }

    private void requireAdminBooking(UUID partnerId, UUID bookingId) {
        if (!authorization.admin()) throw new AccessDeniedException("Operação exclusiva da administração.");
        UUID actual = bookingRepository.findPartnerIdByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado."));
        if (!partnerId.equals(actual)) throw new ResourceNotFoundException("Agendamento não encontrado neste estabelecimento.");
    }

    private void transition(Booking booking, BookingStatus status, String reason) {
        BookingStatus current = booking.getStatus();
        if (!current.canTransitionTo(status)) {
            throw new BusinessException("Não é possível mudar o status do agendamento de " + current + " para " + status + ".");
        }
        var before = Snapshot.of(booking);
        if (status == BookingStatus.CANCELLED) {
            requireTutorNotice(booking, "Cancelamentos");
            reason = normalizedReason(reason, "Cancelamento solicitado");
            booking.setCancellationReason(reason);
        }
        if (status == BookingStatus.NO_SHOW) {
            if (booking.getBookingDate().isAfter(LocalDateTime.now(bookingClock))) {
                throw new BusinessException("A falta pode ser registrada a partir do horário da reserva.");
            }
            reason = normalizedReason(reason, "Tutor não compareceu");
            booking.setNoShowReason(reason);
        }
        booking.setStatus(status);
        EventType event = switch (status) {
            case CONFIRMED -> EventType.BOOKING_CONFIRMED;
            case CANCELLED -> EventType.BOOKING_CANCELLED;
            case NO_SHOW -> EventType.BOOKING_NO_SHOW;
            default -> null;
        };
        recordChange(booking, status.name(), before, reason, event);
    }

    private String normalizedReason(String reason, String fallback) {
        return reason == null || reason.isBlank() ? fallback : reason.strip();
    }

    private void requireTutorNotice(Booking booking, String action) {
        if (authorization.tutor() && !meetsTutorNotice(booking)) {
            String notice = tutorNoticeMinutes == 120 ? "2 horas" : tutorNoticeMinutes + " minutos";
            throw new BusinessException(action + " devem ser feitos com pelo menos " + notice + " de antecedência.");
        }
    }

    private boolean meetsTutorNotice(Booking booking) {
        return !booking.getBookingDate().isBefore(LocalDateTime.now(bookingClock).plusMinutes(tutorNoticeMinutes));
    }

    public void deleteBooking(UUID id) {
        Booking booking = findForWrite(id);
        if (booking.getStatus() == BookingStatus.IN_PROGRESS) {
            throw new BusinessException("Finalize o atendimento antes de excluir a reserva.");
        }
        if (booking.getStatus().canTransitionTo(BookingStatus.CANCELLED)) {
            transition(booking, BookingStatus.CANCELLED, "Agendamento excluído");
            bookingRepository.flush();
        }
        bookingRepository.delete(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingHistoryEntry> history(UUID id) {
        authorization.requireBookingRead(findBookingOrThrow(id));
        return agenda.findHistory(id);
    }

    @Transactional(readOnly = true)
    public List<AgendaBlock> listBlocks(UUID partnerId, LocalDateTime start, LocalDateTime end) {
        authorization.requireFullReadAt(partnerId);
        if (start != null && end != null && !end.isAfter(start)) {
            throw new BusinessException("O fim do período deve ser posterior ao início.");
        }
        return agenda.findBlocks(partnerId, start, end);
    }

    public AgendaBlock createBlock(UUID partnerId, AgendaBlockRequest input) {
        authorization.requireManagementAt(partnerId);
        agenda.lockPartner(partnerId);
        schedule.verifyBlock(partnerId, input.staffId(), input.start(), input.end());
        AgendaBlock block = new AgendaBlock(UUID.randomUUID(), partnerId, input.staffId(), input.start(),
                input.end(), input.reason().strip());
        agenda.saveBlock(block, getCurrentUserId());
        return block;
    }

    public void deleteBlock(UUID partnerId, UUID blockId) {
        authorization.requireManagementAt(partnerId);
        agenda.lockPartner(partnerId);
        agenda.deleteBlock(partnerId, blockId);
    }

    @Transactional(readOnly = true)
    public Optional<BookingCheckIn> getCheckIn(UUID id) {
        Booking booking = findBookingOrThrow(id);
        if (authorization.tutor()) throw new AccessDeniedException("Operação exclusiva do estabelecimento.");
        authorization.requireBookingRead(booking);
        requireGrooming(booking);
        return agenda.findCheckIn(id);
    }

    public BookingCheckIn saveCheckIn(UUID id, BookingCheckIn input) {
        Booking booking = findForAttendance(id);
        requireGrooming(booking);
        if ((booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.IN_PROGRESS)
                || booking.getReadyAt() != null) {
            throw new BusinessException("O checklist só pode ser alterado durante a entrada ou o atendimento.");
        }
        String savedExtras = agenda.findCheckIn(id).map(BookingCheckIn::authorizedExtras).orElse(null);
        if (input.authorizedExtras() != null && !input.authorizedExtras().isBlank()
                && !Objects.equals(input.authorizedExtras(), savedExtras)) {
            throw new BusinessException("A autorização de adicionais não está disponível neste fluxo.");
        }
        var checkIn = new BookingCheckIn(input.petIdentified(), input.instructionsConfirmed(), input.allergies(),
                input.behavior(), savedExtras, input.observations());
        agenda.saveCheckIn(id, checkIn, getCurrentUserId());
        return checkIn;
    }

    public BookingResponse markReady(UUID id) {
        Booking booking = findForAttendance(id);
        requireGrooming(booking);
        if (booking.getReadyAt() != null) {
            return bookingMapper.toResponse(booking);
        }
        if (booking.getStatus() != BookingStatus.IN_PROGRESS || agenda.findCheckIn(id).isEmpty()) {
            throw new BusinessException("Registre a entrada e inicie o atendimento antes de marcar pronto para retirada.");
        }
        var before = Snapshot.of(booking);
        booking.setReadyAt(LocalDateTime.now(bookingClock).truncatedTo(ChronoUnit.MICROS));
        recordChange(booking, "READY", before, null, EventType.BOOKING_READY);
        return bookingMapper.toResponse(bookingRepository.saveAndFlush(booking));
    }

    private void requireGrooming(Booking booking) {
        if (booking.getType() != BookingType.GROOMING) {
            throw new BusinessException("Este fluxo está disponível para banho e tosa.");
        }
    }

    private void recordChange(Booking booking, String action, Snapshot before, String reason, EventType event) {
        agenda.addHistory(booking, getCurrentUserId(), action, before, reason);
        if (event != null && booking.getUserId() != null) {
            agenda.addEvent(booking, event, event == EventType.BOOKING_RESCHEDULED ? before.bookingDate() : null);
        }
    }

    // ─── Métodos auxiliares ───────────────────────────────────────────────────

    /**
     * Busca o agendamento pelo ID ou lança ResourceNotFoundException.
     */
    private Booking findBookingOrThrow(UUID id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Agendamento não encontrado com o ID: {}", id);
                    return new ResourceNotFoundException("Agendamento não encontrado com o ID: " + id);
                });
    }

    private Booking findForUpdate(UUID id) {
        return bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado com o ID: " + id));
    }

    private Booking findForWrite(UUID id) {
        Booking booking = findForUpdate(id);
        authorization.requireBookingWrite(booking);
        return booking;
    }

    private Booking findForAttendance(UUID id) {
        Booking booking = findForUpdate(id);
        authorization.requireAttendance(booking);
        return booking;
    }

    private Booking findForAllocationUpdate(UUID id) {
        UUID partnerId = bookingRepository.findPartnerIdByBookingId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado."));
        if (!authorization.tutor()) authorization.requireManagementAt(partnerId);
        agenda.lockPartner(partnerId);
        return findForWrite(id);
    }

    /**
     * Usa o autor individual da sessão validada.
     */
    private UUID getCurrentUserId() {
        return authorization.session().userId();
    }

    @Transactional(readOnly = true)
    public List<AvailabilitySlot> getAvailability(UUID partnerId, UUID serviceId, LocalDate date, UUID excludedId) {
        if (authorization.team()) authorization.requireManagementAt(partnerId);
        if (excludedId != null) {
            Booking booking = findBookingOrThrow(excludedId);
            authorization.requireBookingRead(booking);
            if (!booking.getPartnerId().equals(partnerId) || !Objects.equals(booking.getServiceId(), serviceId)) {
                throw new ResourceNotFoundException("Agendamento não encontrado.");
            }
        }
        return schedule.availability(partnerId, serviceId, date, excludedId);
    }

    public FittingDecisionResponse processFittingDecision(UUID bookingId, FittingDecisionRequest request) {
        authorization.requireManagement();
        Booking booking = findForAllocationUpdate(bookingId);
        if (!Boolean.TRUE.equals(booking.getIsFittingRequest()) || booking.getStatus() != BookingStatus.PENDING) {
            throw new BusinessException("A solicitação de encaixe já foi processada ou não está pendente.");
        }
        if ("APPROVE".equalsIgnoreCase(request.decision())) {
            approveFitting(booking);
        } else {
            transition(booking, BookingStatus.CANCELLED, "Solicitação de encaixe recusada");
        }
        Booking saved = bookingRepository.saveAndFlush(booking);
        return new FittingDecisionResponse(saved.getId(), saved.getStatus(), saved.getIsFittingRequest(),
                saved.getStaffId(), saved.getUpdatedAt());
    }

    public FittingDecisionResponse processAdminFittingDecision(UUID partnerId, UUID bookingId, FittingDecisionRequest request) {
        requireAdminBooking(partnerId, bookingId);
        return processFittingDecision(bookingId, request);
    }

    private void approveFitting(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BusinessException("Este encaixe já foi processado.");
        }
        var allocation = schedule.appointment(booking.getPartnerId(), booking.getServiceId(), booking.getBookingDate(),
                booking.getStaffId(), booking.getId(), false, true, booking.getScheduledEnd());
        applyAllocation(booking, allocation);
        transition(booking, BookingStatus.CONFIRMED, null);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RevenueStatsResponse getRevenueStats(UUID partnerId, YearMonth month) {
        authorization.requireFullReadAt(partnerId);
        LocalDateTime start = month.atDay(1).atStartOfDay();
        LocalDateTime end   = month.plusMonths(1).atDay(1).atStartOfDay();
        BigDecimal revenue  = bookingRepository.sumRevenueByPartnerAndPeriod(partnerId, start, end);
        return new RevenueStatsResponse(revenue != null ? revenue : BigDecimal.ZERO, month.getMonthValue(), month.getYear());
    }

    @Transactional(readOnly = true)
    public List<DailyStatsEntry> getDailyStats(UUID partnerId, int days) {
        authorization.requireFullReadAt(partnerId);
        LocalDateTime startDate = LocalDate.now().minusDays(days - 1L).atStartOfDay();
        List<Object[]> rows = bookingRepository.countDailyBookings(partnerId, startDate);

        // Index results by date string so we can fill gaps with 0
        Map<String, Long> countByDay = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String day   = row[0].toString().substring(0, 10); // "YYYY-MM-DD"
            long   total = ((Number) row[1]).longValue();
            countByDay.put(day, total);
        }

        // Build ordered list covering every day in the range
        List<DailyStatsEntry> result = new ArrayList<>(days);
        for (int i = days - 1; i >= 0; i--) {
            String key = LocalDate.now().minusDays(i).format(DateTimeFormatter.ISO_LOCAL_DATE);
            result.add(new DailyStatsEntry(key, countByDay.getOrDefault(key, 0L)));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public ClientStatsResponse getClientStats(UUID partnerId, YearMonth month) {
        authorization.requireFullReadAt(partnerId);
        LocalDateTime start = month.atDay(1).atStartOfDay();
        LocalDateTime end   = month.plusMonths(1).atDay(1).atStartOfDay();
        Long newClients     = bookingRepository.countNewClientsByPartnerAndPeriod(partnerId, start, end);
        return new ClientStatsResponse(newClients != null ? newClients : 0L, month.getMonthValue(), month.getYear());
    }
}
