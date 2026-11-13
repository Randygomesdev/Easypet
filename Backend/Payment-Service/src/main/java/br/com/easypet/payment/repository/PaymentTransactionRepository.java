package br.com.easypet.payment.repository;

import br.com.easypet.payment.domain.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {
    List<PaymentTransaction> findByUserId(UUID userId);
    Optional<PaymentTransaction> findByPreferenceId(String preferenceId);
}
