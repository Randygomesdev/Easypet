package br.com.easypet.partner.mapper;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.entity.ServiceOffer;
import br.com.easypet.partner.dto.request.PartnerRequest;
import br.com.easypet.partner.dto.response.PartnerResponse;
import br.com.easypet.partner.dto.response.ServiceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PartnerMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "services", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Partner toEntity(PartnerRequest request);

    PartnerResponse toResponse(Partner partner);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "services", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(PartnerRequest request, @MappingTarget Partner partner);

    // Mapeamento individual de serviço (usado automaticamente para a lista no PartnerResponse)
    ServiceResponse toServiceResponse(ServiceOffer service);
}
