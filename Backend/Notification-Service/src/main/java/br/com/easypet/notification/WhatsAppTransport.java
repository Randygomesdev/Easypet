package br.com.easypet.notification;

import java.util.Map;
import java.util.UUID;

/** Porta para um provedor que aceite chaves de idempotência por entrega. */
public interface WhatsAppTransport {
    Result send(UUID deliveryId, String recipientE164, String approvedTemplate, Map<String, String> parameters);

    enum Result { ACCEPTED, TEMPORARY_FAILURE, PERMANENT_FAILURE, UNKNOWN }
}
