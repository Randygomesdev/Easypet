package br.com.easypet.booking.dto.response;

import java.util.UUID;

public record BookingAccessResponse(UUID partnerId, boolean canManage, boolean canAttend, UUID staffId,
                                    boolean teamMember, boolean canRegisterInPersonExtraDecision) {}
