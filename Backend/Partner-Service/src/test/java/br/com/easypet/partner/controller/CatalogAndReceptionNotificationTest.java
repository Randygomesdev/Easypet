package br.com.easypet.partner.controller;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.entity.ServiceOffer;
import br.com.easypet.partner.domain.model.PartnerCategory;
import br.com.easypet.partner.repository.PartnerRepository;
import br.com.easypet.partner.repository.ReceptionNotificationAuthorizationRepository;
import br.com.easypet.partner.repository.ServiceOfferRepository;
import br.com.easypet.partner.security.AuthSessionClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=${S04_H2_TEST_DB_URL:jdbc:h2:mem:partner_h2_scope;MODE=PostgreSQL}",
        "spring.datasource.username=${S04_H2_TEST_DB_USER:sa}",
        "spring.datasource.password=${S04_H2_TEST_DB_PASSWORD:}",
        "spring.datasource.driver-class-name=${S04_H2_TEST_DB_DRIVER:org.h2.Driver}",
        "spring.jpa.database-platform=${S04_H2_TEST_DB_DIALECT:org.hibernate.dialect.H2Dialect}",
        "spring.jpa.properties.hibernate.dialect=${S04_H2_TEST_DB_DIALECT:org.hibernate.dialect.H2Dialect}",
        "spring.jpa.hibernate.ddl-auto=${S04_H2_TEST_DB_DDL:create-drop}",
        "spring.flyway.enabled=${S04_H2_TEST_DB_FLYWAY:false}",
        "RECEPTION_NOTIFICATION_TOKEN=only-notification-fixture"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class CatalogAndReceptionNotificationTest {
    private static final String CATALOG = "/partners/catalog";
    private static final String DESK = "/partners/me/customers";
    private static final String NOTIFICATION = "Bearer only-notification-fixture";
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private PartnerRepository partners;
    @Autowired private ServiceOfferRepository services;
    @Autowired private ReceptionNotificationAuthorizationRepository authorizations;
    @Autowired private JdbcTemplate jdbc;
    @MockitoBean private AuthSessionClient auth;

    @Test
    void catalogCombinesCategoryWithNameCityAndActiveServiceWithoutDuplicatingRows() throws Exception {
        Partner first = partner("Catálogo Amarelo", "Lagoa de Quartzito", true, PartnerCategory.PETSHOP);
        Partner second = partner("Catálogo Amarelo", "Cidade de Teste", true, PartnerCategory.PETSHOP);
        Partner otherCategory = partner("Clínica Azul", "Cidade de Teste", true, PartnerCategory.CLINIC);
        Partner inactive = partner("Catálogo Inativo", "Cidade de Teste", false, PartnerCategory.PETSHOP);
        Partner obsoleteService = partner("Catálogo Púrpura", "Cidade de Teste", true, PartnerCategory.PETSHOP);
        service(first, "Corte Quartzo H2", true);
        service(first, "Corte Quartzo H2 especial", true);
        service(first, "Serviço indisponível H2", false);
        service(second, "Corte Quartzo H2", true);
        service(otherCategory, "Corte Quartzo H2", true);
        service(inactive, "Corte Quartzo H2", true);
        service(obsoleteService, "Corte Quartzo H2", false);
        String tutor = session(UUID.randomUUID(), "CUSTOMER", null, List.of());

        String firstId = pageOne(tutor, "  QUARTZO H2 ", 0);
        String secondId = pageOne(tutor, "  QUARTZO H2 ", 1);
        assertThat(List.of(firstId, secondId)).containsExactlyInAnyOrder(first.getId().toString(), second.getId().toString());
        assertThat(pageOne(tutor, "quartzo h2", 0)).isEqualTo(firstId);

        mvc.perform(get(CATALOG).header(HttpHeaders.AUTHORIZATION, tutor).param("name", "quartzito").param("category", "PETSHOP"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(first.getId().toString()))
                .andExpect(jsonPath("$.content[0].services.length()").value(2))
                .andExpect(jsonPath("$.content[0].cnpj").doesNotExist());
        mvc.perform(get(CATALOG).header(HttpHeaders.AUTHORIZATION, tutor).param("name", "Catálogo Amarelo").param("category", "CLINIC"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(CATALOG + "/" + first.getId()).header(HttpHeaders.AUTHORIZATION, tutor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.services.length()").value(2));
        mvc.perform(get(CATALOG + "/" + inactive.getId()).header(HttpHeaders.AUTHORIZATION, tutor))
                .andExpect(status().isNotFound());
    }

    @Test
    void catalogTreatsWildcardsLiterallyAndPreservesBarriersAndPageLimit() throws Exception {
        Partner literal = partner("Fidelidade H2 100%_Fictícia", "Cidade", true, PartnerCategory.PETSHOP);
        partner("Fidelidade H2 100XXFictícia", "Cidade", true, PartnerCategory.PETSHOP);
        String tutor = session(UUID.randomUUID(), "CUSTOMER", null, List.of());
        mvc.perform(get(CATALOG).param("name", "100%_fictícia")).andExpect(status().isUnauthorized());
        mvc.perform(get(CATALOG).header(HttpHeaders.AUTHORIZATION, tutor)
                        .param("name", "100%_fictícia").param("size", "101").param("sort", "name,desc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(literal.getId().toString()));
        mvc.perform(get(CATALOG).header(HttpHeaders.AUTHORIZATION, tutor).param("sort", "cnpj,desc"))
                .andExpect(status().isBadRequest());
        mvc.perform(get(CATALOG).header(HttpHeaders.AUTHORIZATION, tutor).param("category", "UNKNOWN"))
                .andExpect(status().isBadRequest());
        when(auth.read(tutor)).thenThrow(new IllegalStateException("fixture Auth indisponível"));
        mvc.perform(get(CATALOG).header(HttpHeaders.AUTHORIZATION, tutor)).andExpect(status().isServiceUnavailable());
    }

    @Test
    void consentRequiresAnAuthorizedOperatorAndActiveGrantAndCannotBeRestoredByAnOldRequest() throws Exception {
        Partner shop = partner("Balcão autorizado", "Cidade", true, PartnerCategory.PETSHOP);
        Partner foreign = partner("Outro estabelecimento", "Cidade", true, PartnerCategory.PETSHOP);
        String owner = session(shop.getUserId(), "PARTNER", null, List.of());
        UUID operatorId = UUID.randomUUID();
        String reception = session(operatorId, "TEAM_MEMBER", shop.getId(), List.of("DESK_CUSTOMERS_MANAGE"));
        String otherOwner = session(foreign.getUserId(), "PARTNER", null, List.of());
        UUID customer = create(owner, "consentimento@example.test");
        String path = DESK + "/" + customer + "/notification-email";
        String internal = recipientPath(shop.getId(), customer);
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, otherOwner)).andExpect(status().isNotFound());
        change(path, otherOwner, true, 0, true).andExpect(status().isNotFound());
        change(path, session(UUID.randomUUID(), "TEAM_MEMBER", shop.getId(), List.of("BOOKINGS_ASSIGNED_READ")),
                true, 0, true).andExpect(status().isForbidden());
        change(path, session(UUID.randomUUID(), "CUSTOMER", null, List.of()), true, 0, true).andExpect(status().isForbidden());
        mvc.perform(get(internal)).andExpect(status().isUnauthorized());
        mvc.perform(get(internal).header(HttpHeaders.AUTHORIZATION, owner)).andExpect(status().isUnauthorized());
        recipient(internal).andExpect(status().isNotFound()).andExpect(jsonPath("$.email").doesNotExist());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, reception)).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("NOT_GRANTED"));
        change(path, reception, true, 0, false).andExpect(status().isBadRequest());

        change(path, reception, true, 0, true).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("AUTHORIZED")).andExpect(jsonPath("$.revision").value(1));
        change(path, reception, true, 1, true).andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(1));
        JsonNode recipient = body(recipient(internal).andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.email").value("consentimento@example.test")).andExpect(jsonPath("$.grantedBy").doesNotExist()));
        UUID grantId = UUID.fromString(recipient.path("authorizationId").asText());
        assertThat(authorizations.findById(grantId).orElseThrow().getGrantedBy()).isEqualTo(operatorId);
        recipient(recipientPath(foreign.getId(), customer)).andExpect(status().isNotFound());

        when(auth.read(reception)).thenReturn(null);
        change(path, reception, false, 1, false).andExpect(status().isUnauthorized());
        change(path, owner, false, 1, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("REVOKED")).andExpect(jsonPath("$.revision").value(2));
        assertThat(authorizations.findById(grantId).orElseThrow().getRevokedBy()).isEqualTo(shop.getUserId());
        change(path, owner, false, 2, false).andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2));
        recipient(internal).andExpect(status().isNotFound());
        change(path, owner, true, 0, true).andExpect(status().isConflict());
        change(path, owner, true, 2, true).andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(3));
        assertThat(body(recipient(internal).andExpect(status().isOk())).path("authorizationId").asText())
                .isNotEqualTo(grantId.toString());
        shop.setActive(false);
        partners.saveAndFlush(shop);
        recipient(internal).andExpect(status().isNotFound());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, owner)).andExpect(status().isNotFound());
    }

    @Test
    void consentCannotBeInferredFromAContactChangeOrFollowAClaimedAccount() throws Exception {
        Partner shop = partner("Balcão contatos", "Cidade", true, PartnerCategory.PETSHOP);
        String owner = session(shop.getUserId(), "PARTNER", null, List.of());
        UUID customer = create(owner, "original@example.test");
        String path = DESK + "/" + customer + "/notification-email";
        String internal = recipientPath(shop.getId(), customer);
        UUID withoutEmail = UUID.fromString(body(mvc.perform(post(DESK).header(HttpHeaders.AUTHORIZATION, owner)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"Cadastro sem e-mail","phone":"48999990001"}
                                """)).andExpect(status().isCreated())).path("id").asText());
        String withoutEmailPath = DESK + "/" + withoutEmail + "/notification-email";
        mvc.perform(get(withoutEmailPath).header(HttpHeaders.AUTHORIZATION, owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("UNAVAILABLE"));
        change(withoutEmailPath, owner, true, 0, true, "inventado@example.test").andExpect(status().isConflict());
        recipient(recipientPath(shop.getId(), withoutEmail)).andExpect(status().isNotFound());

        change(path, owner, true, 0, true, "original@example.test").andExpect(status().isOk());
        jdbc.update("update reception_customers set email=? where id=?", "changed@example.test", customer);
        recipient(internal).andExpect(status().isNotFound());
        change(path, owner, true, 1, true, "original@example.test").andExpect(status().isConflict());
        change(path, owner, true, 1, true, "changed@example.test")
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(3));
        recipient(internal).andExpect(jsonPath("$.email").value("changed@example.test"));

        UUID tutor = UUID.randomUUID();
        when(auth.isClaimTarget(tutor)).thenReturn(true);
        String token = body(mvc.perform(post(DESK + "/" + customer + "/claims").header(HttpHeaders.AUTHORIZATION, owner)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("userId", tutor))))
                .andExpect(status().isCreated())).path("token").asText();
        mvc.perform(post("/partners/customer-claims/redeem").header(HttpHeaders.AUTHORIZATION, session(tutor, "CUSTOMER", null, List.of()))
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("token", token))))
                .andExpect(status().isOk());
        recipient(internal).andExpect(status().isNotFound());
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, owner)).andExpect(jsonPath("$.state").value("UNAVAILABLE"));
        change(path, owner, true, 3, true, "changed@example.test").andExpect(status().isConflict());
    }

    @Test
    void concurrentGrantsAgainstTheSameRevisionProduceOnlyOneAuthorization() throws Exception {
        Partner shop = partner("Balcão concorrente", "Cidade", true, PartnerCategory.PETSHOP);
        String owner = session(shop.getUserId(), "PARTNER", null, List.of());
        UUID customer = create(owner, "concorrencia@example.test");
        String path = DESK + "/" + customer + "/notification-email";
        CountDownLatch ready = new CountDownLatch(1);
        Callable<Integer> grant = () -> {
            ready.await();
            return change(path, owner, true, 0, true, "concorrencia@example.test").andReturn().getResponse().getStatus();
        };
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(grant);
            var second = executor.submit(grant);
            ready.countDown();
            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(200, 409);
        }
        assertThat(jdbc.queryForObject("select count(*) from reception_notification_authorizations where customer_id=?",
                Integer.class, customer)).isEqualTo(1);
    }

    private String pageOne(String bearer, String term, int page) throws Exception {
        return body(mvc.perform(get(CATALOG).header(HttpHeaders.AUTHORIZATION, bearer).param("name", term)
                        .param("category", "PETSHOP").param("page", String.valueOf(page)).param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))).path("content").get(0).path("id").asText();
    }

    private Partner partner(String name, String city, boolean active, PartnerCategory category) {
        UUID owner = UUID.randomUUID();
        String cnpj = Long.toString(10_000_000_000_000L + Math.floorMod(owner.getLeastSignificantBits(), 90_000_000_000_000L));
        return partners.saveAndFlush(Partner.builder().userId(owner).name(name).legalName(name)
                .city(city).active(active).cnpj(cnpj).categories(Set.of(category)).build());
    }

    private void service(Partner partner, String name, boolean active) {
        services.saveAndFlush(ServiceOffer.builder().partner(partner).name(name).active(active)
                .price(BigDecimal.TEN).durationMinutes(30).build());
    }

    private String session(UUID userId, String role, UUID partnerId, List<String> permissions) {
        String bearer = "Bearer " + UUID.randomUUID();
        when(auth.read(bearer)).thenReturn(new AuthSessionClient.Session(userId, role, partnerId, null, permissions, null, null));
        return bearer;
    }

    private UUID create(String bearer, String email) throws Exception {
        return UUID.fromString(body(mvc.perform(post(DESK).header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Cadastro de teste", "email", email))))
                .andExpect(status().isCreated())).path("id").asText());
    }

    private ResultActions change(String path, String actor, boolean authorized, long revision, boolean confirmed) throws Exception {
        return change(path, actor, authorized, revision, confirmed, "consentimento@example.test");
    }

    private ResultActions change(String path, String actor, boolean authorized, long revision, boolean confirmed,
                                 String email) throws Exception {
        return mvc.perform(put(path).header(HttpHeaders.AUTHORIZATION, actor).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("authorized", authorized, "expectedRevision", revision,
                        "confirmedInPerson", confirmed, "confirmedEmail", email))));
    }

    private static String recipientPath(UUID partner, UUID customer) {
        return "/internal/partners/" + partner + "/reception-customers/" + customer + "/notification-recipient";
    }

    private ResultActions recipient(String path) throws Exception {
        return mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, NOTIFICATION));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
