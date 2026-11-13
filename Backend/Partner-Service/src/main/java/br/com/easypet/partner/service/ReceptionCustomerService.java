package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.entity.ReceptionCustomer;
import br.com.easypet.partner.dto.request.ReceptionCustomerRequest;
import br.com.easypet.partner.dto.response.ReceptionCustomerResponse;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.security.UserPrincipal;
import br.com.easypet.partner.repository.ReceptionCustomerRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReceptionCustomerService {
    private final DeskAccess deskAccess;
    private final ReceptionCustomerRepository customers;

    @Transactional
    public ReceptionCustomerResponse create(UserPrincipal actor, ReceptionCustomerRequest request) {
        Partner partner = deskAccess.activePartner(actor);
        String name = compactName(request.name());
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome do tutor.");
        }
        String email = request.email() == null || request.email().isBlank() ? null
                : request.email().strip().toLowerCase(Locale.ROOT);
        String phone = request.phone() == null || request.phone().isBlank() ? null : digits(request.phone());
        if (phone != null && (phone.length() < 8 || phone.length() > 15)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um telefone válido.");
        }
        if (email == null && phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe e-mail ou telefone do tutor.");
        }
        ReceptionCustomer customer = ReceptionCustomer.builder()
                .partner(partner)
                .name(name)
                .nameKey(compactName(name.toLowerCase(Locale.ROOT)))
                .email(email)
                .phone(phone)
                .createdAt(Instant.now())
                .build();
        try {
            return ReceptionCustomerResponse.from(customers.saveAndFlush(customer));
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation
                    && "23505".equals(violation.getSQLState())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Já existe um cliente com este nome e contato neste estabelecimento.");
            }
            throw exception;
        }
    }

    public Page<ReceptionCustomerResponse> listForPartner(UserPrincipal actor, String q, int page, int size) {
        return list(deskAccess.activePartner(actor).getId(), q, page, size);
    }

    public ReceptionCustomerResponse findForPartner(UserPrincipal actor, UUID customerId) {
        return ReceptionCustomerResponse.from(findScoped(actor, customerId));
    }

    public Membership membership(UserPrincipal actor, UUID customerId) {
        ReceptionCustomer customer = findScoped(actor, customerId);
        return new Membership(customer.getId(), customer.getPartner().getId());
    }

    public Page<ReceptionCustomerResponse> listForAdmin(String q, int page, int size) {
        return list(null, q, page, size);
    }

    public ReceptionCustomerResponse findForAdmin(UUID customerId) {
        return customers.findById(customerId).map(ReceptionCustomerResponse::from)
                .orElseThrow(ReceptionCustomerService::customerNotFound);
    }

    private ReceptionCustomer findScoped(UserPrincipal actor, UUID customerId) {
        return customers.findByIdAndPartnerId(customerId, deskAccess.activePartner(actor).getId())
                .orElseThrow(ReceptionCustomerService::customerNotFound);
    }

    private Page<ReceptionCustomerResponse> list(UUID partnerId, String q, int page, int size) {
        String term = compactName(q.toLowerCase(Locale.ROOT));
        String phone = term.matches("[0-9+() .-]+") ? digits(term) : "";
        Specification<ReceptionCustomer> filter = (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (partnerId != null) {
                filters.add(cb.equal(root.get("partner").get("id"), partnerId));
            }
            if (!term.isEmpty()) {
                String pattern = "%" + term.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
                Predicate matches = cb.or(cb.like(root.get("nameKey"), pattern, '!'),
                        cb.like(root.get("email"), pattern, '!'));
                filters.add(phone.isEmpty() ? matches : cb.or(matches, cb.like(root.get("phone"), "%" + phone + "%")));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
        return customers.findAll(filter, PageRequest.of(page, size, Sort.by("nameKey", "id")))
                .map(ReceptionCustomerResponse::from);
    }

    private static String compactName(String name) {
        return name.strip().replaceAll("(?U)\\s+", " ").strip();
    }

    private static String digits(String phone) {
        return phone.replaceAll("[^0-9]", "");
    }

    private static ResourceNotFoundException customerNotFound() {
        return new ResourceNotFoundException("Cliente não encontrado neste escopo.");
    }

    public record Membership(UUID customerId, UUID partnerId) {}
}
