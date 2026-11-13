package br.com.easypet.pet.controller;

import br.com.easypet.pet.client.CustomerMembershipClient;
import br.com.easypet.pet.config.SecurityConfig;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.PetMapper;
import br.com.easypet.pet.repository.PetRepository;
import br.com.easypet.pet.security.AuthSessionClient;
import br.com.easypet.pet.service.ReceptionPetService;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ReceptionPetController.class)
@Import({SecurityConfig.class, ReceptionPetService.class, PetMapper.class})
class ReceptionPetControllerTest {
    private static final String PET_JSON = """
            {"name":" Pipoca ", "species":"DOG", "breed":"SRD", "gender":"FEMALE",
             "birthDate":"2020-01-01", "weight":8.5, "microchipNumber":" "}
            """;
    private final UUID customer = UUID.randomUUID();
    private final UUID partner = UUID.randomUUID();
    private final String path = "/pets/reception/customers/" + customer;
    private String token;

    @Autowired MockMvc mvc;
    @MockitoBean CustomerMembershipClient memberships;
    @MockitoBean PetRepository pets;
    @MockitoBean AuthSessionClient auth;

    @BeforeEach
    void session() {
        token = bearer("PARTNER");
    }

    @Test
    void onlyPartnerCanReachScopedPetOperations() throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer("CUSTOMER")))
                .andExpect(status().isForbidden());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(memberships, pets);
    }

    @Test
    void allowsDeskStaffAndFailsClosedAfterRevocation() throws Exception {
        String teamBearer = "Bearer team-fixture";
        var session = new AuthSessionClient.Session(UUID.randomUUID(), "TEAM_MEMBER", partner, "RECEPTION",
                List.of("DESK_CUSTOMERS_MANAGE"), UUID.randomUUID());
        when(auth.read(teamBearer)).thenReturn(session).thenReturn(null)
                .thenThrow(new IllegalStateException("unexpected Auth response"));
        when(memberships.requirePartner(customer, teamBearer)).thenReturn(partner);
        UUID pet = UUID.randomUUID();
        mvc.perform(get(path + "/" + pet).header(HttpHeaders.AUTHORIZATION, teamBearer)).andExpect(status().isNotFound());
        mvc.perform(get(path + "/" + pet).header(HttpHeaders.AUTHORIZATION, teamBearer)).andExpect(status().isUnauthorized());
        mvc.perform(get(path + "/" + pet).header(HttpHeaders.AUTHORIZATION, teamBearer)).andExpect(status().isServiceUnavailable());
        verify(memberships).requirePartner(customer, teamBearer);
    }

    @Test
    void persistsOnlyMembershipReturnedByThePartnerService() throws Exception {
        when(memberships.requirePartner(customer, token)).thenReturn(partner);
        UUID id = UUID.randomUUID();
        when(pets.saveAndFlush(any(Pet.class))).thenAnswer(invocation -> {
            Pet pet = invocation.getArgument(0);
            assertEquals(customer, pet.getReceptionCustomerId());
            assertEquals(partner, pet.getReceptionPartnerId());
            assertEquals("pipoca", pet.getReceptionNameKey());
            assertNull(pet.getOwnerId());
            assertNull(pet.getMicrochipNumber());
            pet.setId(id);
            return pet;
        });
        mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content(PET_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Pipoca"))
                .andExpect(jsonPath("$.ownerId").doesNotExist());
    }

    @Test
    void callerCannotSwapPetIdAcrossCustomersAndSearchRemainsScoped() throws Exception {
        when(memberships.requirePartner(customer, token)).thenReturn(partner);
        UUID foreignPet = UUID.randomUUID();
        when(pets.findByIdAndReceptionPartnerIdAndReceptionCustomerIdAndActiveTrue(foreignPet, partner, customer))
                .thenReturn(Optional.empty());
        mvc.perform(get(path + "/" + foreignPet).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isNotFound());
        verify(pets).findByIdAndReceptionPartnerIdAndReceptionCustomerIdAndActiveTrue(foreignPet, partner, customer);
        PageRequest page = PageRequest.of(1, 5, Sort.by("receptionNameKey", "id"));
        when(pets.findByReceptionPartnerIdAndReceptionCustomerIdAndActiveTrueAndReceptionNameKeyContaining(
                partner, customer, "pipo", page)).thenReturn(org.springframework.data.domain.Page.empty(page));
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, token).param("q", "PIPO").param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
    }

    @Test
    void anotherEstablishmentAndUnavailableVerificationFailClosed() throws Exception {
        when(memberships.requirePartner(customer, token))
                .thenThrow(new ResourceNotFoundException("Cliente não encontrado neste escopo."))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Verificação indisponível."));
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isNotFound());
        mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content(PET_JSON))
                .andExpect(status().isServiceUnavailable());
        verifyNoInteractions(pets);
    }

    @Test
    void mapsDuplicateIdentityAndMicrochipToTheSameGenericConflict() throws Exception {
        when(memberships.requirePartner(customer, token)).thenReturn(partner);
        for (String constraint : new String[]{"pets_reception_identity_unique", "pets_microchip_number_key"}) {
            when(pets.saveAndFlush(any(Pet.class))).thenThrow(new DataIntegrityViolationException("duplicate",
                    new ConstraintViolationException("sensitive information", new SQLException(null, "23505"), constraint)));
            mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, token)
                            .contentType(MediaType.APPLICATION_JSON).content(PET_JSON))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.message")
                            .value("Já existe um cadastro com esses dados. Confira o nome, nascimento e microchip do pet."));
            reset(pets);
        }
    }

    private String bearer(String role) {
        String bearer = "Bearer " + UUID.randomUUID();
        when(auth.read(bearer)).thenReturn(new AuthSessionClient.Session(UUID.randomUUID(), role, null, null, List.of(), null));
        return bearer;
    }
}
