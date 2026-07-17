package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.ServiceOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceOfferRepository extends JpaRepository<ServiceOffer, UUID> {
    List<ServiceOffer> findByPartnerIdAndActiveTrue(UUID partnerId);
}
