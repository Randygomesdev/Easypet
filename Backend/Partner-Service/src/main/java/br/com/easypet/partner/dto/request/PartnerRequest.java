package br.com.easypet.partner.dto.request;

import br.com.easypet.partner.domain.model.PartnerCategory;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.br.CNPJ;
import java.util.Set;

public record PartnerRequest(
    @NotBlank(message = "O nome é obrigatório")
    String name,

    @NotBlank(message = "O CNPJ é obrigatório")
    @jakarta.validation.constraints.Pattern(regexp = "\\d{14}", message = "O CNPJ deve conter exatamente 14 números")
    String cnpj,

    @NotBlank(message = "A razão social é obrigatória")
    String legalName,

    String stateRegistration,
    Boolean stateRegistrationExempt,
    String municipalRegistration,
    Boolean municipalRegistrationExempt,

    @jakarta.validation.constraints.Email(message = "E-mail inválido")
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
    String pictureUrl,
    String phone,
    Double latitude,
    Double longitude,
    java.util.List<PartnerBusinessHourRequest> businessHours,
    java.util.List<ServiceOfferRequest> services
) {}
