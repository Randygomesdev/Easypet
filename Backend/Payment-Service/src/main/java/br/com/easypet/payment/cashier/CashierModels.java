package br.com.easypet.payment.cashier;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

final class CashierModels {
    static final long MAX_CENTS = 99_999_999_999L;

    private CashierModels() {}

    enum Method {
        CASH, PIX, DEBIT_CARD, CREDIT_CARD, OTHER;

        @JsonCreator
        public static Method fromName(String name) {
            return valueOf(name);
        }
    }

    enum MovementType { RECEIPT, REVERSAL }

    record NewCharge(
            @NotNull UUID bookingId,
            @NotBlank @Size(max = 160) String description,
            @NotNull @Digits(integer = 11, fraction = 0) @PositiveOrZero @Max(MAX_CENTS) BigDecimal baseCents,
            @NotNull @Digits(integer = 11, fraction = 0) @PositiveOrZero @Max(MAX_CENTS) BigDecimal extrasCents,
            @NotNull @Digits(integer = 11, fraction = 0) @PositiveOrZero @Max(MAX_CENTS) BigDecimal discountCents
    ) {}

    record NewReceipt(
            @NotNull Method method,
            @NotNull @Digits(integer = 11, fraction = 0) @Positive @Max(MAX_CENTS) BigDecimal amountCents
    ) {}

    record ApplyExtra(@NotNull UUID approvalId,
                      @NotNull @Positive @Max(Integer.MAX_VALUE) @Digits(integer = 10, fraction = 0) BigDecimal version) {
        int approvalVersion() {
            return version.intValueExact();
        }
        @JsonAnySetter
        void rejectUnknownField(String field, Object value) {
            throw new IllegalArgumentException("Envie somente o identificador e a versão do aceite.");
        }
    }

    record NewReversal(@NotBlank @Size(max = 300) String reason) {}

    record Id(UUID id) {}

    record Context(UUID partnerId, UUID actorId, LocalDate businessDate, boolean closedToday,
                   boolean canReceive, boolean canClose) {}

    record Page<T>(List<T> content, int number, int size, long totalElements, long totalPages) {
        static <T> Page<T> of(List<T> content, int page, int size, long count) {
            return new Page<>(content, page, size, count, Math.ceilDiv(count, size));
        }
    }

    record Charge(
            UUID id, UUID bookingId, String description, long baseCents, long extrasCents, long discountCents,
            long totalCents, long receivedCents, long balanceCents, OffsetDateTime createdAt, UUID createdBy
    ) {}

    record Movement(
            UUID id, UUID chargeId, String chargeDescription, LocalDate date, MovementType type, Method method,
            long amountCents, String reason, UUID reversesReceiptId, OffsetDateTime createdAt, UUID createdBy
    ) {}

    record ApprovedExtra(
            UUID id, UUID approvalId, int version, String description, int quantity, long unitPriceCents,
            long amountCents, OffsetDateTime acceptedAt,
            UUID acceptedBy, String tutorIdentityType, String channel, OffsetDateTime appliedAt, UUID appliedBy
    ) {}

    record ChargeDetails(Charge charge, List<Movement> movements, List<ApprovedExtra> approvedExtras) {}

    record AdminCharge(
            UUID id, long baseCents, long extrasCents, long legacyExtrasCents, long discountCents,
            long totalCents, long receivedCents, long balanceCents, OffsetDateTime createdAt, UUID createdBy
    ) {
        static AdminCharge from(Charge charge, List<ApprovedExtra> extras) {
            long approved = extras.stream().mapToLong(ApprovedExtra::amountCents).sum();
            return new AdminCharge(charge.id(), charge.baseCents(), charge.extrasCents(), charge.extrasCents() - approved,
                    charge.discountCents(), charge.totalCents(), charge.receivedCents(), charge.balanceCents(),
                    charge.createdAt(), charge.createdBy());
        }
    }

    record AdminMovement(
            UUID id, LocalDate date, MovementType type, Method method, long amountCents, String reason,
            UUID reversesReceiptId, OffsetDateTime createdAt, UUID createdBy
    ) {
        static AdminMovement from(Movement movement) {
            return new AdminMovement(movement.id(), movement.date(), movement.type(), movement.method(),
                    movement.amountCents(), movement.reason(), movement.reversesReceiptId(),
                    movement.createdAt(), movement.createdBy());
        }
    }

    record AdminBookingCashier(
            UUID bookingId, UUID partnerId, AdminCharge charge, List<ApprovedExtra> approvedExtras,
            Page<AdminMovement> movements
    ) {}

    record Totals(long receivedCents, long adjustmentCents, long netCents, Map<Method, Long> byMethod) {}

    record Day(
            LocalDate date, LocalDate businessDate, UUID closingId, OffsetDateTime closedAt, UUID closedBy, Totals totals,
            Page<Movement> movements
    ) {}
}
