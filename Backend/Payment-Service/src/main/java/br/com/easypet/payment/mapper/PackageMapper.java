package br.com.easypet.payment.mapper;

import br.com.easypet.payment.domain.entity.CustomerPackage;
import br.com.easypet.payment.domain.entity.PackageTemplate;
import br.com.easypet.payment.dto.request.PackageTemplateRequest;
import br.com.easypet.payment.dto.response.CustomerPackageResponse;
import br.com.easypet.payment.dto.response.PackageTemplateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PackageMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "isActive", constant = "true")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    PackageTemplate toEntity(PackageTemplateRequest request);

    PackageTemplateResponse toResponse(PackageTemplate template);

    @Mapping(target = "templateId", source = "packageTemplate.id")
    @Mapping(target = "templateName", source = "packageTemplate.name")
    CustomerPackageResponse toResponse(CustomerPackage customerPackage);
}
