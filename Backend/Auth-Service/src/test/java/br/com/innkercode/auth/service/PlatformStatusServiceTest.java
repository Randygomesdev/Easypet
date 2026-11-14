package br.com.innkercode.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class PlatformStatusServiceTest {
    @TempDir Path directory;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Instant now = Instant.parse("2026-11-13T20:00:00Z");

    private ObjectNode fixture() {
        var root = mapper.createObjectNode().put("schemaVersion", 1).put("collectedAt", now.toString());
        var rows = root.putArray("services");
        for (String id : new String[]{"frontend", "gateway-service", "auth-service", "pet-service", "partner-service",
                "booking-service", "payment-service", "notification-service", "auth-db", "pet-db", "partner-db",
                "booking-db", "payment-db", "notification-db", "redis", "smtp-capture"}) {
            rows.addObject().put("id", id).put("status", "HEALTHY").put("memoryBytes", 123).put("limitBytes", 456)
                    .put("restarts", 0).put("oomKilled", false).put("privateLog", "must-not-be-returned");
        }
        root.putObject("hostMemory").put("totalBytes", 1000).put("availableBytes", 500).put("privateField", "hidden");
        root.put("secret", "must-not-be-returned");
        return root;
    }

    private PlatformStatusService service(ObjectNode content) throws Exception {
        Path path = directory.resolve("status.json");
        mapper.writeValue(path.toFile(), content);
        return new PlatformStatusService(path.toString(), mapper, Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test void returnsOnlyAllowlistedFields() throws Exception {
        var result = service(fixture()).read();
        assertThat(result.state()).isEqualTo("AVAILABLE");
        assertThat(result.services()).hasSize(16);
        assertThat(result.hostMemory().availableBytes()).isEqualTo(500);
        assertThat(mapper.writeValueAsString(result)).doesNotContain("private", "secret", "must-not-be-returned", "hidden");
    }

    @Test void expiredDataNeverClaimsCurrentHealth() throws Exception {
        var root = fixture().put("collectedAt", now.minusSeconds(121).toString());
        var result = service(root).read();
        assertThat(result.state()).isEqualTo("STALE");
        assertThat(result.sampleAgeSeconds()).isEqualTo(121);
    }

    @Test void absentDisabledAndMalformedCollectorsAreUnavailable() throws Exception {
        assertThat(new PlatformStatusService("", mapper).read().state()).isEqualTo("UNAVAILABLE");
        assertThat(new PlatformStatusService(directory.resolve("missing.json").toString(), mapper).read().state()).isEqualTo("UNAVAILABLE");
        var service = service(fixture());
        Files.writeString(directory.resolve("status.json"), "{invalid");
        assertThat(service.read().state()).isEqualTo("UNAVAILABLE");
    }

    @Test void oversizedAndFutureSnapshotsAreUnavailable() throws Exception {
        var service = service(fixture());
        Files.writeString(directory.resolve("status.json"), "x".repeat(65_537));
        assertThat(service.read().state()).isEqualTo("UNAVAILABLE");
        assertThat(service(fixture().put("collectedAt", now.plusSeconds(31).toString())).read().state()).isEqualTo("UNAVAILABLE");
    }

    @Test void unknownOrDuplicateServicesAreRejected() throws Exception {
        var root = fixture();
        ((ObjectNode) root.path("services").get(0)).put("id", "setoriza");
        assertThat(service(root).read().state()).isEqualTo("UNAVAILABLE");
        ((ObjectNode) root.path("services").get(0)).put("id", "auth-service");
        assertThat(service(root).read().state()).isEqualTo("UNAVAILABLE");
    }

    @Test void invalidStatusAndNegativeMemoryAreRejected() throws Exception {
        var root = fixture();
        ((ObjectNode) root.path("services").get(0)).put("status", "secret text");
        assertThat(service(root).read().state()).isEqualTo("UNAVAILABLE");
        ((ObjectNode) root.path("services").get(0)).put("status", "HEALTHY").put("memoryBytes", -1);
        assertThat(service(root).read().state()).isEqualTo("UNAVAILABLE");
    }
}
