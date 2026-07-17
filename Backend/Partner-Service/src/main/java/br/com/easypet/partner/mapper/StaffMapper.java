package br.com.easypet.partner.mapper;

import br.com.easypet.partner.domain.entity.Staff;
import br.com.easypet.partner.domain.entity.StaffSchedule;
import br.com.easypet.partner.domain.entity.StaffAbsence;
import br.com.easypet.partner.domain.entity.ServiceOffer;
import br.com.easypet.partner.dto.request.StaffRequest;
import br.com.easypet.partner.dto.request.StaffScheduleRequest;
import br.com.easypet.partner.dto.request.StaffAbsenceRequest;
import br.com.easypet.partner.dto.response.StaffResponse;
import br.com.easypet.partner.dto.response.StaffScheduleResponse;
import br.com.easypet.partner.dto.response.StaffAbsenceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface StaffMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "partner", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "services", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Staff toEntity(StaffRequest request);

    @Mapping(target = "partnerId", source = "partner.id")
    @Mapping(target = "serviceIds", source = "services", qualifiedByName = "mapServicesToIds")
    StaffResponse toResponse(Staff staff);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "partner", ignore = true)
    @Mapping(target = "services", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntityFromRequest(StaffRequest request, @MappingTarget Staff staff);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "staff", ignore = true)
    StaffSchedule toEntity(StaffScheduleRequest request);

    @Mapping(target = "staffId", source = "staff.id")
    StaffScheduleResponse toResponse(StaffSchedule schedule);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "staff", ignore = true)
    StaffAbsence toEntity(StaffAbsenceRequest request);

    @Mapping(target = "staffId", source = "staff.id")
    StaffAbsenceResponse toResponse(StaffAbsence absence);

    @Named("mapServicesToIds")
    default Set<UUID> mapServicesToIds(Set<ServiceOffer> services) {
        if (services == null) {
            return null;
        }
        return services.stream()
                .map(ServiceOffer::getId)
                .collect(Collectors.toSet());
    }
}
