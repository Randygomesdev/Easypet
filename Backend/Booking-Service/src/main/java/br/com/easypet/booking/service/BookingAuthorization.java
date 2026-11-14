package br.com.easypet.booking.service;

import br.com.easypet.booking.client.PartnerServiceClient;
import br.com.easypet.booking.client.PartnerServiceClient.CustomerClaim;
import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.dto.response.BookingAccessResponse;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.security.BookingSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
class BookingAuthorization {
    private static final String READ = "BOOKINGS_READ";
    private static final String WRITE = "BOOKINGS_WRITE";
    private static final String ASSIGNED_READ = "BOOKINGS_ASSIGNED_READ";
    private static final String ASSIGNED_ATTEND = "BOOKINGS_ASSIGNED_ATTEND";

    private final PartnerServiceClient partners;

    BookingSession session() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof BookingSession session) {
            return session;
        }
        throw denied();
    }

    boolean admin() {
        return "ADMIN".equals(session().role());
    }

    boolean tutor() {
        return "CUSTOMER".equals(session().role()) || "USER".equals(session().role());
    }

    void requireTutor() {
        if (!tutor()) throw denied();
    }

    boolean team() {
        return "TEAM_MEMBER".equals(session().role());
    }

    boolean canManage() {
        return admin() || "PARTNER".equals(session().role()) || session().hasPermission(WRITE);
    }

    void requireManagement() {
        if (!canManage()) throw denied();
    }

    void requireCreate(UUID partnerId, boolean reception) {
        if (tutor() && !reception) return;
        if (reception && !"PARTNER".equals(session().role())
                && !session().hasPermission("DESK_CUSTOMERS_MANAGE")) {
            throw denied();
        }
        requireManagement();
        requirePartnerScope(partnerId);
    }

    void requireActiveDesk(UUID partnerId) {
        partners.requireActiveDesk(partnerId);
    }

    void requireBookingWrite(Booking booking) {
        if (tutor()) {
            requireTutorBooking(booking);
        } else {
            requireManagement();
            requirePartnerScope(booking.getPartnerId());
        }
    }

    void requireBookingRead(Booking booking) {
        if (tutor()) {
            requireTutorBooking(booking);
            return;
        }
        var access = agendaAccess(booking.getPartnerId());
        requireStaffMatch(booking, access.staffId());
    }

    void requireAttendance(Booking booking) {
        if (canManage()) {
            requirePartnerScope(booking.getPartnerId());
            return;
        }
        if (!session().hasPermission(ASSIGNED_ATTEND)) throw denied();
        requirePartnerScope(booking.getPartnerId());
        requireStaffMatch(booking, assignedStaff());
    }

    void requireAttendanceAt(UUID partnerId) {
        if (!canManage() && !session().hasPermission(ASSIGNED_ATTEND)) throw denied();
        requirePartnerScope(partnerId);
    }

    void requireInPersonExtraDecision(Booking booking) {
        if (!canRegisterInPersonExtraDecision()) throw denied();
        requirePartnerScope(booking.getPartnerId());
    }

    private boolean canRegisterInPersonExtraDecision() {
        var person = session();
        return "PARTNER".equals(person.role()) || (team()
                && person.hasPermission(WRITE) && person.hasPermission("DESK_CUSTOMERS_MANAGE"));
    }

    void requireManagementAt(UUID partnerId) {
        requireManagement();
        requirePartnerScope(partnerId);
    }

    void requireFullReadAt(UUID partnerId) {
        if (!canReadAll()) throw denied();
        requirePartnerScope(partnerId);
    }

    BookingAccessResponse agendaAccess(UUID partnerId) {
        boolean all = canReadAll();
        if (!all && !session().hasPermission(ASSIGNED_READ)) throw denied();
        requirePartnerScope(partnerId);
        UUID staff = all ? null : assignedStaff();
        return new BookingAccessResponse(partnerId, canManage(), canManage() || session().hasPermission(ASSIGNED_ATTEND),
                staff, team(), canRegisterInPersonExtraDecision());
    }

    UUID currentPartner() {
        if (team()) return session().partnerId();
        if ("PARTNER".equals(session().role())) return partners.getCurrentPartnerId();
        throw denied();
    }

    List<CustomerClaim> customerClaims() {
        return "CUSTOMER".equals(session().role()) ? partners.getCustomerClaims() : List.of();
    }

    private void requireTutorBooking(Booking booking) {
        if (session().userId().equals(booking.getUserId())) return;
        if (booking.getReceptionCustomerId() != null && customerClaims().contains(
                new CustomerClaim(booking.getReceptionCustomerId(), booking.getPartnerId()))) return;
        throw new ResourceNotFoundException("Agendamento não encontrado.");
    }

    private void requirePartnerScope(UUID partnerId) {
        if (!admin() && !currentPartner().equals(partnerId)) {
            throw new ResourceNotFoundException("Estabelecimento não encontrado.");
        }
    }

    private boolean canReadAll() {
        return admin() || "PARTNER".equals(session().role()) || session().hasPermission(READ);
    }

    private UUID assignedStaff() {
        var session = session();
        return partners.getStaffAssignment(session.partnerId(), session.userId()).staffId();
    }

    private void requireStaffMatch(Booking booking, UUID staffId) {
        if (staffId != null && !staffId.equals(booking.getStaffId())) {
            throw new ResourceNotFoundException("Agendamento não encontrado.");
        }
    }

    private AccessDeniedException denied() {
        return new AccessDeniedException("Permissão insuficiente para esta operação de agenda.");
    }
}
