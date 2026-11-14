package br.com.innkercode.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Reads only a bounded, sanitized snapshot. Never connects to Docker or executes commands. */
@Service
public class PlatformStatusService {
    private static final Set<String> SERVICES = Set.of("frontend", "gateway-service", "auth-service",
            "pet-service", "partner-service", "booking-service", "payment-service", "notification-service",
            "auth-db", "pet-db", "partner-db", "booking-db", "payment-db", "notification-db", "redis", "smtp-capture");
    private static final Set<String> STATES = Set.of("HEALTHY", "UNHEALTHY", "STOPPED", "MISSING", "UNKNOWN");
    private final String file;
    private final ObjectMapper mapper;
    private final Clock clock;

    @Autowired
    public PlatformStatusService(@Value("${app.master-status-file:}") String file, ObjectMapper mapper) {
        this(file, mapper, Clock.systemUTC());
    }

    PlatformStatusService(String file, ObjectMapper mapper, Clock clock) {
        this.file = file;
        this.mapper = mapper;
        this.clock = clock;
    }

    public Snapshot read() {
        if (file.isBlank()) return unavailable();
        try (var input = Files.newInputStream(Path.of(file))) {
            byte[] bytes = input.readNBytes(65_537);
            if (bytes.length > 65_536) return unavailable();
            JsonNode root = mapper.readTree(bytes);
            if (root.path("schemaVersion").asInt() != 1) return unavailable();
            Instant collected = Instant.parse(root.path("collectedAt").asText());
            long age = Duration.between(collected, clock.instant()).getSeconds();
            if (age < -30) return unavailable();
            JsonNode rows = root.path("services");
            if (!rows.isArray() || rows.size() != SERVICES.size()) return unavailable();
            List<ServiceStatus> services = new ArrayList<>();
            Set<String> seen = new HashSet<>();
            for (JsonNode row : rows) {
                String id = row.path("id").asText();
                String status = row.path("status").asText();
                if (!SERVICES.contains(id) || !seen.add(id) || !STATES.contains(status)) return unavailable();
                String startedAt = row.path("startedAt").isTextual()
                        ? Instant.parse(row.path("startedAt").asText()).toString() : null;
                services.add(new ServiceStatus(id, status, startedAt, number(row, "restarts"),
                        row.path("oomKilled").asBoolean(false), number(row, "memoryBytes"), number(row, "limitBytes")));
            }
            HostMemory host = null;
            JsonNode memory = root.path("hostMemory");
            if (memory.isObject()) {
                Long total = number(memory, "totalBytes");
                Long available = number(memory, "availableBytes");
                if (total == null || available == null || total == 0 || available > total) return unavailable();
                host = new HostMemory(total, available);
            }
            return new Snapshot(age > 120 ? "STALE" : "AVAILABLE", collected.toString(), Math.max(0, age), host, services);
        } catch (IOException | RuntimeException ex) {
            return unavailable();
        }
    }

    private static Long number(JsonNode row, String key) {
        JsonNode node = row.path(key);
        if (node.isMissingNode() || node.isNull()) return null;
        if (!node.isIntegralNumber() || !node.canConvertToLong() || node.longValue() < 0)
            throw new IllegalArgumentException("Invalid metric");
        return node.longValue();
    }

    private static Snapshot unavailable() { return new Snapshot("UNAVAILABLE", null, null, null, List.of()); }
    public record Snapshot(String state, String collectedAt, Long sampleAgeSeconds, HostMemory hostMemory, List<ServiceStatus> services) {}
    public record HostMemory(long totalBytes, long availableBytes) {}
    public record ServiceStatus(String id, String status, String startedAt, Long restarts, boolean oomKilled, Long memoryBytes, Long limitBytes) {}
}
