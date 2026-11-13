package br.com.easypet.booking.exception;

public class PetAccessUnavailableException extends BookingUnavailableException {
    public PetAccessUnavailableException() {
        super("Não foi possível validar o vínculo do pet de balcão.");
    }
}
