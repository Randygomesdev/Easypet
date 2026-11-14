package br.com.easypet.notification;

import java.time.format.DateTimeFormatter;
import java.util.UUID;

record EmailMessage(UUID deliveryId, UUID userId, String subject, String body, String authorizedReceptionAddress) {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm");

    EmailMessage(UUID deliveryId, UUID userId, String subject, String body) {
        this(deliveryId, userId, subject, body, null);
    }

    EmailMessage forAuthorizedReception(String address) {
        return new EmailMessage(deliveryId, null, subject, body, address);
    }

    static EmailMessage forDelivery(Delivery delivery, UUID userId) {
        String schedule = delivery.bookingDate().format(DATE);
        return switch (delivery.type()) {
            case CONFIRMATION -> new EmailMessage(delivery.id(), userId, "Agendamento confirmado",
                    "Seu agendamento para " + schedule + " foi confirmado.");
            case RESCHEDULED -> new EmailMessage(delivery.id(), userId, "Agendamento reagendado",
                    "Seu agendamento foi alterado para " + schedule + ".");
            case CANCELLED -> new EmailMessage(delivery.id(), userId, "Agendamento cancelado",
                    "Seu agendamento de " + schedule + " foi cancelado.");
            case REMINDER -> new EmailMessage(delivery.id(), userId, "Lembrete de agendamento",
                    "Você tem um agendamento em " + schedule + ".");
            case READY -> new EmailMessage(delivery.id(), userId, "Serviço pronto para retirada",
                    "Seu pet está pronto para retirada.");
        };
    }
}
