package br.com.easypet.booking.service;

import br.com.easypet.booking.client.PartnerServiceClient;
import br.com.easypet.booking.client.dto.PartnerResponseDto;
import br.com.easypet.booking.client.dto.ServiceResponseDto;
import br.com.easypet.booking.client.dto.StaffAbsenceResponseDto;
import br.com.easypet.booking.client.dto.StaffResponseDto;
import br.com.easypet.booking.client.dto.StaffScheduleResponseDto;
import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.domain.enums.BillingUnit;
import br.com.easypet.booking.domain.enums.BookingType;
import br.com.easypet.booking.dto.response.AgendaBlock;
import br.com.easypet.booking.dto.response.AvailabilitySlot;
import br.com.easypet.booking.dto.response.BookingPartnerSummary;
import br.com.easypet.booking.dto.response.PartnerBusinessHourIntegrationResponse;
import br.com.easypet.booking.exception.BookingConflictException;
import br.com.easypet.booking.exception.BusinessException;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.repository.BookingAgendaStore;
import br.com.easypet.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;

@Component
@RequiredArgsConstructor
class BookingSchedule {
    static final int DEFAULT_DURATION_MINUTES = 30;
    private static final DateTimeFormatter SLOT_TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final BookingRepository bookings;
    private final BookingAgendaStore agenda;
    private final PartnerServiceClient partners;
    private final Clock bookingClock;

    record Allocation(LocalDateTime start, LocalDateTime end, UUID staffId, boolean fitting, BigDecimal price) {}

    PartnerResponseDto requireActivePartner(UUID partnerId) {
        var partner = partners.getOperations(partnerId);
        if (!Boolean.TRUE.equals(partner.active())) {
            throw new ResourceNotFoundException("Este estabelecimento não está disponível para novos horários.");
        }
        return partner;
    }

    BookingPartnerSummary partnerSummary(UUID partnerId) {
        var partner = partners.getOperations(partnerId);
        var services = partner.services() == null ? List.<BookingPartnerSummary.Service>of() : partner.services().stream()
                .map(service -> new BookingPartnerSummary.Service(service.id(), service.name())).toList();
        return new BookingPartnerSummary(partner.id(), partner.name(), services);
    }

    Allocation appointment(UUID partnerId, UUID serviceId, LocalDateTime start, UUID staffId, UUID excludedId,
                           boolean requestFitting, boolean approveFitting, LocalDateTime savedEnd) {
        if (start == null) {
            throw new BusinessException("A data do agendamento é obrigatória.");
        }
        if (serviceId == null) {
            throw new BusinessException("O serviço é obrigatório para agendamento convencional.");
        }
        if (!approveFitting) {
            requireFuture(start);
        }
        PartnerResponseDto partner = requireActivePartner(partnerId);
        ServiceResponseDto service = requireService(partner, serviceId);
        if (service.billingUnit() == BillingUnit.DAILY) {
            throw new BusinessException("Informe as datas de entrada e saída para hospedagem.");
        }
        LocalDateTime end = savedEnd == null ? start.plusMinutes(duration(service)) : savedEnd;
        List<StaffResponseDto> eligible = partners.getStaffByPartnerId(partnerId, serviceId);
        if (eligible.isEmpty()) {
            throw new BusinessException("Nenhum profissional habilitado cadastrado para este serviço.");
        }
        List<StaffResponseDto> selected = eligible.stream()
                .filter(staff -> staffId == null || staff.id().equals(staffId))
                .toList();
        if (selected.isEmpty()) {
            throw new BusinessException("O profissional selecionado não está habilitado para este serviço.");
        }

        DayHours hours = businessHours(partner, start.toLocalDate());
        AgendaWindow window = loadWindow(partnerId, start, end, excludedId, partner);
        LocalDateTime day = start.toLocalDate().atStartOfDay();
        Map<UUID, Long> workload = new HashMap<>();
        if (staffId == null) {
            bookings.countDailyStaffBookings(partnerId, day, day.plusDays(1))
                    .forEach(row -> workload.put((UUID) row[0], (Long) row[1]));
        }

        boolean businessTime = hours != null && hours.contains(start, end);
        List<StaffResponseDto> ranked = selected.stream()
                .sorted(Comparator.comparingLong((StaffResponseDto staff) -> workload.getOrDefault(staff.id(), 0L))
                        .thenComparing(StaffResponseDto::id))
                .toList();
        UUID fittingStaffId = null;
        for (StaffResponseDto staff : ranked) {
            Availability result = availability(staff.id(), staffCalendar(staff.id()), window, start, end, businessTime);
            if (result == Availability.FREE || (approveFitting && result == Availability.OUT_OF_SCHEDULE)) {
                return new Allocation(start, end, staff.id(), approveFitting, service.price());
            }
            if (fittingStaffId == null && result != Availability.BLOCKED && result != Availability.ABSENT) {
                fittingStaffId = staff.id();
            }
        }
        if (requestFitting && fittingStaffId != null) {
            return new Allocation(start, end, fittingStaffId, true, service.price());
        }
        throw new BookingConflictException("O intervalo não está disponível para os profissionais selecionados.");
    }

    Allocation boarding(UUID partnerId, UUID serviceId, LocalDateTime checkIn, LocalDateTime checkOut, UUID excludedId) {
        if (checkIn == null || checkOut == null) {
            throw new BusinessException("As datas de check-in e check-out são obrigatórias para hospedagem.");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new BusinessException("A data de check-out deve ser posterior à data de check-in.");
        }
        requireFuture(checkIn);
        if (serviceId == null) {
            throw new BusinessException("O serviço é obrigatório para hospedagem.");
        }
        PartnerResponseDto partner = requireActivePartner(partnerId);
        ServiceResponseDto service = requireService(partner, serviceId);
        if (service.billingUnit() != BillingUnit.DAILY) {
            throw new BusinessException("O serviço selecionado deve ser do tipo diário (DAILY) para hospedagem.");
        }
        AgendaWindow window = loadWindow(partnerId, checkIn, checkOut, excludedId, partner);
        if (window.isBlocked(null, checkIn, checkOut)) {
            throw new BookingConflictException("A agenda está bloqueada no período de hospedagem.");
        }
        int capacity = partner.boardingCapacity() == null ? 0 : partner.boardingCapacity();
        if (capacity <= 0 || exceedsBoardingCapacity(window, checkIn, checkOut, capacity)) {
            throw new BookingConflictException("Capacidade de hospedagem esgotada para este período.");
        }

        long nights = Math.max(1, ChronoUnit.DAYS.between(checkIn.toLocalDate(), checkOut.toLocalDate()));
        return new Allocation(checkIn, checkOut, null, false, service.price().multiply(BigDecimal.valueOf(nights)));
    }

    private boolean exceedsBoardingCapacity(AgendaWindow window, LocalDateTime start, LocalDateTime end, int capacity) {
        // Sweep interval endpoints. Reservations that only touch at check-out/check-in do not overlap.
        Map<LocalDateTime, Integer> changes = new TreeMap<>();
        for (Occupied occupied : window.occupied()) {
            if (occupied.type() == BookingType.BOARDING) {
                LocalDateTime from = occupied.start().isBefore(start) ? start : occupied.start();
                LocalDateTime to = occupied.end().isAfter(end) ? end : occupied.end();
                if (from.isBefore(to)) {
                    changes.merge(from, 1, Integer::sum);
                    changes.merge(to, -1, Integer::sum);
                }
            }
        }
        int simultaneous = 0;
        for (int change : changes.values()) {
            simultaneous += change;
            if (simultaneous >= capacity) {
                return true;
            }
        }
        return false;
    }

    List<AvailabilitySlot> availability(UUID partnerId, UUID serviceId, LocalDate date, UUID excludedId) {
        PartnerResponseDto partner = requireActivePartner(partnerId);
        DayHours hours = businessHours(partner, date);
        if (hours == null) {
            return List.of();
        }
        ServiceResponseDto service = serviceId == null ? null : requireService(partner, serviceId);
        int duration = duration(service);
        LocalDateTime first = date.atTime(hours.start());
        LocalDateTime closing = date.atTime(hours.end());
        AgendaWindow window = loadWindow(partnerId, first, closing, excludedId, partner);
        List<StaffResponseDto> staff = serviceId == null ? List.of() : partners.getStaffByPartnerId(partnerId, serviceId);
        if (serviceId != null && staff.isEmpty()) {
            return List.of();
        }
        Map<UUID, StaffCalendar> calendars = new HashMap<>();
        staff.forEach(person -> calendars.put(person.id(), staffCalendar(person.id())));

        List<AvailabilitySlot> slots = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now(bookingClock);
        for (LocalDateTime start = first; start.plusMinutes(duration).compareTo(closing) <= 0; start = start.plusMinutes(30)) {
            LocalDateTime end = start.plusMinutes(duration);
            if (!hours.contains(start, end)) {
                continue;
            }
            String time = start.format(SLOT_TIME);
            if (!start.isAfter(now)) {
                slots.add(new AvailabilitySlot(time, false, List.of(), "OUT_OF_SCHEDULE", false));
            } else if (serviceId == null) {
                boolean blocked = window.isBlocked(null, start, end);
                slots.add(new AvailabilitySlot(time, !blocked && !window.hasAnyAppointment(start, end), List.of(),
                        blocked ? "BLOCKED_EXCEPTION" : null, false));
            } else {
                slots.add(availabilitySlot(time, staff, calendars, window, start, end));
            }
        }
        return slots;
    }

    private AvailabilitySlot availabilitySlot(String time, List<StaffResponseDto> staff, Map<UUID, StaffCalendar> calendars,
                                              AgendaWindow window, LocalDateTime start, LocalDateTime end) {
        List<StaffResponseDto> free = new ArrayList<>();
        List<StaffResponseDto> fitting = new ArrayList<>();
        Availability unavailable = Availability.OUT_OF_SCHEDULE;
        for (StaffResponseDto person : staff) {
            Availability result = availability(person.id(), calendars.get(person.id()), window, start, end, true);
            switch (result) {
                case FREE -> free.add(person);
                case BUSY, OUT_OF_SCHEDULE -> fitting.add(person);
                default -> { }
            }
            if (result.ordinal() > unavailable.ordinal()) {
                unavailable = result;
            }
        }
        if (!free.isEmpty()) {
            return new AvailabilitySlot(time, true, free, null, null);
        }
        // A block on one professional must not disable a fitting for an unblocked professional.
        String reason = fitting.isEmpty() ? unavailable.reason : fitting.stream()
                .anyMatch(person -> window.hasAppointment(person.id(), start, end)) ? "FULLY_BOOKED" : "OUT_OF_SCHEDULE";
        return new AvailabilitySlot(time, false, fitting, reason, !fitting.isEmpty());
    }

    void verifyBlock(UUID partnerId, UUID staffId, LocalDateTime start, LocalDateTime end) {
        if (!end.isAfter(start)) {
            throw new BusinessException("O fim do bloqueio deve ser posterior ao início.");
        }
        if (staffId != null && partners.getStaffByPartnerId(partnerId, null).stream().noneMatch(staff -> staff.id().equals(staffId))) {
            throw new ResourceNotFoundException("Profissional não encontrado no estabelecimento.");
        }
        AgendaWindow window = loadWindow(partnerId, start, end, null, partners.getOperations(partnerId));
        boolean occupied = window.occupied().stream().anyMatch(booking ->
                (staffId == null || (booking.type() != BookingType.BOARDING &&
                        (booking.staffId() == null || staffId.equals(booking.staffId())))) &&
                overlaps(start, end, booking.start(), booking.end()));
        if (occupied) {
            throw new BookingConflictException("O bloqueio conflita com uma reserva existente.");
        }
    }

    private enum Availability {
        FREE(null), OUT_OF_SCHEDULE("OUT_OF_SCHEDULE"), BUSY("FULLY_BOOKED"),
        ABSENT("BLOCKED_ABSENCE"), BLOCKED("BLOCKED_EXCEPTION");
        final String reason;
        Availability(String reason) { this.reason = reason; }
    }

    private Availability availability(UUID staffId, StaffCalendar calendar, AgendaWindow window,
                                      LocalDateTime start, LocalDateTime end, boolean businessTime) {
        if (window.isBlocked(staffId, start, end)) {
            return Availability.BLOCKED;
        }
        if (calendar.absences().stream().anyMatch(absence -> overlaps(start, end, absence.startDate(), absence.endDate()))) {
            return Availability.ABSENT;
        }
        if (window.hasAppointment(staffId, start, end)) {
            return Availability.BUSY;
        }
        return businessTime && calendar.inSchedule(start, end) ? Availability.FREE : Availability.OUT_OF_SCHEDULE;
    }

    private record StaffCalendar(List<StaffScheduleResponseDto> schedules, List<StaffAbsenceResponseDto> absences) {
        boolean inSchedule(LocalDateTime start, LocalDateTime end) {
            int day = start.getDayOfWeek().getValue() % 7 + 1;
            return start.toLocalDate().equals(end.toLocalDate()) && schedules.stream().anyMatch(schedule ->
                    schedule.dayOfWeek() == day &&
                    new DayHours(schedule.startTime(), schedule.endTime(), schedule.lunchStartTime(), schedule.lunchEndTime())
                            .contains(start, end));
        }
    }

    private StaffCalendar staffCalendar(UUID staffId) {
        return new StaffCalendar(partners.getStaffSchedule(staffId), partners.getStaffAbsences(staffId));
    }

    private record DayHours(LocalTime start, LocalTime end, LocalTime lunchStart, LocalTime lunchEnd) {
        boolean contains(LocalDateTime from, LocalDateTime to) {
            LocalTime fromTime = from.toLocalTime();
            LocalTime toTime = to.toLocalTime();
            return from.toLocalDate().equals(to.toLocalDate()) && !fromTime.isBefore(start) && !toTime.isAfter(end)
                    && (lunchStart == null || lunchEnd == null || !lunchStart.isBefore(lunchEnd)
                        || !fromTime.isBefore(lunchEnd) || !toTime.isAfter(lunchStart));
        }
    }

    private DayHours businessHours(PartnerResponseDto partner, LocalDate date) {
        List<PartnerBusinessHourIntegrationResponse> hours = partner.businessHours();
        if (hours == null) {
            return null;
        }
        return hours.stream().filter(day -> day.dayOfWeek() == date.getDayOfWeek() && !day.closed())
                .findFirst().map(day -> {
                    LocalTime start = parseTime(day.businessStartHour(), LocalTime.of(8, 0));
                    LocalTime end = parseTime(day.businessEndHour(), LocalTime.of(18, 0));
                    if (!start.isBefore(end)) {
                        start = LocalTime.of(8, 0);
                        end = LocalTime.of(18, 0);
                    }
                    return new DayHours(start, end, parseTime(day.lunchStartHour(), null), parseTime(day.lunchEndHour(), null));
                }).orElse(null);
    }

    private LocalTime parseTime(String value, LocalTime fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            String time = value.trim();
            return LocalTime.parse(time.length() == 4 ? "0" + time : time);
        } catch (DateTimeParseException ex) {
            return fallback;
        }
    }

    private record Occupied(BookingType type, UUID staffId, LocalDateTime start, LocalDateTime end) {}

    private record AgendaWindow(List<Occupied> occupied, List<AgendaBlock> blocks) {
        boolean isBlocked(UUID staffId, LocalDateTime start, LocalDateTime end) {
            return blocks.stream().anyMatch(block -> (block.staffId() == null || block.staffId().equals(staffId))
                    && overlaps(start, end, block.start(), block.end()));
        }

        boolean hasAnyAppointment(LocalDateTime start, LocalDateTime end) {
            return occupied.stream().anyMatch(booking -> booking.type() != BookingType.BOARDING
                    && overlaps(start, end, booking.start(), booking.end()));
        }

        boolean hasAppointment(UUID staffId, LocalDateTime start, LocalDateTime end) {
            return occupied.stream().anyMatch(booking -> booking.type() != BookingType.BOARDING
                    && (booking.staffId() == null || staffId.equals(booking.staffId()))
                    && overlaps(start, end, booking.start(), booking.end()));
        }
    }

    private AgendaWindow loadWindow(UUID partnerId, LocalDateTime start, LocalDateTime end, UUID excludedId, PartnerResponseDto partner) {
        List<Occupied> occupied = bookings.findAgendaCandidates(partnerId, start, end).stream()
                .filter(booking -> excludedId == null || !excludedId.equals(booking.getId()))
                .map(booking -> new Occupied(booking.getType(), booking.getStaffId(), booking.getBookingDate(),
                        existingEnd(booking, partner)))
                .toList();
        return new AgendaWindow(occupied, agenda.findBlocks(partnerId, start, end));
    }

    private LocalDateTime existingEnd(Booking booking, PartnerResponseDto partner) {
        if (booking.getScheduledEnd() != null) {
            return booking.getScheduledEnd();
        }
        if (booking.getType() == BookingType.BOARDING && booking.getCheckOut() != null) {
            return booking.getCheckOut();
        }
        return booking.getBookingDate().plusMinutes(duration(findService(partner, booking.getServiceId())));
    }

    private ServiceResponseDto requireService(PartnerResponseDto partner, UUID id) {
        ServiceResponseDto service = findService(partner, id);
        if (service == null) {
            throw new ResourceNotFoundException("Serviço não encontrado no estabelecimento selecionado.");
        }
        return service;
    }

    private ServiceResponseDto findService(PartnerResponseDto partner, UUID id) {
        if (partner == null || partner.services() == null) {
            return null;
        }
        return partner.services().stream().filter(service -> Objects.equals(service.id(), id)).findFirst().orElse(null);
    }

    private int duration(ServiceResponseDto service) {
        Integer minutes = service == null ? null : service.durationMinutes();
        return minutes != null && minutes > 0 ? minutes : DEFAULT_DURATION_MINUTES;
    }

    private void requireFuture(LocalDateTime start) {
        if (!start.isAfter(LocalDateTime.now(bookingClock))) {
            throw new BusinessException("Selecione um horário futuro.");
        }
    }

    private static boolean overlaps(LocalDateTime aStart, LocalDateTime aEnd, LocalDateTime bStart, LocalDateTime bEnd) {
        return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
    }
}
