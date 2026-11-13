package br.com.easypet.booking.dto.response;

public record TutorBookingActions(boolean canCancel, boolean canReschedule, long tutorNoticeMinutes) {}
