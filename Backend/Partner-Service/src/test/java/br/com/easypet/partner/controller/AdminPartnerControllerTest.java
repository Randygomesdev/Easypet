package br.com.easypet.partner.controller;

import br.com.easypet.partner.config.SecurityConfig;
import br.com.easypet.partner.domain.model.PartnerCategory;
import br.com.easypet.partner.dto.response.PartnerResponse;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.security.AuthSessionClient;
import br.com.easypet.partner.service.PartnerService;
import br.com.easypet.partner.service.PartnerAdministrationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminPartnerController.class)
@Import({SecurityConfig.class})
class AdminPartnerControllerTest {

    private static final String PATH = "/api/v1/admin/partners";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private PartnerService partnerService;
    @MockitoBean
    private PartnerAdministrationService administration;

    @MockitoBean
    private AuthSessionClient auth;

    @Test
    void anonymousAndForgedHeaderCannotReadAdministrativeData() throws Exception {
        mvc.perform(get(PATH).contextPath("/api/v1").header("X-User-Role", "ADMIN"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get(PATH + "/" + UUID.randomUUID()).contextPath("/api/v1"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(partnerService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"PARTNER", "CUSTOMER", "MASTER"})
    void otherRolesCannotReadAdministrativeData(String role) throws Exception {
        String bearer = bearer(role);
        mvc.perform(get(PATH).contextPath("/api/v1").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
        mvc.perform(get(PATH + "/" + UUID.randomUUID()).contextPath("/api/v1")
                        .header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
        verifyNoInteractions(partnerService);
    }

    @Test
    void adminCanSearchWithFiltersAndPagination() throws Exception {
        PartnerCategory category = PartnerCategory.values()[0];
        when(administration.list(true, category, "Pet de teste", PageRequest.of(2, 3)))
                .thenReturn(Page.empty(PageRequest.of(2, 3)));

        mvc.perform(get(PATH).contextPath("/api/v1")
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN"))
                        .param("category", category.name()).param("name", "Pet de teste")
                        .param("page", "2").param("size", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(2))
                .andExpect(jsonPath("$.size").value(3))
                .andExpect(jsonPath("$.content").isEmpty());
    }

    @Test
    void adminCanReadPartnerDetailsAndGetsNotFoundForUnknownId() throws Exception {
        UUID existingId = UUID.randomUUID();
        UUID missingId = UUID.randomUUID();
        PartnerResponse response = mock(PartnerResponse.class);
        when(response.id()).thenReturn(existingId);
        when(response.legalName()).thenReturn("Nome fiscal de teste");
        when(partnerService.findById(existingId)).thenReturn(response);
        when(partnerService.findById(missingId)).thenThrow(new ResourceNotFoundException("Parceiro não encontrado"));

        String bearer = bearer("ADMIN");
        mvc.perform(get(PATH + "/" + existingId).contextPath("/api/v1")
                        .header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(existingId.toString()))
                .andExpect(jsonPath("$.legalName").value("Nome fiscal de teste"));
        mvc.perform(get(PATH + "/" + missingId).contextPath("/api/v1")
                        .header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isNotFound());
    }

    private String bearer(String role) {
        String bearer = "Bearer " + UUID.randomUUID();
        when(auth.read(bearer)).thenReturn(new AuthSessionClient.Session(UUID.randomUUID(), role, null, null, List.of(), null, null));
        return bearer;
    }
}
