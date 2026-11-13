package br.com.easypet.booking.dto.response;

import java.util.UUID;

public record BookingPetSummary(UUID id, String name, String species) {}
