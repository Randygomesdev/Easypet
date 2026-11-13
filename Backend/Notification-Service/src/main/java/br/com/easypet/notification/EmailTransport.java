package br.com.easypet.notification;

interface EmailTransport {
    Result send(EmailMessage message);

    record Result(Delivery.Outcome outcome, String error) {}
}
