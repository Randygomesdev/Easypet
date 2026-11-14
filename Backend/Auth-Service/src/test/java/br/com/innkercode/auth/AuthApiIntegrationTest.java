package br.com.innkercode.auth;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.security.JwtService;
import br.com.innkercode.auth.dto.request.RegisterRequest;
import br.com.innkercode.auth.service.AuthService;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.service.PartnerOwnershipClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import javax.sql.DataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "AUTH_DB_URL=${S02_PG_URL:}",
        "AUTH_DB_USERNAME=${S02_PG_USERNAME:s02test}",
        "AUTH_DB_PASSWORD=${S02_PG_PASSWORD:s02-local-test-only}",
        "JWT_SECRET=s02-test-shared-secret-for-auth-api",
        "AUTH_TEAM_JWT_SECRET=s02-test-private-team-secret-for-auth-api",
        "AUTH_S02_ENABLED=true",
        "AUTH_MAIL_ENABLED=true",
        "PARTNER_SERVICE_URL=http://partner-service:8083/api/v1",
        "management.health.mail.enabled=false",
        "MAIL_HOST=127.0.0.1",
        "MAIL_SMTP_AUTH=false",
        "MAIL_STARTTLS_ENABLED=false",
        "MAIL_FROM=auth@example.test",
        "NOTIFICATION_RECIPIENT_TOKEN=local-notification-recipient-token",
        "RECEPTION_CLAIM_TOKEN=local-reception-claim-token",
        "FRONTEND_URL=http://localhost:18182"
})
@ActiveProfiles("homolog")
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "S02_PG_URL", matches = ".+")
class AuthApiIntegrationTest {

    private static final String PASSWORD = "senha-segura";
    private static final String SCHEMA = "s02_auth_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final LocalSmtpInbox SMTP = new LocalSmtpInbox();
    private static final Pattern LINK = Pattern.compile("http://localhost:18182/([a-z/-]+)\\?token=([A-Za-z0-9_-]+)");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoSpyBean UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate database;
    @Autowired DataSource dataSource;
    @Autowired AuthService authService;
    @Autowired JwtService jwt;

    @MockitoBean PartnerOwnershipClient partnerOwnership;

    @DynamicPropertySource
    static void databaseSchema(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.datasource.hikari.connection-init-sql", () -> "set search_path to " + SCHEMA);
        registry.add("MAIL_PORT", SMTP::port);
    }

    @AfterAll
    static void removeTestSchema(@Autowired JdbcTemplate database) throws Exception {
        SMTP.close();
        database.execute("drop schema if exists " + SCHEMA + " cascade");
    }

    @BeforeEach
    void setUp() {
        database.execute("truncate table identity_audit_events, team_accesses, password_reset_tokens, users");
        SMTP.clear();
    }

    @Test
    void serverControlsRegistrationRolesAndHomologBlocksPublicRegistrationAndOauth() throws Exception {
        String customer = provision("Tutor", "Tutor@Example.Test", "CUSTOMER");
        String partner = provision("Parceiro", "parceiro@example.test", "PARTNER");

        assertThat(jwt.verify(customer).get("role")).isEqualTo("CUSTOMER");
        assertThat(jwt.verify(partner).get("role")).isEqualTo("PARTNER");
        assertThat(users.findByEmail("tutor@example.test").orElseThrow().getRole()).isEqualTo(UserRole.CUSTOMER);
        assertThatThrownBy(() -> authService.registerPartner(new RegisterRequest("Novo parceiro",
                "TUTOR@example.test", PASSWORD))).isInstanceOf(ApiException.class)
                .hasMessageContaining("já está cadastrado");

        for (String path : new String[] {"/auth/register", "/auth/register/partner", "/auth/oauth2/exchange"}) {
            mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, bearer(partner)).contentType(MediaType.APPLICATION_JSON)
                    .content(credentials("Escalada", "escalada@example.test"))).andExpect(status().isForbidden());
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                    .content(credentials("Escalada", "escalada@example.test"))).andExpect(status().isUnauthorized());
        }
        assertThat(users.findByEmail("escalada@example.test")).isEmpty();
        for (String path : new String[] {"/oauth2/authorization/google", "/login/oauth2/code/google"}) {
            mvc.perform(get(path).servletPath(path)).andExpect(status().isUnauthorized())
                    .andExpect(header().doesNotExist(HttpHeaders.LOCATION));
        }
        assertThat(authService.register(new RegisterRequest("Tutor web", "web@example.test", PASSWORD)).role())
                .isEqualTo("CUSTOMER");
        assertThat(authService.registerPartner(new RegisterRequest("Parceiro web", "partner-web@example.test", PASSWORD)).role())
                .isEqualTo("PARTNER");
        login("Tutor@Example.Test", PASSWORD, "CUSTOMER");
    }

    @Test
    void provisionedAdministratorCanLogInAndCannotElevateAnExistingCustomer() throws Exception {
        UUID id = insertAccount("Cliente", "client@example.test", "CUSTOMER");
        database.update("update users set email = ? where id = ?", "CLIENT@example.test", id);
        assertThatThrownBy(() -> insertAccount("Escalada", "client@example.test", "ADMIN"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Já existe");
        login("CLIENT@example.test", PASSWORD, "CUSTOMER");
        User admin = admin();
        String token = login(admin.getEmail(), PASSWORD, "ADMIN");
        mvc.perform(get("/admin/customers").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        assertThatThrownBy(() -> insertAccount("Segundo admin", "ADMIN@example.test", "ADMIN"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Já existe");
    }

    @Test
    void homologDoesNotIssueEmailToNonFixtureAddresses() throws Exception {
        UUID userId = insertAccount("Tutor", "tutor@example.org", "CUSTOMER");
        requestRecovery("tutor@example.org");
        assertThat(SMTP.take(300)).isNull();
        assertThat(database.queryForObject("select count(*) from password_reset_tokens", Long.class)).isZero();
        mvc.perform(get("/internal/notification-recipients/{id}", userId)
                        .header(HttpHeaders.AUTHORIZATION, bearer("local-notification-recipient-token")))
                .andExpect(status().isNotFound());

        String owner = bearer(provision("Titular", "owner@example.test", "PARTNER"));
        when(partnerOwnership.requireOwnedPartner(owner)).thenReturn(UUID.randomUUID());
        mvc.perform(post("/auth/team/invitations").header(HttpHeaders.AUTHORIZATION, owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "guest@example.org", "accessRole", "RECEPTION"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVITATION_TEST_EMAIL_REQUIRED"));
        assertThat(database.queryForObject("select count(*) from team_accesses", Long.class)).isZero();
    }

    @Test
    void sessionAcceptsLegacyTokensAndDoesNotCallPartner() throws Exception {
        provision("Tutor", "legacy@example.test", "CUSTOMER");
        User tutor = users.findByEmail("legacy@example.test").orElseThrow();
        String token = Jwts.builder().subject(tutor.getEmail()).claim("userId", tutor.getId().toString())
                .claim("role", "CUSTOMER").expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor("s02-test-shared-secret-for-auth-api"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8))).compact();
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.userId").value(tutor.getId().toString()));
        verifyNoInteractions(partnerOwnership);
        setCustomer(tutor.getId().toString(), bearer(jwt.generateToken(admin())), false, 200);
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void internalIdentityUsesSeparateCredentialsAndRestrictsTheProjection() throws Exception {
        String customer = provision("Tutor", "tutor@example.test", "CUSTOMER");
        String partner = provision("Parceiro", "partner@example.test", "PARTNER");
        String customerId = jwt.verify(customer).get("userId", String.class);
        String partnerId = jwt.verify(partner).get("userId", String.class);
        String notification = bearer("local-notification-recipient-token");
        String claim = bearer("local-reception-claim-token");
        String recipients = "/internal/notification-recipients/";
        String claims = "/internal/reception-claim-customers/";

        mvc.perform(get(recipients + customerId)).andExpect(status().isUnauthorized());
        for (String invalid : new String[] {claim, bearer(customer), bearer("invalid")}) {
            mvc.perform(get(recipients + customerId).header(HttpHeaders.AUTHORIZATION, invalid))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(get(recipients + customerId).header(HttpHeaders.AUTHORIZATION, notification))
                .andExpect(status().isOk()).andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(content().json("{\"email\":\"tutor@example.test\"}", org.springframework.test.json.JsonCompareMode.STRICT));
        mvc.perform(get(recipients + partnerId).header(HttpHeaders.AUTHORIZATION, notification))
                .andExpect(status().isNotFound());
        mvc.perform(get(claims + customerId).header(HttpHeaders.AUTHORIZATION, notification))
                .andExpect(status().isUnauthorized());
        mvc.perform(get(claims + customerId).header(HttpHeaders.AUTHORIZATION, claim))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
        mvc.perform(get(claims + partnerId).header(HttpHeaders.AUTHORIZATION, claim))
                .andExpect(status().isNotFound());

        setCustomer(customerId, bearer(jwt.generateToken(admin())), false, 200);
        mvc.perform(get(recipients + customerId).header(HttpHeaders.AUTHORIZATION, notification))
                .andExpect(status().isNotFound());
        mvc.perform(get(claims + customerId).header(HttpHeaders.AUTHORIZATION, claim))
                .andExpect(status().isNotFound());
    }

    @Test
    void sessionAndInternalIdentityFailClosedWhenTheStoreIsUnavailable() throws Exception {
        String token = provision("Tutor", "tutor@example.test", "CUSTOMER");
        UUID id = UUID.fromString(jwt.verify(token).get("userId", String.class));
        var databaseFailure = new org.springframework.dao.DataAccessResourceFailureException("test database failure");
        doThrow(databaseFailure).when(users).findById(id);
        doThrow(databaseFailure).when(users).findActiveEmailByIdAndRole(id, UserRole.CUSTOMER);
        doThrow(databaseFailure).when(users).existsByIdAndRoleAndActiveTrue(id, UserRole.CUSTOMER);

        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("SESSION_UNAVAILABLE"));
        mvc.perform(get("/internal/notification-recipients/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer("local-notification-recipient-token")))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.email").doesNotExist());
        mvc.perform(get("/internal/reception-claim-customers/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer("local-reception-claim-token")))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void recoveryIsGenericAndDistinguishesInvalidExpiredAndUsedLinks() throws Exception {
        String customer = provision("Tutor", "tutor@example.test", "CUSTOMER");
        requestRecovery("unknown@example.test");
        assertThat(SMTP.take(300)).isNull();
        requestRecovery("tutor@example.test");
        String expiredToken = emailedToken("reset-password", "tutor@example.test");
        database.update("update password_reset_tokens set expiry_date = CURRENT_TIMESTAMP - interval '1 minute'");

        checkReset("inventado", "RESET_TOKEN_INVALID");
        checkReset(expiredToken, "RESET_TOKEN_EXPIRED");
        requestRecovery("tutor@example.test");
        String currentToken = emailedToken("reset-password", "tutor@example.test");
        requestRecovery("tutor@example.test");
        String finalToken = emailedToken("reset-password", "tutor@example.test");
        checkReset(currentToken, "RESET_TOKEN_INVALID");
        mvc.perform(post("/auth/reset-password/validate").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", finalToken)))).andExpect(status().isOk());
        mvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", finalToken, "newPassword", "nova-senha"))))
                .andExpect(status().isOk());
        checkReset(finalToken, "RESET_TOKEN_USED");
        assertThat(database.queryForList("select token from password_reset_tokens", String.class))
                .allMatch(value -> value.matches("[a-f0-9]{64}"))
                .doesNotContain(expiredToken, currentToken, finalToken);
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(customer)))
                .andExpect(status().isUnauthorized());
        login("tutor@example.test", "nova-senha", "CUSTOMER");
    }

    @Test
    void simultaneousResetRequestsConsumeTheLinkExactlyOnce() throws Exception {
        provision("Tutor", "tutor@example.test", "CUSTOMER");
        requestRecovery("tutor@example.test");
        String token = emailedToken("reset-password", "tutor@example.test");
        String payload = body(Map.of("token", token, "newPassword", "nova-senha"));
        var ready = new CountDownLatch(2);

        try (var threads = Executors.newVirtualThreadPerTaskExecutor()) {
            java.util.concurrent.Callable<Integer> consume = () -> {
                ready.countDown();
                ready.await();
                return mvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON).content(payload))
                        .andReturn().getResponse().getStatus();
            };
            var first = threads.submit(consume);
            var second = threads.submit(consume);
            assertThat(java.util.List.of(first.get(), second.get())).containsExactlyInAnyOrder(200, 400);
        }
        checkReset(token, "RESET_TOKEN_USED");
    }

    @Test
    void customerAdministrationEnforcesRoleAndInvalidatesOldSessions() throws Exception {
        String customer = provision("Ana", "ana@example.test", "CUSTOMER");
        provision("Bia", "bia@example.test", "CUSTOMER");
        String partner = provision("Estabelecimento", "partner@example.test", "PARTNER");
        User admin = admin();
        String auth = bearer(jwt.generateToken(admin));
        String customerId = jwt.verify(customer).get("userId", String.class);

        mvc.perform(get("/admin/customers")).andExpect(status().isUnauthorized());
        for (String denied : new String[] {customer, partner}) {
            mvc.perform(get("/admin/customers").header(HttpHeaders.AUTHORIZATION, bearer(denied)))
                    .andExpect(status().isForbidden());
            setCustomer(customerId, bearer(denied), false, 403);
        }
        mvc.perform(get("/admin/customers").param("page", "1").param("size", "1").param("active", "true")
                .header(HttpHeaders.AUTHORIZATION, auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1)).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].name").value("Bia"))
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.content[0].token").doesNotExist());
        mvc.perform(get("/admin/customers").param("q", "ANA").header(HttpHeaders.AUTHORIZATION, auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(customerId));
        mvc.perform(get("/admin/customers").param("size", "101").header(HttpHeaders.AUTHORIZATION, auth))
                .andExpect(status().isBadRequest());

        setCustomer(admin.getId().toString(), auth, false, 404);
        setCustomer(customerId, auth, false, 200);
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(customer)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", "ana@example.test", "password", PASSWORD))))
                .andExpect(status().isUnauthorized());
        setCustomer(customerId, auth, true, 200);
        setCustomer(customerId, auth, true, 200);
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(customer)))
                .andExpect(status().isUnauthorized());
        login("ana@example.test", PASSWORD, "CUSTOMER");
    }

    @Test
    void onlyTheOwnerCanRevokeAnAccessAndItsBearerStopsWorking() throws Exception {
        String owner = bearer(provision("Titular", "owner@example.test", "PARTNER"));
        String other = bearer(provision("Outro", "other@example.test", "PARTNER"));
        UUID partnerId = UUID.randomUUID();
        when(partnerOwnership.requireOwnedPartner(owner)).thenReturn(partnerId);
        when(partnerOwnership.requireOwnedPartner(other)).thenReturn(UUID.randomUUID());

        String invitation = body(Map.of("email", "team@example.test", "accessRole", "RECEPTION",
                "reason", "Cobertura de recepção", "actorId", UUID.randomUUID().toString(),
                "partnerId", UUID.randomUUID().toString()));
        mvc.perform(post("/auth/team/invitations").contentType(MediaType.APPLICATION_JSON).content(invitation))
                .andExpect(status().isUnauthorized());
        JsonNode created = json.readTree(mvc.perform(post("/auth/team/invitations")
                .header(HttpHeaders.AUTHORIZATION, owner).contentType(MediaType.APPLICATION_JSON).content(invitation))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.partnerId").value(partnerId.toString()))
                .andExpect(jsonPath("$.token").doesNotExist()).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/auth/team/invitations").header(HttpHeaders.AUTHORIZATION, owner)
                .contentType(MediaType.APPLICATION_JSON).content(invitation)).andExpect(status().isConflict());
        String token = emailedToken("team/invitation", "team@example.test");
        String accept = body(Map.of("token", token, "name", "Recepção", "password", PASSWORD));
        mvc.perform(post("/auth/team/invitations/accept").contentType(MediaType.APPLICATION_JSON).content(accept))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(post("/auth/team/invitations/accept").contentType(MediaType.APPLICATION_JSON).content(accept))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVITATION_USED"));

        String employee = bearer(login("team@example.test", PASSWORD, "TEAM_MEMBER"));
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, employee)).andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.partnerId").value(partnerId.toString()))
                .andExpect(jsonPath("$.teamAccessId").value(created.get("id").asText()))
                .andExpect(jsonPath("$.permissions[3]").value("CASH_RECEIVE"))
                .andExpect(jsonPath("$.permissions[4]").doesNotExist());
        mvc.perform(get("/auth/team/accesses").header(HttpHeaders.AUTHORIZATION, other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/auth/team/accesses").header(HttpHeaders.AUTHORIZATION, employee))
                .andExpect(status().isForbidden());

        String revoke = "/auth/team/accesses/" + created.get("id").asText();
        mvc.perform(delete(revoke).header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        mvc.perform(delete(revoke).header(HttpHeaders.AUTHORIZATION, owner)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("reason", "Vínculo encerrado"))))
                .andExpect(status().isNoContent());
        mvc.perform(delete(revoke).header(HttpHeaders.AUTHORIZATION, owner)).andExpect(status().isNoContent());
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, employee))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/auth/team/invitations").header(HttpHeaders.AUTHORIZATION, other)
                .contentType(MediaType.APPLICATION_JSON).content(invitation)).andExpect(status().isCreated());
        String nextToken = emailedToken("team/invitation", "team@example.test");
        mvc.perform(post("/auth/team/invitations/accept").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", nextToken, "name", "Recepção", "password", PASSWORD))))
                .andExpect(status().isOk());
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, employee))
                .andExpect(status().isUnauthorized());
        login("team@example.test", PASSWORD, "TEAM_MEMBER");

        String ownerId = jwt.verify(owner.substring(7)).get("userId", String.class);
        String memberId = jwt.verify(employee.substring(7)).get("userId", String.class);
        mvc.perform(get("/admin/identity-audit").param("targetType", "TEAM_ACCESS")
                        .param("targetId", created.get("id").asText()).param("partnerId", partnerId.toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(jwt.generateToken(admin()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].action").value("TEAM_ACCESS_REVOKED"))
                .andExpect(jsonPath("$.content[0].actorId").value(ownerId))
                .andExpect(jsonPath("$.content[0].targetUserId").value(memberId))
                .andExpect(jsonPath("$.content[0].before.status").value("ACTIVE"))
                .andExpect(jsonPath("$.content[0].after.status").value("REVOKED"))
                .andExpect(jsonPath("$.content[0].reason").value("Vínculo encerrado"))
                .andExpect(jsonPath("$.content[1].actorId").value(memberId))
                .andExpect(jsonPath("$.content[1].actorRole").value("TEAM_MEMBER"))
                .andExpect(jsonPath("$.content[1].action").value("TEAM_INVITATION_ACCEPTED"))
                .andExpect(jsonPath("$.content[2].actorId").value(ownerId))
                .andExpect(jsonPath("$.content[2].action").value("TEAM_INVITED"))
                .andExpect(jsonPath("$.content[2].after.accessRole").value("RECEPTION"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("team@example.test"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(token))));
    }

    @Test
    void identityAuditRequiresAdminAndRecordsOnlyEffectiveCustomerChanges() throws Exception {
        String tutor = provision("Tutor", "audit@example.test", "CUSTOMER");
        String other = provision("Outro", "other-audit@example.test", "CUSTOMER");
        String target = jwt.verify(tutor).get("userId", String.class);
        String otherId = jwt.verify(other).get("userId", String.class);
        User admin = admin();
        String authorization = bearer(jwt.generateToken(admin));

        mvc.perform(get("/admin/identity-audit")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/identity-audit").header(HttpHeaders.AUTHORIZATION, bearer(tutor)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/identity-audit").header(HttpHeaders.AUTHORIZATION, authorization)
                .param("size", "101")).andExpect(status().isBadRequest());
        mvc.perform(get("/admin/identity-audit").header(HttpHeaders.AUTHORIZATION, authorization)
                .param("targetId", "invalid")).andExpect(status().isBadRequest());
        mvc.perform(patch("/admin/customers/{id}/active", target)
                .header(HttpHeaders.AUTHORIZATION, authorization).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("active", false, "reason", "x".repeat(301)))))
                .andExpect(status().isBadRequest());

        mvc.perform(patch("/admin/customers/{id}/active", target)
                .header(HttpHeaders.AUTHORIZATION, authorization).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("active", false, "reason", "  Conta encerrada  ", "actorId", otherId,
                        "actorRole", "PARTNER", "partnerId", UUID.randomUUID().toString()))))
                .andExpect(status().isOk());
        setCustomer(target, authorization, false, 200);
        setCustomer(target, authorization, true, 200);
        setCustomer(otherId, authorization, false, 200);

        mvc.perform(get("/admin/identity-audit").header(HttpHeaders.AUTHORIZATION, authorization)
                        .param("targetType", "CUSTOMER").param("targetId", target).param("size", "1"))
                .andExpect(status().isOk()).andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content[0].action").value("CUSTOMER_ACTIVATED"))
                .andExpect(jsonPath("$.content[0].reason").value("Motivo não informado."));
        mvc.perform(get("/admin/identity-audit").header(HttpHeaders.AUTHORIZATION, authorization)
                        .param("targetType", "CUSTOMER").param("targetId", target).param("size", "1").param("page", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].action").value("CUSTOMER_DEACTIVATED"))
                .andExpect(jsonPath("$.content[0].actorId").value(admin.getId().toString()))
                .andExpect(jsonPath("$.content[0].actorRole").value("ADMIN"))
                .andExpect(jsonPath("$.content[0].targetUserId").value(target))
                .andExpect(jsonPath("$.content[0].partnerId").isEmpty())
                .andExpect(jsonPath("$.content[0].before.active").value(true))
                .andExpect(jsonPath("$.content[0].after.active").value(false))
                .andExpect(jsonPath("$.content[0].reason").value("Conta encerrada"));
        mvc.perform(get("/admin/identity-audit").header(HttpHeaders.AUTHORIZATION, authorization)
                        .param("actorId", otherId).param("action", "CUSTOMER_DEACTIVATED"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(tutor)))
                .andExpect(status().isUnauthorized());
        assertThat(users.findById(UUID.fromString(target)).orElseThrow().getSessionVersion()).isEqualTo(2);
    }

    @Test
    void failedAuditInsertRollsBackAccountStateAndRevocation() throws Exception {
        String tutor = provision("Tutor", "rollback@example.test", "CUSTOMER");
        String target = jwt.verify(tutor).get("userId", String.class);
        String authorization = bearer(jwt.generateToken(admin()));
        database.execute("alter table identity_audit_events add constraint reject_test_audit check (false)");
        try {
            setCustomer(target, authorization, false, 503);
        } finally {
            database.execute("alter table identity_audit_events drop constraint reject_test_audit");
        }
        User unchanged = users.findById(UUID.fromString(target)).orElseThrow();
        assertThat(unchanged.isEnabled()).isTrue();
        assertThat(unchanged.getSessionVersion()).isZero();
        assertThat(database.queryForObject("select count(*) from identity_audit_events", Long.class)).isZero();
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer(tutor)))
                .andExpect(status().isOk());
    }

    @Test
    void expiredInvitationsCanBeReplacedAndPendingInvitationsCanBeRevoked() throws Exception {
        String owner = bearer(provision("Titular", "owner@example.test", "PARTNER"));
        when(partnerOwnership.requireOwnedPartner(owner)).thenReturn(UUID.randomUUID());
        String email = "team@example.test";
        String invitation = body(Map.of("email", email, "accessRole", "PROFESSIONAL"));
        mvc.perform(post("/auth/team/invitations").header(HttpHeaders.AUTHORIZATION, owner)
                .contentType(MediaType.APPLICATION_JSON).content(invitation)).andExpect(status().isCreated());
        String expired = emailedToken("team/invitation", email);
        database.update("update team_accesses set expires_at = CURRENT_TIMESTAMP - interval '1 minute'");
        mvc.perform(get("/auth/team/accesses").header(HttpHeaders.AUTHORIZATION, owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("EXPIRED"));
        mvc.perform(post("/auth/team/invitations/accept").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", expired, "name", "Profissional", "password", PASSWORD))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVITATION_EXPIRED"));

        var reissued = mvc.perform(post("/auth/team/invitations").header(HttpHeaders.AUTHORIZATION, owner)
                .contentType(MediaType.APPLICATION_JSON).content(invitation)).andExpect(status().isCreated()).andReturn();
        String id = json.readTree(reissued.getResponse().getContentAsString()).get("id").asText();
        String revoked = emailedToken("team/invitation", email);
        mvc.perform(delete("/auth/team/accesses/{id}", id).header(HttpHeaders.AUTHORIZATION, owner))
                .andExpect(status().isNoContent());
        mvc.perform(post("/auth/team/invitations/accept").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", revoked, "name", "Profissional", "password", PASSWORD))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVITATION_INVALID"));
        assertThat(users.findByEmail(email)).isEmpty();
    }

    private User admin() {
        try {
            return users.findById(insertAccount("Admin", "admin@example.test", "ADMIN")).orElseThrow();
        } catch (java.sql.SQLException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private void setCustomer(String id, String auth, boolean active, int response) throws Exception {
        mvc.perform(patch("/admin/customers/{id}/active", id).header(HttpHeaders.AUTHORIZATION, auth)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("active", active))))
                .andExpect(status().is(response));
    }

    private String provision(String name, String email, String role) throws Exception {
        insertAccount(name, email, role);
        return login(email, PASSWORD, role);
    }

    private UUID insertAccount(String name, String email, String role) throws java.sql.SQLException {
        var account = ProvisionPilotUser.validateArgs("prod,homolog", new String[] {role, email, name});
        try (var connection = dataSource.getConnection()) {
            return ProvisionPilotUser.insert(connection, account, encoder.encode(PASSWORD));
        }
    }

    private String login(String email, String password, String role) throws Exception {
        var result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "password", password))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value(role)).andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private void requestRecovery(String email) throws Exception {
        mvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email)))).andExpect(status().isOk()).andExpect(content().string(""));
    }

    private void checkReset(String token, String code) throws Exception {
        mvc.perform(post("/auth/reset-password/validate").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", token)))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(code));
    }

    private String emailedToken(String path, String recipient) throws Exception {
        var message = SMTP.take(4000);
        assertThat(message).isNotNull();
        assertThat(message.getAllRecipients()).hasSize(1);
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo(recipient);
        var matcher = LINK.matcher(message.getContent().toString());
        assertThat(matcher.find()).isTrue();
        assertThat(matcher.group(1)).isEqualTo(path);
        return matcher.group(2);
    }

    private String credentials(String name, String email) throws Exception {
        return body(Map.of("name", name, "email", email, "password", PASSWORD, "role", "ADMIN"));
    }

    private String body(Map<String, ?> values) throws Exception {
        return json.writeValueAsString(values);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
