package br.com.easypet.pet.dto.response;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.model.PetGender;
import br.com.easypet.pet.domain.model.PetSpecies;

import java.time.LocalDate;
import java.util.UUID;

public record ReceptionPetResponse(
        UUID id, UUID customerId, UUID partnerId, String name, PetSpecies species, String breed,
        PetGender gender, Double weight, LocalDate birthDate, String microchipNumber
) {
    public static ReceptionPetResponse from(Pet pet) {
        return new ReceptionPetResponse(pet.getId(), pet.getReceptionCustomerId(), pet.getReceptionPartnerId(),
                pet.getName(), pet.getSpecies(), pet.getBreed(), pet.getGender(), pet.getWeight(),
                pet.getBirthDate(), pet.getMicrochipNumber());
    }
}
