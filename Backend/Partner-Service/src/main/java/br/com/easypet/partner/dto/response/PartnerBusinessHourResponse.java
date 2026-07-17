package br.com.easypet.partner.dto.response;

import java.time.DayOfWeek;

public record PartnerBusinessHourResponse(
    DayOfWeek dayOfWeek,
    String businessStartHour,
    String businessEndHour,
    String lunchStartHour,
    String lunchEndHour,
    boolean closed
) {}
