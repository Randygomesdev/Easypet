package br.com.easypet.partner.dto.response;

import br.com.easypet.partner.domain.model.StaffStatus;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public record StaffResponse(
    UUID id,
    UUID partnerId,
    String name,
    String photoUrl,
    String jobTitle,
    String speciality,
    String phone,
    String email,
    String whatsapp,
    StaffStatus status,
    Set<UUID> serviceIds,
    LocalDateTime createdAt
) {}
