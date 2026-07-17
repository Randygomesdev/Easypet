package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.PetRequest;
import br.com.easypet.pet.dto.response.PetResponse;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class PetMapper {

    public Pet toEntity(PetRequest request, UUID ownerId) {
        return Pet.builder()
                .name(request.name())
                .microchipNumber(request.microchipNumber())
                .species(request.species())
                .breed(request.breed())
                .gender(request.gender())
                .weight(request.weight())
                .birthDate(request.birthDate())
                .ownerId(ownerId)
                .active(true)
                .build();
    }

    public PetResponse toResponse(Pet pet) {
        return new PetResponse(
                pet.getId(),
                pet.getName(),
                pet.getMicrochipNumber(),
                pet.getSpecies(),
                pet.getBreed(),
                pet.getGender(),
                pet.getWeight(),
                pet.getBirthDate(),
                pet.getPictureUrl(),
                pet.getActive(),
                pet.getOwnerId()
        );
    }

    public void updateEntityFromRequest(PetRequest request, Pet pet) {
        pet.setName(request.name());
        pet.setMicrochipNumber(request.microchipNumber());
        pet.setSpecies(request.species());
        pet.setBreed(request.breed());
        pet.setGender(request.gender());
        pet.setWeight(request.weight());
        pet.setBirthDate(request.birthDate());
    }

}
