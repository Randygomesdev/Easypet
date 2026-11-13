package br.com.easypet.notification;

import static br.com.easypet.notification.Delivery.Type;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class BookingEventConsumer {
    private final NotificationStore store;
    private final Clock clock;
    private final ZoneId bookingZone;

    BookingEventConsumer(NotificationStore store, Clock clock, @Value("${notification.booking-zone}") String zone) {
        this.store = store;
        this.clock = clock;
        this.bookingZone = ZoneId.of(zone);
    }

    @Transactional
    public void consume(BookingEvent event) {
        event.validate();
        Instant now = clock.instant();
        store.ensureBooking(event);
        var booking = store.lockBooking(event.bookingId());
        if (!booking.partnerId().equals(event.partnerId())) {
            throw new IllegalArgumentException("Estabelecimento divergente no evento de reserva");
        }
        if (!store.recordEvent(event, now) || event.bookingVersion() <= booking.version()) {
            return;
        }

        store.advanceBooking(event);
        store.supersedePrevious(event, now);
        if (event.userId() == null) {
            return;
        }
        switch (event.eventType()) {
            case BOOKING_CONFIRMED -> store.enqueue(event, Type.CONFIRMATION, now, now, null);
            case BOOKING_RESCHEDULED -> store.enqueue(event, Type.RESCHEDULED, now, now, null);
            case BOOKING_CANCELLED -> store.enqueue(event, Type.CANCELLED, now, now, null);
            case BOOKING_READY -> store.enqueue(event, Type.READY, now, now, null);
            case BOOKING_CREATED, BOOKING_NO_SHOW -> { }
        }

        boolean needsReminder = event.eventType() == BookingEvent.Type.BOOKING_CONFIRMED
                || (event.eventType() == BookingEvent.Type.BOOKING_RESCHEDULED && "CONFIRMED".equals(event.status()));
        Instant appointment = event.bookingDate().atZone(bookingZone).toInstant();
        if (needsReminder && appointment.isAfter(now)) {
            Instant due = appointment.minus(Duration.ofHours(24));
            store.enqueue(event, Type.REMINDER, now, due.isBefore(now) ? now : due, appointment);
        }
    }
}
