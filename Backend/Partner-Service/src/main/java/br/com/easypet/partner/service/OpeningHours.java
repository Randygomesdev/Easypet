package br.com.easypet.partner.service;

import br.com.easypet.partner.dto.request.PartnerBusinessHourRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.EnumSet;
import java.util.List;

final class OpeningHours {
    private OpeningHours() {}

    static void validate(List<PartnerBusinessHourRequest> hours) {
        var days = EnumSet.noneOf(DayOfWeek.class);
        for (var entry : hours) {
            if (entry == null || entry.dayOfWeek() == null || !days.add(entry.dayOfWeek())) throw invalid();
            if (entry.closed()) continue;
            validatePeriod(time(entry.businessStartHour()), time(entry.businessEndHour()),
                    time(entry.lunchStartHour()), time(entry.lunchEndHour()));
        }
    }

    static void validatePeriod(LocalTime start, LocalTime end, LocalTime breakStart, LocalTime breakEnd) {
        if (start == null || end == null || !start.isBefore(end)
                || ((breakStart == null) != (breakEnd == null))
                || (breakStart != null && (!breakStart.isBefore(breakEnd)
                    || breakStart.isBefore(start) || breakEnd.isAfter(end)))) {
            throw invalid();
        }
    }

    private static LocalTime time(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.length() != 5) throw invalid();
        try {
            return LocalTime.parse(value);
        } catch (DateTimeParseException invalid) {
            throw invalid();
        }
    }

    static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Confira o expediente, o intervalo e os dias repetidos.");
    }
}
