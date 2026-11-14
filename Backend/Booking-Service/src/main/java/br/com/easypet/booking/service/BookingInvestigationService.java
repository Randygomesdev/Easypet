package br.com.easypet.booking.service;

import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.domain.enums.BookingStatus;
import br.com.easypet.booking.dto.BookingInvestigation.Detail;
import br.com.easypet.booking.dto.BookingInvestigation.Summary;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.repository.BookingAgendaStore;
import br.com.easypet.booking.repository.BookingExtraStore;
import br.com.easypet.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class BookingInvestigationService {
    private static final Set<BookingStatus> PROBLEM_STATUSES =
            Set.of(BookingStatus.CANCELLED, BookingStatus.NO_SHOW, BookingStatus.INTERRUPTED);

    private final BookingRepository bookings;
    private final BookingAgendaStore agenda;
    private final BookingExtraStore extras;
    private final BookingAuthorization authorization;

    public Page<Summary> list(UUID partnerId, UUID bookingId, BookingStatus status, Pageable pageable) {
        requireAdmin();
        Specification<Booking> query = (root, criteria, cb) -> cb.conjunction();
        if (partnerId != null) query = query.and((root, criteria, cb) -> cb.equal(root.get("partnerId"), partnerId));
        if (bookingId != null) query = query.and((root, criteria, cb) -> cb.equal(root.get("id"), bookingId));
        if (status != null) {
            query = query.and((root, criteria, cb) -> cb.equal(root.get("status"), status));
        } else if (bookingId == null) {
            query = query.and((root, criteria, cb) -> root.get("status").in(PROBLEM_STATUSES));
        }
        return bookings.findAll(query, pageable).map(Summary::from);
    }

    public Detail detail(UUID bookingId, UUID partnerId, Pageable history, Pageable proposals) {
        requireAdmin();
        Booking booking = bookings.findById(bookingId)
                .filter(row -> partnerId == null || partnerId.equals(row.getPartnerId()))
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado."));
        String reason = switch (booking.getStatus()) {
            case CANCELLED -> booking.getCancellationReason();
            case NO_SHOW -> booking.getNoShowReason();
            case INTERRUPTED -> booking.getInterruptionReason();
            default -> null;
        };
        return new Detail(Summary.from(booking), reason, booking.getInterruptedAt(),
                agenda.findInvestigationHistory(bookingId, history), extras.list(bookingId, proposals).map(BookingExtraStore.Entry::audit));
    }

    private void requireAdmin() {
        if (!authorization.admin()) throw new AccessDeniedException("Operação exclusiva da administração.");
    }
}
