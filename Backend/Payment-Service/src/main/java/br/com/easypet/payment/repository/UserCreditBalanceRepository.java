package br.com.easypet.payment.repository;

import br.com.easypet.payment.domain.entity.UserCreditBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserCreditBalanceRepository extends JpaRepository<UserCreditBalance, UUID> {
    Optional<UserCreditBalance> findByUserId(UUID userId);
}
