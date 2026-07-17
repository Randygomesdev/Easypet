package br.com.easypet.partner.dto.request;

import java.time.DayOfWeek;

public record PartnerBusinessHourRequest(
    DayOfWeek dayOfWeek,
    String businessStartHour,
    String businessEndHour,
    String lunchStartHour,
    String lunchEndHour,
    boolean closed
) {}
