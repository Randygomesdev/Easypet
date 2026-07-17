package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.entity.Vaccine;
import br.com.easypet.pet.dto.request.VaccineRequest;
import br.com.easypet.pet.dto.response.VaccineResponse;
import org.springframework.stereotype.Component;

@Component
public class VaccineMapper {

    public Vaccine toEntity(VaccineRequest request, Pet pet) {
        return Vaccine.builder()
                .pet(pet)
                .name(request.name())
                .applicationDate(request.applicationDate())
                .nextDoseDate(request.nextDoseDate())
                .status(request.status())
                .vetName(request.vetName())
                .manufacturer(request.manufacturer())
                .lot(request.lot())
                .observations(request.observations())
                .build();
    }

    public VaccineResponse toResponse(Vaccine vaccine) {
        return new VaccineResponse(
                vaccine.getId(),
                vaccine.getName(),
                vaccine.getApplicationDate(),
                vaccine.getNextDoseDate(),
                vaccine.getStatus(),
                vaccine.getVetName(),
                vaccine.getManufacturer(),
                vaccine.getLot(),
                vaccine.getObservations()
        );
    }
}
