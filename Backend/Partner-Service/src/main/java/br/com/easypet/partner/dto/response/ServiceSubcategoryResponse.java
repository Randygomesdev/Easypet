package br.com.easypet.partner.dto.response;

import java.util.UUID;

public record ServiceSubcategoryResponse(
    UUID id,
    String name,
    String slug,
    Integer displayOrder
) {}
