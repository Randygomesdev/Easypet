package br.com.easypet.partner.controller;

import br.com.easypet.partner.security.AuthSessionClient;
import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.entity.PartnerBusinessHour;
import br.com.easypet.partner.domain.entity.ServiceOffer;
import br.com.easypet.partner.domain.model.BillingUnit;
import br.com.easypet.partner.repository.PartnerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:partner_read_access;MODE=PostgreSQL")
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PartnerReadAccessTest {
    // TestRestTemplate already prefixes requests with the configured servlet context path.
    private static final String PARTNERS = "/partners";
    private final UUID owner = UUID.randomUUID();
    private final String cnpj = "00123456000178";
    private UUID partnerId;
    private UUID inactiveId;
    private UUID serviceId;

    @Autowired private TestRestTemplate http;
    @Autowired private PartnerRepository partners;
    @MockitoBean private AuthSessionClient auth;

    @BeforeAll
    void seed() {
        Partner partner = Partner.builder().userId(owner).name("Pet da Praça").legalName("Pet da Praça LTDA")
                .cnpj(cnpj).address("Rua de Teste").email("partner@example.test")
                .contactPhone("48999990000").boardingCapacity(4).active(true)
                .businessHours(List.of(PartnerBusinessHour.builder().dayOfWeek(DayOfWeek.MONDAY)
                        .businessStartHour("08:00").businessEndHour("18:00").build()))
                .build();
        partner.setServices(new ArrayList<>(List.of(ServiceOffer.builder().partner(partner)
                .name("Hospedagem").description("Descrição do catálogo").price(new BigDecimal("60.00"))
                .durationMinutes(45).billingUnit(BillingUnit.DAILY).build())));
        Partner saved = partners.saveAndFlush(partner);
        partnerId = saved.getId();
        serviceId = saved.getServices().getFirst().getId();

        inactiveId = partners.saveAndFlush(Partner.builder().userId(UUID.randomUUID())
                .name("Pet inativo").legalName("Pet inativo LTDA").cnpj("00123456000179")
                .active(false).build()).getId();
    }

    @ParameterizedTest
    @EnumSource(value = HttpMethodName.class)
    void completeReadsRejectAnonymousInvalidAndCustomer(HttpMethodName methodName) {
        HttpMethod method = HttpMethod.valueOf(methodName.name());
        String customer = token("CUSTOMER", UUID.randomUUID());
        for (String path : List.of(PARTNERS, PARTNERS + "/" + partnerId)) {
            assertThat(request(method, path, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(request(method, path, "invalid.jwt").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(request(method, path, customer).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void partnerMayReadOnlyTheirOwnFullRecord() {
        String own = token("PARTNER", owner);
        String other = token("PARTNER", UUID.randomUUID());
        assertThat(request(HttpMethod.GET, PARTNERS, own).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(request(HttpMethod.GET, PARTNERS + "/" + partnerId, other).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        for (String path : List.of(PARTNERS + "/me", PARTNERS + "/" + partnerId)) {
            ResponseEntity<JsonNode> response = request(HttpMethod.GET, path, own);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody().path("id").asText()).isEqualTo(partnerId.toString());
            assertThat(response.getBody().path("cnpj").asText()).isEqualTo(cnpj);
        }
    }

    @Test
    void adminReadsBothFullCollectionsAndBothDetailRoutes() {
        String admin = token("ADMIN", UUID.randomUUID());
        for (String path : List.of(PARTNERS, "/admin/partners")) {
            ResponseEntity<JsonNode> list = request(HttpMethod.GET, path, admin);
            assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(list.getBody().path("content").path(0).path("cnpj").asText()).isEqualTo(cnpj);
            ResponseEntity<JsonNode> detail = request(HttpMethod.GET, path + "/" + inactiveId, admin);
            assertThat(detail.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(detail.getBody().path("legalName").asText()).isEqualTo("Pet inativo LTDA");
        }
    }

    @Test
    void customerMayReadAuthenticatedCatalogProjection() {
        String customer = token("CUSTOMER", UUID.randomUUID());
        String detail = PARTNERS + "/catalog/" + partnerId;
        assertThat(request(HttpMethod.GET, detail, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(request(HttpMethod.GET, PARTNERS + "/catalog/" + inactiveId, customer).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        for (String path : List.of(PARTNERS + "/catalog", detail)) {
            ResponseEntity<JsonNode> response = request(HttpMethod.GET, path, customer);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode body = response.getBody();
            JsonNode firstPartner = body.has("content") ? body.path("content").path(0) : body;
            assertThat(firstPartner.path("id").asText()).isEqualTo(partnerId.toString());
            assertThat(fields(firstPartner)).doesNotContain("cnpj", "legalName", "contactPhone", "email");
        }
    }

    @Test
    void forwardedBearerAuthorizesOnlyTheOperationsProjection() {
        String operations = operations(partnerId);
        assertThat(request(HttpMethod.GET, operations, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(request(HttpMethod.GET, operations, "invalid.jwt").getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        for (String role : List.of("CUSTOMER", "PARTNER", "ADMIN")) {
            String bearer = token(role, UUID.randomUUID());
            ResponseEntity<JsonNode> response = request(HttpMethod.GET, operations, bearer);
            JsonNode body = response.getBody();
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(fields(body)).containsExactlyInAnyOrder("id", "name", "boardingCapacity",
                    "businessHours", "services", "active");
            assertThat(body.path("active").asBoolean()).isTrue();
            assertThat(body.path("id").asText()).isEqualTo(partnerId.toString());
            assertThat(body.path("boardingCapacity").asInt()).isEqualTo(4);
            JsonNode hours = body.path("businessHours").path(0);
            assertThat(fields(hours)).containsExactlyInAnyOrder("dayOfWeek", "businessStartHour", "businessEndHour",
                    "lunchStartHour", "lunchEndHour", "closed");
            assertThat(hours.path("businessStartHour").asText()).isEqualTo("08:00");
            JsonNode service = body.path("services").path(0);
            assertThat(fields(service)).containsExactlyInAnyOrder("id", "name", "price", "durationMinutes", "billingUnit");
            assertThat(service.path("id").asText()).isEqualTo(serviceId.toString());
            assertThat(service.path("price").decimalValue()).isEqualByComparingTo("60");
            assertThat(service.path("durationMinutes").asInt()).isEqualTo(45);
            assertThat(service.path("billingUnit").asText()).isEqualTo("DAILY");
            assertThat(request(HttpMethod.GET, operations(inactiveId), bearer).getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(request(HttpMethod.GET, operations(UUID.randomUUID()), bearer).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND);
        }
    }

    private ResponseEntity<JsonNode> request(HttpMethod method, String path, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return http.exchange(path, method, new HttpEntity<>(headers), JsonNode.class);
    }

    private static String operations(UUID id) {
        return "/internal/partners/" + id + "/operations";
    }

    private static Set<String> fields(JsonNode node) {
        Set<String> fields = new HashSet<>();
        node.fieldNames().forEachRemaining(fields::add);
        return fields;
    }

    private String token(String role, UUID userId) {
        String token = UUID.randomUUID().toString();
        when(auth.read("Bearer " + token)).thenReturn(new AuthSessionClient.Session(userId, role, null, null, List.of(), null, null));
        return token;
    }

    enum HttpMethodName {
        GET, HEAD
    }
}
