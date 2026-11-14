package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.ReceptionCustomer;
import br.com.easypet.partner.domain.entity.ReceptionNotificationAuthorization;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.repository.ReceptionCustomerRepository;
import br.com.easypet.partner.repository.ReceptionNotificationAuthorizationRepository;
import br.com.easypet.partner.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReceptionNotificationService {
    private final DeskAccess desks;
    private final ReceptionCustomerRepository customers;
    private final ReceptionNotificationAuthorizationRepository authorizations;

    public Authorization status(UserPrincipal actor, UUID customerId) {
        UUID partnerId = desks.activePartner(actor).getId();
        ReceptionCustomer customer = customers.findByIdAndPartnerId(customerId, partnerId)
                .orElseThrow(ReceptionNotificationService::missingCustomer);
        return status(customer, latest(customerId));
    }

    @Transactional
    public Authorization update(UserPrincipal actor, UUID customerId, boolean authorized,
                                long expectedRevision, boolean confirmedInPerson, String confirmedEmail) {
        UUID partnerId = desks.activePartner(actor).getId();
        ReceptionCustomer customer = customers.lockByIdAndPartnerId(customerId, partnerId)
                .orElseThrow(ReceptionNotificationService::missingCustomer);
        ReceptionNotificationAuthorization current = latest(customerId);
        Authorization previous = status(customer, current);
        if (expectedRevision != previous.revision()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A autorização mudou. Atualize a consulta antes de continuar.");
        }
        UUID actorId = UUID.fromString(actor.id());
        if (authorized) {
            if (!confirmedInPerson || confirmedEmail == null || confirmedEmail.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirme a autorização presencial do tutor.");
            }
            if (previous.state() == State.UNAVAILABLE) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Autorização de balcão indisponível para este cadastro.");
            }
            if (!customer.getEmail().equals(confirmedEmail)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "O e-mail cadastrado mudou. Abra o cadastro novamente.");
            }
            if (previous.state() == State.AUTHORIZED) return previous;
            Instant now = Instant.now();
            if (isOpen(current)) {
                current.revoke(actorId, now);
                authorizations.flush();
            }
            long revision = current == null ? 1 : current.getRevision() + 1;
            var granted = new ReceptionNotificationAuthorization(customerId, customer.getEmail(), revision, actorId, now);
            return status(customer, authorizations.save(granted));
        }
        if (isOpen(current)) current.revoke(actorId, Instant.now());
        return status(customer, current);
    }

    public Recipient recipient(UUID partnerId, UUID customerId) {
        return authorizations.findRecipient(partnerId, customerId)
                .map(grant -> new Recipient(grant.getEmail(), grant.getId(), grant.getGrantedAt()))
                .orElseThrow(() -> new ResourceNotFoundException("Destinatário de balcão indisponível."));
    }

    private ReceptionNotificationAuthorization latest(UUID customerId) {
        return authorizations.findFirstByCustomerIdOrderByRevisionDesc(customerId).orElse(null);
    }

    private static Authorization status(ReceptionCustomer customer, ReceptionNotificationAuthorization grant) {
        State state;
        if (customer.getClaimedUserId() != null || customer.getEmail() == null || customer.getEmail().isBlank()) {
            state = State.UNAVAILABLE;
        } else if (grant == null) {
            state = State.NOT_GRANTED;
        } else if (!isOpen(grant)) {
            state = State.REVOKED;
        } else {
            state = grant.getEmail().equals(customer.getEmail()) ? State.AUTHORIZED : State.NOT_GRANTED;
        }
        return grant == null ? new Authorization(state, 0, null, null)
                : new Authorization(state, grant.getRevision(), grant.getGrantedAt(), grant.getRevokedAt());
    }

    private static boolean isOpen(ReceptionNotificationAuthorization grant) {
        return grant != null && grant.getRevokedAt() == null;
    }

    private static ResourceNotFoundException missingCustomer() {
        return new ResourceNotFoundException("Cliente não encontrado neste escopo.");
    }

    public enum State { NOT_GRANTED, AUTHORIZED, REVOKED, UNAVAILABLE }
    public record Authorization(State state, long revision, Instant grantedAt, Instant revokedAt) {}
    public record Recipient(String email, UUID authorizationId, Instant grantedAt) {}
}
