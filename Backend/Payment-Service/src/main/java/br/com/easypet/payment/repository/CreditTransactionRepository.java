package br.com.easypet.payment.repository;

import br.com.easypet.payment.domain.entity.CreditTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, UUID> {
}
