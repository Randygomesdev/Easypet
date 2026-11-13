package br.com.innkercode.auth.repository;

import br.com.innkercode.auth.domain.entity.TeamAccess;
import br.com.innkercode.auth.domain.model.TeamAccessStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeamAccessRepository extends JpaRepository<TeamAccess, UUID> {

    Optional<TeamAccess> findByUserIdAndStatus(UUID userId, TeamAccessStatus status);

    boolean existsByUserIdAndStatus(UUID userId, TeamAccessStatus status);

    @Query("""
            select a from TeamAccess a, User u
            where u.id = :userId and u.active = true and u.sessionVersion = :version
                and a.userId = u.id and a.status = br.com.innkercode.auth.domain.model.TeamAccessStatus.ACTIVE
            """)
    Optional<TeamAccess> findCurrentAccess(UUID userId, int version);

    List<TeamAccess> findAllByPartnerIdOrderByCreatedAtDescIdAsc(UUID partnerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TeamAccess> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TeamAccess> findByIdAndPartnerId(UUID id, UUID partnerId);

    @Modifying
    @Query("""
            update TeamAccess a set a.status = br.com.innkercode.auth.domain.model.TeamAccessStatus.EXPIRED,
                a.updatedAt = :updatedAt
            where a.partnerId = :partnerId and a.email = :email
                and a.status = br.com.innkercode.auth.domain.model.TeamAccessStatus.PENDING and a.expiresAt <= :now
            """)
    void expirePending(UUID partnerId, String email, Instant now, LocalDateTime updatedAt);
}
