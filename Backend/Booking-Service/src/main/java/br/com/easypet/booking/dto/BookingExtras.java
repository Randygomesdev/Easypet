package br.com.easypet.booking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class BookingExtras {
    public static final long MAX_AMOUNT_CENTS = 100_000_000L;

    private BookingExtras() {}

    public enum Status { PENDING, APPROVED, REJECTED, EXPIRED }
    public enum Channel { DIGITAL, IN_PERSON }
    public enum TutorIdentityType { AUTH_USER, RECEPTION_CUSTOMER }

    public enum Decision {
        APPROVE, REJECT;

        public Status result() {
            return this == APPROVE ? Status.APPROVED : Status.REJECTED;
        }
    }

    public record Proposal(@NotBlank @Size(max = 300) String description,
                           @NotNull @Min(1) @Max(100) Integer quantity,
                           @NotNull @Min(1) @Max(MAX_AMOUNT_CENTS) Long unitPriceCents) {}

    public record DigitalDecision(@NotNull @Min(1) Integer version, @NotNull Decision decision) {}

    public record InPersonDecision(@NotNull @Min(1) Integer version, @NotNull Decision decision,
                                   @NotBlank @Size(max = 500) String reason,
                                   @NotBlank @Size(max = 500) String evidence) {}

    public record Extra(UUID id, UUID bookingId, UUID partnerId, int version, String description,
                        int quantity, long unitPriceCents, long amountCents, Status status,
                        Instant createdAt, Instant decisionAt, Channel channel) {}

    public record Audit(Extra extra, UUID proposedBy, TutorIdentityType tutorIdentityType,
                        UUID decisionBy, String reason, String evidence) {}

    public record PaymentAuthorization(UUID authorizationId, UUID partnerId, UUID bookingId, int version,
                                       String description, int quantity, long unitPriceCents, long amountCents,
                                       String currency, Instant approvedAt, UUID approvedBy, UUID tutorId,
                                       TutorIdentityType tutorIdentityType, Channel channel) {}
}
