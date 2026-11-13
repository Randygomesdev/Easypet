package br.com.innkercode.auth.repository;

import br.com.innkercode.auth.domain.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Query("select t.user.id from PasswordResetToken t where t.tokenHash = :tokenHash")
    Optional<UUID> findUserIdByTokenHash(String tokenHash);

    @Modifying
    @Query("""
            update PasswordResetToken t set t.replacedAt = :now
            where t.user.id = :userId and t.usedAt is null and t.replacedAt is null and t.expiryDate > :now
            """)
    void replaceOutstanding(UUID userId, LocalDateTime now);
}
