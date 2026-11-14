package br.com.easypet.booking.service;

import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.domain.enums.BookingStatus;
import br.com.easypet.booking.dto.BookingExtras.*;
import br.com.easypet.booking.exception.BookingConflictException;
import br.com.easypet.booking.exception.BusinessException;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.repository.BookingExtraStore;
import br.com.easypet.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

import static br.com.easypet.booking.dto.BookingExtras.MAX_AMOUNT_CENTS;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingExtraService {
    private final BookingRepository bookings;
    private final BookingExtraStore extras;
    private final BookingAuthorization authorization;

    @Transactional(readOnly = true)
    public Page<Extra> list(UUID bookingId, Pageable pageable) {
        var booking = bookings.findById(bookingId).orElseThrow(BookingExtraService::bookingNotFound);
        authorization.requireBookingRead(booking);
        return extras.list(bookingId, pageable).map(BookingExtraStore.Entry::extra);
    }

    public Extra propose(UUID bookingId, String key, Proposal input) {
        if (key == null || !key.matches("[!-~]{1,128}")) {
            throw new BusinessException("Chave de idempotência inválida.");
        }
        if (input.unitPriceCents() > MAX_AMOUNT_CENTS / input.quantity()) {
            throw new BusinessException("O valor total do adicional excede o limite.");
        }
        Booking booking = lockedBooking(bookingId);
        authorization.requireAttendance(booking);
        UUID actorId = authorization.session().userId();
        var proposal = new Proposal(input.description().strip(), input.quantity(), input.unitPriceCents());
        var existing = extras.findRequest(bookingId, actorId, key);
        if (existing.isPresent()) {
            Extra extra = existing.get().extra();
            if (!extra.description().equals(proposal.description()) || extra.quantity() != proposal.quantity()
                    || extra.unitPriceCents() != proposal.unitPriceCents()) {
                throw new BookingConflictException("A chave de idempotência já foi usada com outra proposta.");
            }
            return extra;
        }
        requireInProgress(booking);
        return extras.insert(booking, actorId, key, proposal);
    }

    public Extra decideDigital(UUID bookingId, UUID extraId, DigitalDecision input) {
        authorization.requireTutor();
        Booking booking = lockedBooking(bookingId);
        authorization.requireBookingRead(booking);
        return decide(booking, extraId, input.version(), input.decision(), Channel.DIGITAL, null, null);
    }

    public Extra decideInPerson(UUID bookingId, UUID extraId, InPersonDecision input) {
        Booking booking = lockedBooking(bookingId);
        authorization.requireInPersonExtraDecision(booking);
        return decide(booking, extraId, input.version(), input.decision(), Channel.IN_PERSON,
                input.reason().strip(), input.evidence().strip());
    }

    private Extra decide(Booking booking, UUID extraId, int version, Decision decision, Channel channel,
                         String reason, String evidence) {
        var entry = extras.find(booking.getId(), extraId).orElseThrow(BookingExtraService::extraNotFound);
        Extra extra = entry.extra();
        requireVersion(extra, version);
        UUID actorId = authorization.session().userId();
        if (extra.status() != Status.PENDING) {
            if (extra.status() == decision.result() && extra.channel() == channel && actorId.equals(entry.decisionBy())
                    && Objects.equals(reason, entry.reason()) && Objects.equals(evidence, entry.evidence())) {
                return extra;
            }
            throw new BookingConflictException("A proposta já foi decidida ou expirou.");
        }
        requireInProgress(booking);
        return extras.decide(booking.getId(), extraId, decision.result(), actorId, channel, reason, evidence);
    }

    @Transactional(readOnly = true)
    public PaymentAuthorization paymentAuthorization(UUID partnerId, UUID bookingId, UUID authorizationId, int version) {
        var entry = extras.find(bookingId, authorizationId)
                .filter(item -> partnerId.equals(item.extra().partnerId()) && item.extra().status() == Status.APPROVED)
                .orElseThrow(BookingExtraService::extraNotFound);
        Extra extra = entry.extra();
        requireVersion(extra, version);
        return new PaymentAuthorization(extra.id(), extra.partnerId(), extra.bookingId(), extra.version(),
                extra.description(), extra.quantity(), extra.unitPriceCents(), extra.amountCents(), "BRL",
                extra.decisionAt(), entry.decisionBy(), entry.tutorId(), entry.tutorIdentityType(), extra.channel());
    }

    private Booking lockedBooking(UUID id) {
        return bookings.findByIdForUpdate(id).orElseThrow(BookingExtraService::bookingNotFound);
    }

    private static void requireVersion(Extra extra, int version) {
        if (extra.version() != version) throw new BookingConflictException("A versão da proposta diverge.");
    }

    private static void requireInProgress(Booking booking) {
        if (booking.getStatus() != BookingStatus.IN_PROGRESS) {
            throw new BusinessException("Adicionais exigem um atendimento em andamento.");
        }
    }

    private static ResourceNotFoundException bookingNotFound() {
        return new ResourceNotFoundException("Agendamento não encontrado.");
    }

    private static ResourceNotFoundException extraNotFound() {
        return new ResourceNotFoundException("Adicional não encontrado.");
    }
}
