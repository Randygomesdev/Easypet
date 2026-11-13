package br.com.easypet.partner.service;

import br.com.easypet.partner.security.PartnerAccess;
import br.com.easypet.partner.domain.entity.Staff;
import br.com.easypet.partner.dto.response.ServiceResponse;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.model.PartnerCategory;
import br.com.easypet.partner.dto.request.PartnerRequest;
import br.com.easypet.partner.dto.response.PartnerResponse;
import br.com.easypet.partner.dto.request.ReviewRequest;
import br.com.easypet.partner.dto.response.ReviewResponse;
import br.com.easypet.partner.domain.entity.PartnerReview;
import br.com.easypet.partner.mapper.ReviewMapper;
import br.com.easypet.partner.repository.PartnerReviewRepository;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.mapper.PartnerMapper;
import br.com.easypet.partner.repository.PartnerRepository;
import br.com.easypet.partner.repository.ServiceOfferRepository;
import br.com.easypet.partner.repository.StaffRepository;
import br.com.easypet.partner.domain.entity.ServiceCategory;
import br.com.easypet.partner.domain.entity.ServiceOffer;
import br.com.easypet.partner.dto.request.ServiceOfferRequest;
import br.com.easypet.partner.repository.ServiceCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.easypet.partner.security.UserPrincipal;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class PartnerService {

    private final PartnerRepository partnerRepository;
    private final PartnerMapper partnerMapper;
    private final PartnerReviewRepository partnerReviewRepository;
    private final ReviewMapper reviewMapper;
    private final GeocodingService geocodingService;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceOfferRepository serviceOfferRepository;
    private final StaffRepository staffRepository;

    @Transactional(readOnly = true)
    public PartnerResponse findByCurrentUser() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UUID userId = UUID.fromString(principal.id());
        return partnerRepository.findByUserId(userId)
                .map(partnerMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado para o usuário autenticado"));
    }

    public PartnerResponse create(PartnerRequest request) {
        log.info("Cadastrando novo parceiro: {}", request.name());
        Partner partner = partnerMapper.toEntity(request);
        partner.setActive(true);

        // Vincula o parceiro ao usuário autenticado
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        partner.setUserId(UUID.fromString(principal.id()));
        
        // Se as coordenadas não foram enviadas manualmente, resolvemos via Geocoding
        if (partner.getLatitude() == null || partner.getLongitude() == null) {
            fillPartnerCoordinates(partner);
        }
        
        if (request.services() != null) {
            List<ServiceOffer> services = request.services().stream()
                    .map(s -> ServiceOffer.builder()
                            .name(s.name())
                            .description(s.description())
                            .price(s.price())
                            .durationMinutes(s.durationMinutes())
                            .partner(partner)
                            .active(true)
                            .build())
                    .collect(Collectors.toList());
            partner.setServices(services);
        }
        
        return partnerMapper.toResponse(partnerRepository.save(partner));
    }

    @Transactional(readOnly = true)
    public Page<PartnerResponse> findAll(PartnerCategory category, String name, Pageable pageable) {
        log.info("Buscando parceiros com filtros - Categoria: {}, Nome: {}", category, name);
        
        Page<Partner> partners;
        if (category != null) {
            partners = partnerRepository.findByCategoriesContainingAndActiveTrue(category, pageable);
        } else if (name != null && !name.trim().isEmpty()) {
            String term = "%" + name.trim().toLowerCase() + "%";
            log.info("Realizando busca multi-campo pelo termo: {}", term);
            partners = partnerRepository.searchActive(term, pageable);
        } else {
            log.info("Buscando TODOS os parceiros ativos (sem filtros)");
            partners = partnerRepository.findByActiveTrue(pageable);
        }
        
        return partners.map(partnerMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public PartnerResponse findById(UUID id) {
        log.info("Buscando detalhes do parceiro ID: {}", id);
        return partnerRepository.findById(id)
                .map(partnerMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado"));
    }

    @Transactional(readOnly = true)
    public PartnerResponse findActiveById(UUID id) {
        return partnerRepository.findById(id).filter(p -> Boolean.TRUE.equals(p.getActive()))
                .map(partnerMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado"));
    }

    public PartnerResponse update(UUID id, PartnerRequest request) {
        log.info("Atualizando dados do parceiro ID: {}", id);
        Partner partner = partnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado"));
        PartnerAccess.requireOwnerOrAdmin(partner);
        
        // Armazenamos o endereço anterior para comparar se houve alterações
        String oldAddress = partner.getAddress();
        String oldNumber = partner.getNumber();
        String oldNeighborhood = partner.getNeighborhood();
        String oldCity = partner.getCity();
        String oldState = partner.getState();
        String oldZip = partner.getZipCode();
        
        partnerMapper.updateEntityFromRequest(request, partner);
        
        // Verifica se qualquer parte relevante do endereço foi modificada (incluindo o bairro)
        boolean addressChanged = !stringsEqual(oldAddress, partner.getAddress())
                || !stringsEqual(oldNumber, partner.getNumber())
                || !stringsEqual(oldNeighborhood, partner.getNeighborhood())
                || !stringsEqual(oldCity, partner.getCity())
                || !stringsEqual(oldState, partner.getState())
                || !stringsEqual(oldZip, partner.getZipCode());
        
        log.debug("Geocoding disparado: addressChanged={} ou coordenadas nulas.", addressChanged);
        
        // Se o endereço mudou ou se as coordenadas ainda estão nulas, recalculamos
        if (addressChanged || partner.getLatitude() == null || partner.getLongitude() == null) {
            fillPartnerCoordinates(partner);
        } else {
            log.info("Geocoding ignorado: endereço não mudou e coordenadas já existem.");
        }
        
        if (request.services() != null) {
            if (partner.getServices() == null) {
                partner.setServices(new java.util.ArrayList<>());
            } else {
                partner.getServices().clear();
            }
            List<ServiceOffer> newServices = request.services().stream()
                    .map(s -> {
                        ServiceCategory cat = s.categoryId() != null
                                ? serviceCategoryRepository.findById(s.categoryId()).orElse(null)
                                : null;
                        return ServiceOffer.builder()
                                .name(s.name())
                                .description(s.description())
                                .price(s.price())
                                .durationMinutes(s.durationMinutes())
                                .billingUnit(s.billingUnit() != null ? s.billingUnit() : br.com.easypet.partner.domain.model.BillingUnit.HOURLY)
                                .category(cat)
                                .partner(partner)
                                .active(true)
                                .build();
                    })
                    .collect(Collectors.toList());
            partner.getServices().addAll(newServices);
        }
        
        return partnerMapper.toResponse(partnerRepository.save(partner));
    }

    private void fillPartnerCoordinates(Partner partner) {
        // Se o parceiro já tem coordenadas (enviadas manualmente), não tentamos sobrescrever com o geocoding automático
        if (partner.getLatitude() != null && partner.getLongitude() != null) {
            log.info("Parceiro '{}' já possui coordenadas manuais. Pulando geocoding automático.", partner.getName());
            return;
        }

        if (partner.getAddress() != null && partner.getCity() != null) {
            log.info("Tentando obter coordenadas automáticas para '{}'...", partner.getName());
            
            GeocodingService.Coordinates coords = geocodingService.geocodeStructured(
                    partner.getAddress(),
                    partner.getNumber(),
                    partner.getNeighborhood(),
                    partner.getCity(),
                    partner.getState(),
                    partner.getZipCode()
            );
            
            // Fallback para CEP
            if (coords == null && partner.getZipCode() != null && !partner.getZipCode().isBlank()) {
                coords = geocodingService.geocode(partner.getZipCode() + ", Brasil");
            }

            if (coords != null) {
                partner.setLatitude(coords.latitude());
                partner.setLongitude(coords.longitude());
                log.info("Geocoding automático concluído com sucesso.");
            } else {
                log.info("Não foi possível obter coordenadas automáticas para '{}'. O administrador poderá inserir manualmente.", partner.getName());
            }
        }
    }

    private boolean stringsEqual(String s1, String s2) {
        if (s1 == null && s2 == null) return true;
        if (s1 == null || s2 == null) return false;
        return s1.trim().equalsIgnoreCase(s2.trim());
    }

    public void delete(UUID id) {
        log.info("Desativando parceiro ID: {}", id);
        Partner partner = partnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado"));
        PartnerAccess.requireOwnerOrAdmin(partner);
        
        partner.setActive(false);
        partnerRepository.save(partner);
    }

    public ServiceResponse addService(UUID partnerId, ServiceOfferRequest request) {
        log.info("Adicionando serviço '{}' ao parceiro ID: {}", request.name(), partnerId);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado"));
        PartnerAccess.requireOwnerOrAdmin(partner);

        ServiceOffer service = ServiceOffer.builder()
                .category(resolveCategory(request))
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .durationMinutes(request.durationMinutes())
                .billingUnit(request.billingUnit() != null ? request.billingUnit() : br.com.easypet.partner.domain.model.BillingUnit.HOURLY)
                .partner(partner)
                .active(true)
                .build();

        if (partner.getServices() == null) {
            partner.setServices(new java.util.ArrayList<>());
        }
        partner.getServices().add(service);
        partnerRepository.save(partner);

        if (request.staffIds() != null && !request.staffIds().isEmpty()) {
            List<Staff> staffMembers = resolveStaff(partnerId, request.staffIds());
            for (Staff staff : staffMembers) {
                if (staff.getServices() == null) staff.setServices(new HashSet<>());
                staff.getServices().add(service);
            }
            staffRepository.saveAll(staffMembers);
        }

        return partnerMapper.toServiceResponse(service);
    }

    public ServiceResponse updateService(UUID partnerId, UUID serviceId, ServiceOfferRequest request) {
        log.info("Atualizando serviço ID: {} do parceiro ID: {}", serviceId, partnerId);
        ServiceOffer service = serviceOfferRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado"));

        if (!service.getPartner().getId().equals(partnerId)) {
            throw new ResourceNotFoundException("Serviço não encontrado neste estabelecimento");
        }
        PartnerAccess.requireOwnerOrAdmin(service.getPartner());
        ServiceCategory category = resolveCategory(request);

        service.setName(request.name());
        service.setDescription(request.description());
        service.setPrice(request.price());
        service.setDurationMinutes(request.durationMinutes());
        if (request.billingUnit() != null) service.setBillingUnit(request.billingUnit());
        service.setCategory(category);
        serviceOfferRepository.save(service);

        if (request.staffIds() != null) {
            List<Staff> requestedStaff = resolveStaff(partnerId, request.staffIds());
            List<Staff> currentLinked = staffRepository.findByServicesId(serviceId);
            Set<UUID> newIds = new HashSet<>(request.staffIds());

            for (Staff staff : currentLinked) {
                if (!newIds.contains(staff.getId())) {
                    staff.getServices().removeIf(s -> s.getId().equals(serviceId));
                    staffRepository.save(staff);
                }
            }

            Set<UUID> currentIds = currentLinked.stream().map(Staff::getId).collect(Collectors.toSet());
            List<Staff> toAdd = requestedStaff.stream().filter(staff -> !currentIds.contains(staff.getId())).toList();
            for (Staff staff : toAdd) {
                if (staff.getServices() == null) staff.setServices(new HashSet<>());
                staff.getServices().add(service);
                staffRepository.save(staff);
            }
        }

        return partnerMapper.toServiceResponse(service);
    }

    private ServiceCategory resolveCategory(ServiceOfferRequest request) {
        return request.categoryId() == null ? null : serviceCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
    }

    private List<Staff> resolveStaff(UUID partnerId, List<UUID> ids) {
        Set<UUID> uniqueIds = new HashSet<>(ids);
        List<Staff> staff = staffRepository.findAllById(uniqueIds);
        if (staff.size() != uniqueIds.size() || staff.stream().anyMatch(member -> !member.getPartner().getId().equals(partnerId))) {
            throw new ResourceNotFoundException("Colaborador não encontrado neste estabelecimento");
        }
        return staff;
    }

    public ReviewResponse addReview(UUID partnerId, ReviewRequest request) {
        log.info("Adicionando avaliação de nota {} ao parceiro ID: {}", request.rating(), partnerId);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado"));

        // Extrai o nome/email do autor a partir do token JWT autenticado
        String authorName = SecurityContextHolder.getContext().getAuthentication().getName();

        PartnerReview review = reviewMapper.toEntity(request);
        review.setPartner(partner);
        review.setAuthorName(authorName);
        PartnerReview savedReview = partnerReviewRepository.save(review);

        // Recalcular média
        Double averageRating = partnerReviewRepository.getAverageRatingForPartner(partnerId);
        if (averageRating != null) {
            partner.setRating(averageRating);
            partnerRepository.save(partner);
            log.info("Nova média do parceiro ID {}: {}", partnerId, averageRating);
        }

        return reviewMapper.toResponse(savedReview);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> findReviewsByPartnerId(UUID partnerId) {
        log.info("Buscando avaliações do parceiro ID: {}", partnerId);
        if (!partnerRepository.existsById(partnerId)) {
            throw new ResourceNotFoundException("Parceiro não encontrado");
        }
        return partnerReviewRepository.findByPartnerIdOrderByCreatedAtDesc(partnerId).stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }
}
