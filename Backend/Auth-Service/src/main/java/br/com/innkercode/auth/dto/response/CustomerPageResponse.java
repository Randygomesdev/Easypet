package br.com.innkercode.auth.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;

public record CustomerPageResponse(
        List<AdminCustomerResponse> content, int page, int size, long totalElements, int totalPages
) {
    public static CustomerPageResponse from(Page<AdminCustomerResponse> result) {
        return new CustomerPageResponse(result.getContent(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }
}
