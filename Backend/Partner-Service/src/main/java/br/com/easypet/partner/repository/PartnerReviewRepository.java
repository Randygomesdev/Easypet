package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.PartnerReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PartnerReviewRepository extends JpaRepository<PartnerReview, UUID> {

    List<PartnerReview> findByPartnerIdOrderByCreatedAtDesc(UUID partnerId);

    @Query("SELECT AVG(r.rating) FROM PartnerReview r WHERE r.partner.id = :partnerId")
    Double getAverageRatingForPartner(@Param("partnerId") UUID partnerId);
}
