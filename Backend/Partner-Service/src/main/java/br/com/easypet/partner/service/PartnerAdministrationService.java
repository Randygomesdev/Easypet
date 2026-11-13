package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.entity.PartnerStatusChange;
import br.com.easypet.partner.domain.model.PartnerCategory;
import br.com.easypet.partner.dto.response.PartnerResponse;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.mapper.PartnerMapper;
import br.com.easypet.partner.repository.PartnerRepository;
import br.com.easypet.partner.repository.PartnerStatusChangeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartnerAdministrationService {
    private final PartnerRepository partners;
    private final PartnerStatusChangeRepository changes;
    private final PartnerMapper mapper;

    public Page<PartnerResponse> list(boolean active, PartnerCategory category, String search, Pageable pageable) {
        Specification<Partner> filter = (partner, query, criteria) -> active
                ? criteria.isTrue(partner.get("active"))
                : criteria.or(criteria.isFalse(partner.get("active")), criteria.isNull(partner.get("active")));
        if (category != null) {
            filter = filter.and((partner, query, criteria) -> criteria.isMember(category, partner.get("categories")));
        }
        if (search != null && !search.isBlank()) {
            String term = "%" + search.strip().toLowerCase(Locale.ROOT)
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            filter = filter.and((partner, query, criteria) -> criteria.or(
                    criteria.like(criteria.lower(partner.get("name")), term, '!'),
                    criteria.like(partner.get("cnpj"), term, '!'),
                    criteria.like(criteria.lower(partner.get("city")), term, '!')));
        }
        var page = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100), Sort.by("name", "id"));
        return partners.findAll(filter, page).map(mapper::toResponse);
    }

    @Transactional
    public PartnerResponse setActive(UUID id, UUID actor, boolean active, String reason) {
        Partner partner = partners.lockById(id).orElseThrow(PartnerAdministrationService::missing);
        boolean previous = Boolean.TRUE.equals(partner.getActive());
        if (previous != active) {
            partner.setActive(active);
            changes.save(new PartnerStatusChange(UUID.randomUUID(), id, actor, previous, active, reason.strip(), Instant.now()));
        }
        return mapper.toResponse(partner);
    }

    public Page<PartnerStatusChange> history(UUID id, Pageable pageable) {
        if (!partners.existsById(id)) throw missing();
        var page = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100),
                Sort.by(Sort.Direction.DESC, "changedAt", "id"));
        return changes.findByPartnerId(id, page);
    }

    private static ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Estabelecimento não encontrado.");
    }
}
