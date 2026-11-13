package br.com.easypet.pet.controller;

import br.com.easypet.pet.config.SecurityConfig;
import br.com.easypet.pet.client.CustomerMembershipClient;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.model.PetSpecies;
import br.com.easypet.pet.repository.PetRepository;
import br.com.easypet.pet.security.AuthSessionClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = BookingPetSummaryController.class, properties = "BOOKING_PET_SUMMARY_TOKEN=test-summary")
@Import(SecurityConfig.class)
class BookingPetSummaryControllerTest {
    private final UUID id = UUID.randomUUID();
    private final String path = "/internal/pets/" + id + "/booking-summary";

    @Autowired MockMvc mvc;
    @MockitoBean PetRepository pets;
    @MockitoBean AuthSessionClient auth;
    @MockitoBean CustomerMembershipClient memberships;

    @Test
    void rejectsOtherCredentialsBeforeReadingThePet() throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, "Bearer customer-session"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(auth, pets);
    }

    @Test
    void enforcesTheOriginAndReturnsOnlyPetIdentification() throws Exception {
        UUID owner = UUID.randomUUID();
        String bearer = "Bearer test-summary";
        when(pets.findById(id)).thenReturn(Optional.of(Pet.builder().id(id).ownerId(owner)
                .name("Lua").species(PetSpecies.DOG).active(false).build()));
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer).param("ownerId", owner.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Lua"))
                .andExpect(jsonPath("$.species").value("DOG")).andExpect(jsonPath("$.ownerId").doesNotExist());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer).param("ownerId", UUID.randomUUID().toString()))
                .andExpect(status().isNotFound());

        UUID reception = UUID.randomUUID();
        UUID partner = UUID.randomUUID();
        when(pets.findById(id)).thenReturn(Optional.of(Pet.builder().id(id).name("Mel").species(PetSpecies.CAT)
                .receptionCustomerId(reception).receptionPartnerId(partner).build()));
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer).param("receptionCustomerId", reception.toString())
                .param("partnerId", partner.toString())).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Mel"));
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer).param("receptionCustomerId", reception.toString())
                .param("partnerId", UUID.randomUUID().toString())).andExpect(status().isNotFound());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer).param("receptionCustomerId", reception.toString())
                .param("partnerId", partner.toString()).param("ownerId", owner.toString()))
                .andExpect(status().isBadRequest());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer).param("ownerId", owner.toString()))
                .andExpect(status().isNotFound());
        when(memberships.isClaimOwner(partner, reception, owner)).thenReturn(true);
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer).param("ownerId", owner.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Mel"));
        verifyNoInteractions(auth);
    }
}
