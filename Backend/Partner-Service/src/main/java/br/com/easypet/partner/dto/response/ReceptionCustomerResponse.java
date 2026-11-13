package br.com.easypet.partner.dto.response;

import br.com.easypet.partner.domain.entity.ReceptionCustomer;

import java.time.Instant;
import java.util.UUID;

public record ReceptionCustomerResponse(
        UUID id, UUID partnerId, String partnerName, String name,
        String email, String phone, String accountStatus, Instant createdAt
) {
    public static ReceptionCustomerResponse from(ReceptionCustomer customer) {
        return new ReceptionCustomerResponse(customer.getId(), customer.getPartner().getId(),
                customer.getPartner().getName(), customer.getName(), customer.getEmail(), customer.getPhone(),
                customer.getClaimedUserId() == null ? "UNCLAIMED" : "CLAIMED", customer.getCreatedAt());
    }
}
