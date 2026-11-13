package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.ReceptionCustomer;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.lang.Nullable;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface ReceptionCustomerRepository extends JpaRepository<ReceptionCustomer, UUID>,
        JpaSpecificationExecutor<ReceptionCustomer> {

    @Override
    @EntityGraph(attributePaths = "partner")
    Page<ReceptionCustomer> findAll(@Nullable Specification<ReceptionCustomer> filter, Pageable pageable);

    Optional<ReceptionCustomer> findByIdAndPartnerId(UUID id, UUID partnerId);
    boolean existsByIdAndPartnerId(UUID id, UUID partnerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select customer from ReceptionCustomer customer where customer.id = :id")
    Optional<ReceptionCustomer> lockById(UUID id);

    List<ReceptionCustomer> findByClaimedUserId(UUID userId);

    boolean existsByIdAndPartnerIdAndClaimedUserId(UUID customerId, UUID partnerId, UUID userId);
}
