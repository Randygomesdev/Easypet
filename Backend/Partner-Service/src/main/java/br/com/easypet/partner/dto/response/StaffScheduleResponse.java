package br.com.easypet.partner.dto.response;

import java.time.LocalTime;
import java.util.UUID;

public record StaffScheduleResponse(
    UUID id,
    UUID staffId,
    Integer dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    LocalTime lunchStartTime,
    LocalTime lunchEndTime
) {}
