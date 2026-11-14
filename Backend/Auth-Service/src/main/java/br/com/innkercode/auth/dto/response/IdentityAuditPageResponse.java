package br.com.innkercode.auth.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;

public record IdentityAuditPageResponse(
        List<IdentityAuditResponse> content, int page, int size, long totalElements, int totalPages
) {
    public static IdentityAuditPageResponse from(Page<IdentityAuditResponse> result) {
        return new IdentityAuditPageResponse(result.getContent(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }
}
