package br.com.easypet.booking.dto.request;

import jakarta.validation.constraints.Size;

public record BookingStatusRequest(@Size(max = 500) String reason) {}
