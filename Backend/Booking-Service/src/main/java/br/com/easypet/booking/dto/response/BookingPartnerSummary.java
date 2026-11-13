package br.com.easypet.booking.dto.response;

import java.util.List;
import java.util.UUID;

public record BookingPartnerSummary(UUID id, String name, List<Service> services) {
    public record Service(UUID id, String name) {}
}
