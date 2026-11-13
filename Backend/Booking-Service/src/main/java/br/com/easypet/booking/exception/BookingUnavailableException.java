package br.com.easypet.booking.exception;

public class BookingUnavailableException extends RuntimeException {
    public BookingUnavailableException(String message) {
        super(message);
    }

    public BookingUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
