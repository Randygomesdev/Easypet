package br.com.easypet.partner.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.Set;
import java.util.UUID;

public record StaffRequest(
    @NotBlank(message = "O nome do profissional é obrigatório")
    String name,
    String photoUrl,
    String jobTitle,
    String speciality,
    String phone,
    String email,
    String whatsapp,
    String status,       // ACTIVE, INACTIVE
    Set<UUID> serviceIds
) {}
