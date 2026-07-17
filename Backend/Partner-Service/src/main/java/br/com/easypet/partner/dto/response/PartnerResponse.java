package br.com.easypet.partner.dto.response;

import br.com.easypet.partner.domain.model.PartnerCategory;
import java.util.Set;
import java.util.UUID;

public record PartnerResponse(
    UUID id,
    String name,
    String cnpj,
    String legalName,
    String stateRegistration,
    Boolean stateRegistrationExempt,
    String municipalRegistration,
    Boolean municipalRegistrationExempt,
    String email,
    String contactPhone,
    String description,
    String address,
    String number,
    String neighborhood,
    String complement,
    String city,
    String state,
    String zipCode,
    Set<PartnerCategory> categories,
    Set<String> activeModules,
    Integer boardingCapacity,
    Set<String> galleryPictures,
    Double rating,
    String pictureUrl,
    String phone,
    Double latitude,
    Double longitude,
    java.util.List<PartnerBusinessHourResponse> businessHours,
    java.util.List<ServiceResponse> services
) {}
