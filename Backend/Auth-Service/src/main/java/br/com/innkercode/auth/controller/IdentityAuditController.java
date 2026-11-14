package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.domain.model.IdentityAuditAction;
import br.com.innkercode.auth.domain.model.IdentityAuditTarget;
import br.com.innkercode.auth.dto.response.IdentityAuditPageResponse;
import br.com.innkercode.auth.service.IdentityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class IdentityAuditController {

    private final IdentityAuditService audit;

    @GetMapping("/admin/identity-audit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<IdentityAuditPageResponse> list(
            @RequestParam(required = false) IdentityAuditTarget targetType,
            @RequestParam(required = false) UUID targetId,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) UUID partnerId,
            @RequestParam(required = false) IdentityAuditAction action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(audit.search(targetType, targetId, actorId, partnerId, action, page, size));
    }
}
