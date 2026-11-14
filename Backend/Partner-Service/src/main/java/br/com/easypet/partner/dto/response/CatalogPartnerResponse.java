package br.com.easypet.partner.dto.response;

import br.com.easypet.partner.domain.model.PartnerCategory;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public record CatalogPartnerResponse(
        UUID id, String name, String description, String address, String number,
        String neighborhood, String city, String state, String zipCode,
        Set<PartnerCategory> categories, Set<String> galleryPictures, Double rating,
        String pictureUrl, Double latitude, Double longitude,
        List<PartnerBusinessHourResponse> businessHours, List<ServiceResponse> services
) {
    public static CatalogPartnerResponse from(PartnerResponse partner) {
        return new CatalogPartnerResponse(partner.id(), partner.name(), partner.description(),
                partner.address(), partner.number(), partner.neighborhood(), partner.city(), partner.state(),
                partner.zipCode(), partner.categories(), partner.galleryPictures(), partner.rating(),
                partner.pictureUrl(), partner.latitude(), partner.longitude(), partner.businessHours(),
                partner.services().stream().filter(service -> Boolean.TRUE.equals(service.active())).toList());
    }
}
