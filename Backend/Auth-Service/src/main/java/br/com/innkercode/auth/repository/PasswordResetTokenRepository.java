package br.com.innkercode.auth.repository;

import br.com.innkercode.auth.domain.entity.PasswordResetToken;
import br.com.innkercode.auth.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByToken(String token);
    void deleteByUser(User user);

}
