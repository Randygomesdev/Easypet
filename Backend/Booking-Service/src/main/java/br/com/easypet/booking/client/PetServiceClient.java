package br.com.easypet.booking.client;

import br.com.easypet.booking.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PetServiceClient {

    private final RestTemplate restTemplate;

    @Value("${PET_SERVICE_URL:http://localhost:8082/api/v1}")
    private String petServiceUrl;

    public UUID getAccessiblePetOwner(UUID petId) {
        try {
            PetAccess pet = restTemplate.getForObject(petServiceUrl + "/pets/{id}", PetAccess.class, petId);
            if (pet != null && pet.ownerId() != null && Boolean.TRUE.equals(pet.active())) {
                return pet.ownerId();
            }
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResourceNotFoundException("Pet não encontrado ou acesso negado.");
        }
        throw new ResourceNotFoundException("Pet não encontrado ou acesso negado.");
    }

    private record PetAccess(UUID ownerId, Boolean active) {}
}
