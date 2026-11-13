package br.com.easypet.booking.client;

import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.exception.PetAccessUnavailableException;
import br.com.easypet.booking.exception.BookingUnavailableException;
import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.dto.response.BookingPetSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PetServiceClient {

    private final RestTemplate restTemplate;

    @Value("${PET_SERVICE_URL:http://localhost:8082/api/v1}")
    private String petServiceUrl;

    @Value("${app.booking-pet-summary-token:}")
    private String summaryToken;

    public BookingPetSummary getBookingSummary(Booking booking) {
        if (summaryToken.isBlank()) {
            throw new BookingUnavailableException("Não foi possível consultar o cadastro do pet. Tente novamente.");
        }
        var uri = UriComponentsBuilder.fromUriString(petServiceUrl).path("/internal/pets/{id}/booking-summary");
        if (booking.getReceptionCustomerId() == null) {
            uri.queryParam("ownerId", booking.getUserId());
        } else {
            uri.queryParam("receptionCustomerId", booking.getReceptionCustomerId())
                    .queryParam("partnerId", booking.getPartnerId());
        }
        var headers = new HttpHeaders();
        headers.setBearerAuth(summaryToken);
        try {
            var response = restTemplate.exchange(uri.buildAndExpand(booking.getPetId()).toUri(), HttpMethod.GET,
                    new HttpEntity<>(headers), BookingPetSummary.class);
            var pet = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || pet == null || !booking.getPetId().equals(pet.id())
                    || pet.name() == null || pet.name().isBlank() || pet.species() == null || pet.species().isBlank()) {
                throw new BookingUnavailableException("Não foi possível consultar o cadastro do pet. Tente novamente.");
            }
            return pet;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("Cadastro do pet não encontrado.");
        } catch (RestClientException ex) {
            throw new BookingUnavailableException("Não foi possível consultar o cadastro do pet. Tente novamente.", ex);
        }
    }

    public UUID getAccessiblePetOwner(UUID petId) {
        try {
            PetAccess pet = restTemplate.getForObject(petServiceUrl + "/pets/{id}", PetAccess.class, petId);
            if (pet != null && pet.ownerId() != null && Boolean.TRUE.equals(pet.active())) {
                return pet.ownerId();
            }
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Forbidden e) {
            throw new ResourceNotFoundException("Pet não encontrado ou acesso negado.");
        } catch (RestClientException e) {
            throw new BookingUnavailableException("Não foi possível consultar o pet. Tente novamente.", e);
        }
        throw new ResourceNotFoundException("Pet não encontrado ou acesso negado.");
    }

    private record PetAccess(UUID ownerId, Boolean active) {}

    public void requireReceptionPet(UUID partnerId, UUID customerId, UUID petId) {
        try {
            ReceptionPet pet = restTemplate.getForObject(petServiceUrl + "/pets/reception/customers/{customerId}/{petId}",
                    ReceptionPet.class, customerId, petId);
            if (pet != null && partnerId.equals(pet.partnerId()) && customerId.equals(pet.customerId()) && petId.equals(pet.id())) {
                return;
            }
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Forbidden ex) {
            throw new ResourceNotFoundException("Pet de balcão não encontrado no estabelecimento.");
        } catch (RestClientException ex) {
            throw new PetAccessUnavailableException();
        }
        throw new ResourceNotFoundException("Pet de balcão não encontrado no estabelecimento.");
    }

    private record ReceptionPet(UUID id, UUID customerId, UUID partnerId) {}
}
