package br.com.easypet.notification;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

@Component
@Endpoint(id = "notificationqueue")
class NotificationQueueEndpoint {
    private final NotificationStore store;
    private final NotificationJobs jobs;
    private final Clock clock;
    private final String transport;

    NotificationQueueEndpoint(NotificationStore store, NotificationJobs jobs, Clock clock,
            @Value("${notification.transport}") String transport) {
        this.store = store;
        this.jobs = jobs;
        this.clock = clock;
        this.transport = transport;
    }

    record Snapshot(String transport, boolean outboxPollingEnabled, Instant lastOutboxCheckAt,
            NotificationJobs.SyncState outboxSyncState, long due, long oldestDueAgeSeconds,
            long retryScheduled, long sending, long failedLastHour, long unknownLastHour, long unroutableLastHour) {}

    @ReadOperation
    public Snapshot queue() {
        Instant now = clock.instant();
        var counts = store.queueCounts(now, now.minus(Duration.ofHours(1)));
        var check = jobs.outboxCheck();
        long age = counts.oldestDueAt() == null ? 0 : Duration.between(counts.oldestDueAt(), now).toSeconds();
        return new Snapshot(transport, jobs.pollingEnabled(), check.checkedAt(), check.state(), counts.due(), age,
                counts.retryScheduled(), counts.sending(), counts.failed(), counts.unknown(), counts.unroutable());
    }
}
