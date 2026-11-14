package br.com.easypet.booking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InterruptBookingRequest(@NotBlank @Size(max = 500) String reason) {}
