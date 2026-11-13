package br.com.easypet.partner.controller;

import br.com.easypet.partner.security.AuthSessionClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpMethod.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:partner_configuration;MODE=PostgreSQL")
@ActiveProfiles("test")
class PartnerConfigurationTest {
    private static final String PARTNERS = "/partners";
    private static final String ADMIN = "/admin/partners";
    private static final String SERVICE = """
            {"name":"Banho","price":40,"durationMinutes":30}
            """;
    private static final String STAFF = """
            {"name":"Pessoa fictícia"}
            """;
    private static final String SHIFT = """
            {"dayOfWeek":1,"startTime":"08:00","endTime":"17:00","lunchStartTime":"12:00","lunchEndTime":"13:00"}
            """;
    private static final String HOURS = """
            {"dayOfWeek":"MONDAY","businessStartHour":"08:00","businessEndHour":"18:00","closed":false}
            """;

    @Autowired private TestRestTemplate http;
    @MockitoBean private AuthSessionClient auth;
    private UUID owner;
    private UUID other;
    private UUID administrator;
    private UUID customer;

    @BeforeEach
    void sessions() {
        http.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
        owner = token("PARTNER");
        other = token("PARTNER");
        administrator = token("ADMIN");
        customer = token("CUSTOMER");
    }

    @Test
    void profileWritesAreOwnerScopedAndPreserveServicesAndValidHours() {
        String original = profile("Configuração A", "00123456000180", "\"businessHours\":[" + HOURS + "]");
        request(POST, PARTNERS, customer, original, HttpStatus.FORBIDDEN);
        request(POST, PARTNERS, administrator, original, HttpStatus.FORBIDDEN);
        String id = id(request(POST, PARTNERS, owner, original, HttpStatus.CREATED));
        String path = PARTNERS + "/" + id;
        request(POST, PARTNERS, owner, profile("Outro estabelecimento", "00123456000181", ""), HttpStatus.CONFLICT);
        request(PUT, path, other, original, HttpStatus.FORBIDDEN);
        request(PUT, path, owner, profile("Configuração A", "00123456000180",
                "\"businessHours\":[" + HOURS + "," + HOURS + "]"), HttpStatus.BAD_REQUEST);

        String serviceId = id(request(POST, path + "/services", owner, SERVICE, HttpStatus.OK));
        request(PUT, path, owner, profile("Configuração A", "00123456000180", "\"active\":false"), HttpStatus.CONFLICT);
        request(PUT, path, owner, profile("Configuração A", "00123456000180", "\"services\":[]"), HttpStatus.CONFLICT);
        JsonNode updated = request(PUT, PARTNERS + "/me", owner,
                profile("Configuração A revisada", "00123456000180", ""), HttpStatus.OK);
        assertThat(updated.path("name").asText()).isEqualTo("Configuração A revisada");
        assertThat(id(updated.path("services").get(0))).isEqualTo(serviceId);
        assertThat(updated.path("businessHours").get(0).path("businessStartHour").asText()).isEqualTo("08:00");
    }

    @Test
    void configurationRejectsForeignAssociationsAndKeepsStaffShiftsOnFailedReplacement() {
        String a = PARTNERS + "/" + id(request(POST, PARTNERS, owner,
                profile("Equipe A", "00123456000182", ""), HttpStatus.CREATED));
        String bId = id(request(POST, PARTNERS, other, profile("Equipe B", "00123456000183", ""), HttpStatus.CREATED));
        String b = PARTNERS + "/" + bId;
        String staffId = id(request(POST, b + "/staff", other, STAFF, HttpStatus.CREATED));
        String staff = PARTNERS + "/staff/" + staffId;
        String schedule = staff + "/schedule";
        String contextA = "?partnerId=" + a.substring(PARTNERS.length() + 1);
        String contextB = "?partnerId=" + bId;
        request(POST, b + "/staff", owner, STAFF, HttpStatus.FORBIDDEN);
        request(POST, b + "/services", owner, SERVICE, HttpStatus.FORBIDDEN);
        request(GET, b + "/staff", owner, null, HttpStatus.FORBIDDEN);
        String serviceId = id(request(POST, b + "/services", other,
                withField(SERVICE, "\"staffIds\":[\"" + staffId + "\"]"), HttpStatus.OK));
        String service = b + "/services/" + serviceId;
        request(PUT, service, owner, SERVICE, HttpStatus.FORBIDDEN);
        request(PUT, a + "/services/" + serviceId, administrator, SERVICE, HttpStatus.NOT_FOUND);
        request(POST, a + "/services", owner,
                withField(SERVICE, "\"staffIds\":[\"" + staffId + "\"]"), HttpStatus.NOT_FOUND);
        request(POST, a + "/staff", owner,
                withField(STAFF, "\"serviceIds\":[\"" + serviceId + "\"]"), HttpStatus.NOT_FOUND);
        String replacement = SERVICE.replace("Banho", "Banho revisado");
        assertThat(id(request(PUT, service, administrator, replacement, HttpStatus.OK))).isEqualTo(serviceId);
        assertThat(request(GET, staff + contextB, administrator, null, HttpStatus.OK)
                .path("serviceIds").get(0).asText()).isEqualTo(serviceId);

        request(PUT, schedule + contextB, other, "[" + SHIFT + "]", HttpStatus.OK);
        request(GET, staff + contextA, administrator, null, HttpStatus.NOT_FOUND);
        request(PUT, staff + contextA, administrator, STAFF, HttpStatus.NOT_FOUND);
        request(DELETE, staff + contextA, administrator, null, HttpStatus.NOT_FOUND);
        request(GET, schedule + contextA, administrator, null, HttpStatus.NOT_FOUND);
        request(PUT, schedule + contextA, administrator, "[]", HttpStatus.NOT_FOUND);
        request(POST, staff + "/absences" + contextA, administrator,
                """
                {"startDate":"2027-01-01T08:00:00","endDate":"2027-01-01T10:00:00","reason":"Teste"}
                """, HttpStatus.NOT_FOUND);
        request(PUT, schedule + contextB, owner, "[]", HttpStatus.FORBIDDEN);
        request(PUT, schedule + contextB, other, "[" + SHIFT + "," + SHIFT + "]", HttpStatus.BAD_REQUEST);
        request(PUT, schedule + contextB, other, "[" + SHIFT.replace("13:00", "18:00") + "]", HttpStatus.BAD_REQUEST);
        assertThat(request(GET, schedule + contextB, other, null, HttpStatus.OK).get(0).path("startTime").asText())
                .startsWith("08:00");
        assertThat(request(GET, staff + contextB, administrator, null, HttpStatus.OK)
                .path("status").asText()).isEqualTo("ACTIVE");
    }

    @Test
    void adminSuspendsAndReactivatesWithAuditableTransitions() {
        String id = id(request(POST, PARTNERS, owner,
                profile("Loja 100% fictícia", "00123456000184", "\"categories\":[\"PETSHOP\"]"), HttpStatus.CREATED));
        String path = ADMIN + "/" + id;
        request(DELETE, PARTNERS + "/" + id, administrator, null, HttpStatus.CONFLICT);
        String status = path + "/active";
        String suspended = """
                {"active":false,"reason":"  Pausa de teste  "}
                """;
        request(PATCH, status, owner, suspended, HttpStatus.FORBIDDEN);
        request(PATCH, status, administrator, "{\"active\":false,\"reason\":\" \"}", HttpStatus.BAD_REQUEST);
        assertThat(request(PATCH, status, administrator, suspended, HttpStatus.OK).path("active").asBoolean()).isFalse();
        request(PATCH, status, administrator, suspended, HttpStatus.OK);
        request(GET, PARTNERS + "/catalog/" + id, customer, null, HttpStatus.NOT_FOUND);
        assertThat(request(GET, PARTNERS + "/me", owner, null, HttpStatus.OK).path("active").asBoolean()).isFalse();
        JsonNode operations = request(GET, "/internal/partners/" + id + "/operations", customer, null, HttpStatus.OK);
        assertThat(id(operations)).isEqualTo(id);
        assertThat(operations.path("active").asBoolean()).isFalse();
        assertThat(id(request(GET, ADMIN + "?active=false&category=PETSHOP&name=100%", administrator, null, HttpStatus.OK)
                .path("content").get(0))).isEqualTo(id);
        assertThat(request(GET, ADMIN + "?name=fictícia", administrator, null, HttpStatus.OK).path("totalElements").asInt())
                .isZero();

        String history = path + "/status-history";
        request(GET, history, owner, null, HttpStatus.FORBIDDEN);
        JsonNode first = request(GET, history, administrator, null, HttpStatus.OK);
        assertThat(first.path("totalElements").asInt()).isEqualTo(1);
        JsonNode change = first.path("content").get(0);
        assertThat(change.path("actorId").asText()).isEqualTo(administrator.toString());
        assertThat(change.path("reason").asText()).isEqualTo("Pausa de teste");
        assertThat(change.path("previousActive").asBoolean()).isTrue();
        assertThat(change.path("active").asBoolean()).isFalse();
        assertThat(change.path("changedAt").asText()).isNotBlank();

        assertThat(id(request(PATCH, status, administrator, "{\"active\":true,\"reason\":\"Retomada\"}", HttpStatus.OK)))
                .isEqualTo(id);
        request(GET, PARTNERS + "/catalog/" + id, customer, null, HttpStatus.OK);
        JsonNode finalHistory = request(GET, history, administrator, null, HttpStatus.OK);
        assertThat(finalHistory.path("totalElements").asInt()).isEqualTo(2);
        assertThat(finalHistory.path("content").get(0).path("reason").asText()).isEqualTo("Retomada");
    }

    private ResponseEntity<JsonNode> exchange(HttpMethod method, String path, UUID actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(actor.toString());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return http.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private JsonNode request(HttpMethod method, String path, UUID actor, String body, HttpStatus expected) {
        var response = exchange(method, path, actor, body);
        assertThat(response.getStatusCode()).as("%s %s returned %s", method, path, response.getBody()).isEqualTo(expected);
        return response.getBody();
    }

    private UUID token(String role) {
        UUID user = UUID.randomUUID();
        when(auth.read("Bearer " + user)).thenReturn(
                new AuthSessionClient.Session(user, role, null, null, List.of(), null, null));
        return user;
    }

    private static String profile(String name, String cnpj, String fields) {
        String body = """
                {"name":"%s","cnpj":"%s","legalName":"Estabelecimento de teste","latitude":-27.59,"longitude":-48.55}
                """.formatted(name, cnpj);
        return fields.isEmpty() ? body : withField(body, fields);
    }

    private static String withField(String body, String field) {
        return body.stripTrailing().replaceFirst("}$", "") + "," + field + "}";
    }

    private static String id(JsonNode node) {
        return node.path("id").asText();
    }
}
