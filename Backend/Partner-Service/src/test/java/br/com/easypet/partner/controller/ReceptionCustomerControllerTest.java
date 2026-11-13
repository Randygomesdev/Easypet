package br.com.easypet.partner.controller;

import br.com.easypet.partner.security.AuthSessionClient;
import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.repository.PartnerRepository;
import br.com.easypet.partner.repository.StaffRepository;
import br.com.easypet.partner.domain.entity.Staff;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:reception_customers;MODE=PostgreSQL",
        "BOOKING_PET_SUMMARY_TOKEN=test-summary"})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ReceptionCustomerControllerTest {
    private static final String DESK = "/partners/me/customers";
    private static final String ADMIN = "/admin/reception-customers";
    private static final String INTERNAL = "/internal" + DESK;
    private final UUID ownerA = UUID.randomUUID();
    private final UUID ownerB = UUID.randomUUID();
    private Partner partnerA;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PartnerRepository partners;
    @Autowired StaffRepository staff;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean AuthSessionClient auth;

    @BeforeEach
    void prepare() {
        partnerA = savePartner(ownerA, "Estabelecimento A", true);
        savePartner(ownerB, "Estabelecimento B", true);
    }

    @Test
    void scopesSearchDetailAndMembershipToTheEstablishment() throws Exception {
        String created = create(ownerA, "Ana Souza", "ana@example.test", "(48) 99999-1234")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.partnerId").value(partnerA.getId().toString()))
                .andExpect(jsonPath("$.accountStatus").value("UNCLAIMED"))
                .andExpect(jsonPath("$.phone").value("48999991234"))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();

        mvc.perform(get(DESK).header(HttpHeaders.AUTHORIZATION, bearer(ownerA, "PARTNER"))
                        .param("q", "(48) 99999").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(id))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get(DESK).header(HttpHeaders.AUTHORIZATION, bearer(ownerB, "PARTNER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
        mvc.perform(get(DESK + "/" + id).header(HttpHeaders.AUTHORIZATION, bearer(ownerB, "PARTNER")))
                .andExpect(status().isNotFound());
        mvc.perform(get(INTERNAL + "/" + id + "/membership")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerA, "PARTNER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.customerId").value(id))
                .andExpect(jsonPath("$.email").doesNotExist());
        mvc.perform(get(INTERNAL + "/" + id + "/membership")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerB, "PARTNER")))
                .andExpect(status().isNotFound());
    }

    @Test
    void rejectsNormalizedDuplicatesAndAllowsSharedContactsForDistinctNamesAndPartners() throws Exception {
        create(ownerA, "Ana Souza", "ANA@example.test", "(48) 99999-1234").andExpect(status().isCreated());
        create(ownerA, "  ana  souza ", "ana@example.test", "").andExpect(status().isConflict());
        create(ownerA, "Ana Souza", "", "48999991234").andExpect(status().isConflict());
        create(ownerA, "Marina Souza", "ana@example.test", "48999991234").andExpect(status().isCreated());
        create(ownerB, "Ana Souza", "ana@example.test", "48999991234").andExpect(status().isCreated());
    }

    @Test
    void restrictsAdministrativeListingAndDetailToAdmin() throws Exception {
        String body = create(ownerA, "Raquel Souza", "raquel@example.test", "")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(body).get("id").asText();
        String admin = bearer(UUID.randomUUID(), "ADMIN");

        mvc.perform(get(ADMIN).header("X-User-Role", "ADMIN")).andExpect(status().isUnauthorized());
        mvc.perform(get(ADMIN).header(HttpHeaders.AUTHORIZATION, bearer(ownerA, "PARTNER")))
                .andExpect(status().isForbidden());
        mvc.perform(get(ADMIN + "/" + id).header(HttpHeaders.AUTHORIZATION, bearer(ownerB, "PARTNER")))
                .andExpect(status().isForbidden());
        mvc.perform(get(ADMIN).header(HttpHeaders.AUTHORIZATION, admin).param("q", "RAQUEL"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(id));
        mvc.perform(get(ADMIN + "/" + id).header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.partnerName").value("Estabelecimento A"));
        mvc.perform(get(ADMIN).header(HttpHeaders.AUTHORIZATION, admin).param("size", "101"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sameEmailCannotAccessOrClaimTheDeskRecord() throws Exception {
        String body = create(ownerA, "Ana Souza", "ana@example.test", "")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(body).get("id").asText();
        String sameEmailAccount = bearer(UUID.randomUUID(), "CUSTOMER");
        mvc.perform(get(DESK + "/" + id).header(HttpHeaders.AUTHORIZATION, sameEmailAccount))
                .andExpect(status().isForbidden());
        mvc.perform(post(DESK + "/" + id + "/claim").header(HttpHeaders.AUTHORIZATION, sameEmailAccount))
                .andExpect(status().isForbidden());
        mvc.perform(get(INTERNAL + "/" + id + "/membership").header(HttpHeaders.AUTHORIZATION, sameEmailAccount))
                .andExpect(status().isForbidden());
    }

    @Test
    void requiresContactAndAnActiveEstablishment() throws Exception {
        create(ownerA, "Ana Souza", "", "").andExpect(status().isBadRequest());
        create(ownerA, "Ana Souza", "", "(+)").andExpect(status().isBadRequest());
        UUID inactiveOwner = UUID.randomUUID();
        savePartner(inactiveOwner, "Estabelecimento inativo", false);
        create(inactiveOwner, "Ana Souza", "ana@example.test", "").andExpect(status().isNotFound());
    }

    @Test
    void deskPermissionsAreLiveAndScopedToTheTeamPartner() throws Exception {
        String reception = "Bearer reception-fixture";
        var active = new AuthSessionClient.Session(UUID.randomUUID(), "TEAM_MEMBER", partnerA.getId(), "RECEPTION",
                List.of("DESK_CUSTOMERS_MANAGE"), null, UUID.randomUUID());
        when(auth.read(reception)).thenReturn(active);
        String body = mvc.perform(post(DESK).header(HttpHeaders.AUTHORIZATION, reception)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"Cliente de recepção","email":"recepcao@example.test"}
                                """))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(body).path("id").asText();
        mvc.perform(get(DESK + "/" + id).header(HttpHeaders.AUTHORIZATION, reception)).andExpect(status().isOk());
        mvc.perform(get("/partners/me").header(HttpHeaders.AUTHORIZATION, reception)).andExpect(status().isForbidden());
        mvc.perform(get("/partners/" + partnerA.getId()).header(HttpHeaders.AUTHORIZATION, reception))
                .andExpect(status().isForbidden());
        when(auth.read(reception)).thenReturn(new AuthSessionClient.Session(active.userId(), "TEAM_MEMBER",
                partners.findByUserId(ownerB).orElseThrow().getId(), "MANAGER",
                List.of("DESK_CUSTOMERS_MANAGE"), null, UUID.randomUUID()));
        mvc.perform(get(DESK + "/" + id).header(HttpHeaders.AUTHORIZATION, reception)).andExpect(status().isNotFound());
        when(auth.read(reception)).thenReturn(new AuthSessionClient.Session(active.userId(), "TEAM_MEMBER",
                partnerA.getId(), "PROFESSIONAL", List.of("BOOKINGS_ASSIGNED_READ"), null, active.teamAccessId()));
        mvc.perform(get(DESK).header(HttpHeaders.AUTHORIZATION, reception)).andExpect(status().isForbidden());
        when(auth.read(reception)).thenReturn(null).thenThrow(new IllegalStateException("Auth down"));
        mvc.perform(get(DESK).header(HttpHeaders.AUTHORIZATION, reception)).andExpect(status().isUnauthorized());
        mvc.perform(get(DESK).header(HttpHeaders.AUTHORIZATION, reception)).andExpect(status().isServiceUnavailable());
    }

    @Test
    void staffAssignmentRequiresTheCurrentActiveTeamAccessAndOwningPartner() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID oldAccess = UUID.randomUUID();
        UUID newAccess = UUID.randomUUID();
        var professional = staff.saveAndFlush(Staff.builder().partner(partnerA).name("Profissional fixture").build());
        String path = "/partners/me/staff/" + professional.getId() + "/team-member";
        String resolved = "/internal/partners/me/staff-assignment";
        String owner = bearer(ownerA, "PARTNER");
        String foreign = bearer(ownerB, "PARTNER");
        when(auth.teamAccesses(foreign)).thenReturn(List.of());
        String team = "Bearer staff-fixture";
        var teamSession = new AuthSessionClient.Session(userId, "TEAM_MEMBER", partnerA.getId(), "PROFESSIONAL",
                List.of("BOOKINGS_ASSIGNED_READ"), null, oldAccess);
        when(auth.read(team)).thenReturn(teamSession);
        String payload = json.writeValueAsString(Map.of("userId", userId));
        mvc.perform(put(path).header(HttpHeaders.AUTHORIZATION, team).contentType(MediaType.APPLICATION_JSON)
                .content(payload)).andExpect(status().isForbidden());
        mvc.perform(put(path).header(HttpHeaders.AUTHORIZATION, foreign).contentType(MediaType.APPLICATION_JSON)
                .content(payload)).andExpect(status().isNotFound());
        when(auth.teamAccesses(owner)).thenReturn(List.of(new AuthSessionClient.TeamAccess(
                oldAccess, userId, partnerA.getId(), "PROFESSIONAL", "ACTIVE")));
        mvc.perform(put(path).header(HttpHeaders.AUTHORIZATION, owner).contentType(MediaType.APPLICATION_JSON)
                .content(payload)).andExpect(status().isOk());
        mvc.perform(get(resolved).header(HttpHeaders.AUTHORIZATION, team))
                .andExpect(status().isOk()).andExpect(jsonPath("$.staffId").value(professional.getId().toString()));
        when(auth.read(team)).thenReturn(null).thenReturn(new AuthSessionClient.Session(userId, "TEAM_MEMBER",
                partnerA.getId(), "PROFESSIONAL", List.of("BOOKINGS_ASSIGNED_READ"), null, newAccess));
        mvc.perform(get(resolved).header(HttpHeaders.AUTHORIZATION, team)).andExpect(status().isUnauthorized());
        mvc.perform(get(resolved).header(HttpHeaders.AUTHORIZATION, team)).andExpect(status().isNotFound());
    }

    @Test
    void claimIsScopedToAnActiveTutorAndCannotBeExpiredReplacedOrReplayed() throws Exception {
        String body = create(ownerA, "Cadastro reivindicável", "ana@example.test", "")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String customerId = json.readTree(body).path("id").asText();
        UUID target = UUID.randomUUID();
        String owner = bearer(ownerA, "PARTNER");
        String otherOwner = bearer(ownerB, "PARTNER");
        String tutor = bearer(target, "CUSTOMER");
        String otherTutor = bearer(UUID.randomUUID(), "CUSTOMER");
        String issuePath = DESK + "/" + customerId + "/claims";
        String issueBody = json.writeValueAsString(Map.of("userId", target));
        mvc.perform(post(issuePath).header(HttpHeaders.AUTHORIZATION, otherOwner)
                .contentType(MediaType.APPLICATION_JSON).content(issueBody)).andExpect(status().isNotFound());
        mvc.perform(post(issuePath).header(HttpHeaders.AUTHORIZATION, owner)
                .contentType(MediaType.APPLICATION_JSON).content(issueBody)).andExpect(status().isNotFound());
        when(auth.isClaimTarget(target)).thenReturn(true);
        String expired = issue(issuePath, owner, issueBody);
        jdbc.update("update reception_customer_claims set expires_at = current_timestamp - interval '1' minute where customer_id = ?",
                UUID.fromString(customerId));
        redeem(tutor, expired).andExpect(status().isGone());
        String replaced = issue(issuePath, owner, issueBody);
        String current = issue(issuePath, owner, issueBody);
        redeem(tutor, replaced).andExpect(status().isConflict());
        redeem(otherTutor, current).andExpect(status().isNotFound());
        redeem(tutor, current).andExpect(status().isOk()).andExpect(jsonPath("$.customerId").value(customerId));
        redeem(tutor, current).andExpect(status().isConflict());
        mvc.perform(get("/internal/partners/customer-claims/me").header(HttpHeaders.AUTHORIZATION, tutor))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].customerId").value(customerId));
        mvc.perform(get("/internal/partners/customer-claims/me").header(HttpHeaders.AUTHORIZATION, otherTutor))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        String ownershipPath = "/internal/partners/customer-claims/" + customerId + "/owner";
        mvc.perform(get(ownershipPath).header(HttpHeaders.AUTHORIZATION, "Bearer test-summary")
                        .param("partnerId", partnerA.getId().toString()).param("userId", target.toString()))
                .andExpect(status().isNoContent());
        mvc.perform(get(ownershipPath).header(HttpHeaders.AUTHORIZATION, tutor)
                        .param("partnerId", partnerA.getId().toString()).param("userId", target.toString()))
                .andExpect(status().isUnauthorized());
    }

    private String issue(String path, String bearer, String payload) throws Exception {
        String body = mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).path("token").asText();
    }

    @Test
    void concurrentProofConsumptionGrantsOwnershipOnce() throws Exception {
        String body = create(ownerA, "Cliente concorrente", "race@example.test", "")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String customerId = json.readTree(body).path("id").asText();
        UUID target = UUID.randomUUID();
        when(auth.isClaimTarget(target)).thenReturn(true);
        String token = issue(DESK + "/" + customerId + "/claims", bearer(ownerA, "PARTNER"),
                json.writeValueAsString(Map.of("userId", target)));
        String tutor = bearer(target, "CUSTOMER");
        CountDownLatch start = new CountDownLatch(1);
        Callable<Integer> consume = () -> {
            start.await();
            return redeem(tutor, token).andReturn().getResponse().getStatus();
        };
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(consume);
            var second = executor.submit(consume);
            start.countDown();
            org.assertj.core.api.Assertions.assertThat(List.of(first.get(), second.get()))
                    .containsExactlyInAnyOrder(200, 409);
        }
    }

    private ResultActions redeem(String bearer, String token) throws Exception {
        return mvc.perform(post("/partners/customer-claims/redeem").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("token", token))));
    }

    private ResultActions create(UUID owner, String name, String email, String phone) throws Exception {
        return mvc.perform(post(DESK).header(HttpHeaders.AUTHORIZATION, bearer(owner, "PARTNER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name", name, "email", email, "phone", phone))));
    }

    private Partner savePartner(UUID userId, String name, boolean active) {
        String cnpj = Long.toString(10_000_000_000_000L + Math.floorMod(userId.getLeastSignificantBits(), 90_000_000_000_000L));
        return partners.saveAndFlush(Partner.builder().userId(userId).name(name).legalName(name)
                .cnpj(cnpj).active(active).build());
    }

    private String bearer(UUID userId, String role) {
        String bearer = "Bearer " + UUID.randomUUID();
        when(auth.read(bearer)).thenReturn(new AuthSessionClient.Session(userId, role, null, null, List.of(), null, null));
        return bearer;
    }
}
