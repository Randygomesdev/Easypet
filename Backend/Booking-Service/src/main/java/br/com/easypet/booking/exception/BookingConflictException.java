package br.com.easypet.booking.exception;

public class BookingConflictException extends BusinessException {
    private final String field;

    public BookingConflictException(String message) {
        this(message, null);
    }

    public BookingConflictException(String message, String field) {
        super(message);
        this.field = field;
    }

    public String field() {
        return field;
    }
}
