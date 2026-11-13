package br.com.easypet.booking.domain.enums;

public enum BookingStatus {
    PENDING,
    CONFIRMED,
    IN_PROGRESS,
    CANCELLED,
    COMPLETED,
    NO_SHOW;

    public boolean canTransitionTo(BookingStatus next) {
        return switch (this) {
            case PENDING -> next == CONFIRMED || next == CANCELLED;
            case CONFIRMED -> next == IN_PROGRESS || next == CANCELLED || next == NO_SHOW;
            case IN_PROGRESS -> next == COMPLETED;
            case CANCELLED, COMPLETED, NO_SHOW -> false;
        };
    }
}
