package br.com.easypet.partner.dto.response;

import br.com.easypet.partner.domain.model.BookingType;

import java.util.List;
import java.util.UUID;

public record ServiceCategoryResponse(
    UUID id,
    String name,
    String slug,
    String description,
    String icon,
    BookingType bookingType,
    Integer displayOrder,
    List<ServiceSubcategoryResponse> subcategories
) {}
