package br.com.innkercode.auth.service;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.response.AdminCustomerResponse;
import br.com.innkercode.auth.dto.response.CustomerPageResponse;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.exception.UserNotFoundException;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.repository.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminCustomerService {

    private final UserRepository users;
    private final PasswordResetTokenRepository resets;
    private final IdentityAuditService audit;

    @Transactional(readOnly = true)
    public CustomerPageResponse search(int page, int size, String query, Boolean active) {
        String term = query.strip().toLowerCase(Locale.ROOT);
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE || term.length() > 255) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CUSTOMER_SEARCH", "Parâmetros de busca inválidos.");
        }
        PageRequest pagination = PageRequest.of(page, size, Sort.by("name", "id"));
        return CustomerPageResponse.from(
                users.searchByRole(UserRole.CUSTOMER, active, term, pagination).map(AdminCustomerResponse::from));
    }

    @Transactional
    public AdminCustomerResponse setActive(User actor, UUID id, boolean active, String reason) {
        User user = users.findByIdForUpdate(id)
                .filter(account -> account.getRole() == UserRole.CUSTOMER)
                .orElseThrow(() -> new UserNotFoundException("Cliente não encontrado."));
        boolean previous = user.isEnabled();
        if (previous != active) {
            user.setActive(active);
            user.invalidateSessions();
            if (!active) {
                resets.replaceOutstanding(user.getId(), LocalDateTime.now());
            }
            audit.customerActiveChanged(actor, user, previous, reason);
        }
        return AdminCustomerResponse.from(user);
    }
}
