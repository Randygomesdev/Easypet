package br.com.innkercode.auth.service;

import br.com.innkercode.auth.domain.entity.TeamAccess;
import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.TeamAccessStatus;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.request.AcceptTeamInvitationRequest;
import br.com.innkercode.auth.dto.request.CreateTeamInvitationRequest;
import br.com.innkercode.auth.dto.response.TeamAccessResponse;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.exception.UserNotFoundException;
import br.com.innkercode.auth.repository.TeamAccessRepository;
import br.com.innkercode.auth.repository.PasswordResetTokenRepository;
import br.com.innkercode.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static br.com.innkercode.auth.domain.model.TeamAccessStatus.*;

@Service
@RequiredArgsConstructor
public class TeamAccessService {

    private final TeamAccessRepository accesses;
    private final UserRepository users;
    private final PasswordResetTokenRepository resets;
    private final AccountCredentials credentials;
    private final EmailService emailService;
    private final ApplicationEventPublisher events;
    private final IdentityAuditService audit;

    @Transactional
    public TeamAccessResponse invite(UUID ownerId, UUID partnerId, CreateTeamInvitationRequest request) {
        emailService.requireEnabled();
        String email = AccountCredentials.normalizeEmail(request.email());
        if (!emailService.canSendTo(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVITATION_TEST_EMAIL_REQUIRED",
                    "Em homologação, use um endereço fictício @example.test.");
        }
        eligibleAccount(email).ifPresent(this::requireNoActiveAccess);

        Instant now = Instant.now();
        accesses.expirePending(partnerId, email, now, LocalDateTime.now());
        String token = OneTimeTokens.generate();
        TeamAccess access = TeamAccess.builder()
                .partnerId(partnerId)
                .email(email)
                .accessRole(request.accessRole())
                .status(PENDING)
                .tokenHash(OneTimeTokens.digest(token))
                .expiresAt(now.plus(48, ChronoUnit.HOURS))
                .createdBy(ownerId)
                .build();
        persist(access);
        audit.teamInvited(ownerId, access, request.reason(), now);
        events.publishEvent(new EmailService.TeamInvitationMail(email, token));
        return TeamAccessResponse.from(access, now);
    }

    @Transactional
    public TeamAccessResponse accept(AcceptTeamInvitationRequest request) {
        TeamAccess access = accesses.findByTokenHash(OneTimeTokens.digest(request.token()))
                .orElseThrow(() -> invalidInvitation("INVALID", "Este convite é inválido."));
        Instant now = Instant.now();
        switch (access.statusAt(now)) {
            case ACTIVE -> throw invalidInvitation("USED", "Este convite já foi utilizado.");
            case EXPIRED -> throw invalidInvitation("EXPIRED", "Este convite expirou.");
            case REVOKED -> throw invalidInvitation("INVALID", "Este convite foi revogado.");
            case PENDING -> { }
        }

        String password = credentials.encodePassword(request.password());
        String name = request.name().strip();
        User user = eligibleAccount(users.findByEmailForUpdate(access.getEmail()), access.getEmail())
                .orElseGet(() -> credentials.create(User.builder()
                        .email(access.getEmail()).role(UserRole.TEAM_MEMBER).name(name).password(password).build()));
        requireNoActiveAccess(user);
        user.setName(name);
        user.setPassword(password);
        user.setActive(true);
        user.invalidateSessions();
        access.activate(user.getId());
        persist(access);
        audit.teamAccepted(user, access, now);
        return TeamAccessResponse.from(access, now);
    }

    @Transactional(readOnly = true)
    public List<TeamAccessResponse> list(UUID partnerId) {
        Instant now = Instant.now();
        return accesses.findAllByPartnerIdOrderByCreatedAtDescIdAsc(partnerId).stream()
                .map(access -> TeamAccessResponse.from(access, now))
                .toList();
    }

    @Transactional
    public void revoke(UUID ownerId, UUID partnerId, UUID accessId, String reason) {
        TeamAccess access = accesses.findByIdAndPartnerId(accessId, partnerId)
                .orElseThrow(() -> new UserNotFoundException("Acesso não encontrado."));
        Instant now = Instant.now();
        TeamAccessStatus previous = access.statusAt(now);
        if (previous == REVOKED) return;
        if (previous == ACTIVE) {
            User user = users.findByIdForUpdate(access.getUserId()).orElseThrow();
            user.setActive(false);
            user.invalidateSessions();
            resets.replaceOutstanding(user.getId(), LocalDateTime.now());
        }
        access.revoke(ownerId);
        audit.teamRevoked(ownerId, access, previous, reason, now);
    }

    public TeamAccess requireActiveAccess(UUID userId) {
        return accesses.findByUserIdAndStatus(userId, ACTIVE).orElseThrow(ApiException::invalidSession);
    }

    private Optional<User> eligibleAccount(String email) {
        return eligibleAccount(users.findByEmail(email), email);
    }

    private Optional<User> eligibleAccount(Optional<User> account, String email) {
        if (account.isPresent()) {
            if (account.get().getRole() != UserRole.TEAM_MEMBER) {
                throw ApiException.emailTaken();
            }
        } else if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.emailTaken();
        }
        return account;
    }

    private void requireNoActiveAccess(User account) {
        if (accesses.existsByUserIdAndStatus(account.getId(), ACTIVE)) {
            throw conflict();
        }
    }

    private void persist(TeamAccess access) {
        try {
            accesses.saveAndFlush(access);
        } catch (DataIntegrityViolationException ex) {
            if (ex.getCause() instanceof ConstraintViolationException violation
                    && ("uq_team_accesses_current".equals(violation.getConstraintName())
                    || "uq_team_accesses_active_user".equals(violation.getConstraintName()))) {
                throw conflict();
            }
            throw ex;
        }
    }

    private static ApiException conflict() {
        return new ApiException(HttpStatus.CONFLICT, "TEAM_ACCESS_EXISTS", "Já existe um convite ou acesso ativo.");
    }

    private static ApiException invalidInvitation(String state, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVITATION_" + state, message);
    }
}
