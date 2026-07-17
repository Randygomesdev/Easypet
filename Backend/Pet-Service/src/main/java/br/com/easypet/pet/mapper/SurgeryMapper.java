package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.entity.Surgery;
import br.com.easypet.pet.dto.request.SurgeryRequest;
import br.com.easypet.pet.dto.response.SurgeryResponse;
import org.springframework.stereotype.Component;

@Component
public class SurgeryMapper {

    public Surgery toEntity(SurgeryRequest request, Pet pet) {
        return Surgery.builder()
                .pet(pet)
                .description(request.description())
                .date(request.date())
                .vetName(request.vetName())
                .providerId(request.providerId())
                .anesthesiaType(request.anesthesiaType())
                .postOperativeInstructions(request.postOperativeInstructions())
                .status(request.status())
                .certified(false)
                .build();
    }

    public SurgeryResponse toResponse(Surgery entity) {
        return new SurgeryResponse(
                entity.getId(),
                entity.getDescription(),
                entity.getDate(),
                entity.getVetName(),
                entity.getProviderId(),
                entity.getAnesthesiaType(),
                entity.getPostOperativeInstructions(),
                entity.getStatus(),
                entity.getCertified()
        );
    }
}
