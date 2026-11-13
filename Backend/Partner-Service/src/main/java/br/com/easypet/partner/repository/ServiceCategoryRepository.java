package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, UUID> {
    List<ServiceCategory> findAllByActiveTrueOrderByDisplayOrderAsc();
}
