package br.com.innkercode.auth.service;

import br.com.innkercode.auth.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.UUID;

@Slf4j
@Component
public class PartnerOwnershipClient {

    private final RestClient partner;

    public PartnerOwnershipClient(@Value("${app.partner-service-url}") String baseUrl) {
        var requests = new SimpleClientHttpRequestFactory();
        requests.setConnectTimeout(Duration.ofSeconds(2));
        requests.setReadTimeout(Duration.ofSeconds(3));
        partner = RestClient.builder().baseUrl(baseUrl).requestFactory(requests).build();
    }

    public UUID requireOwnedPartner(String authorization) {
        try {
            var owned = partner.get().uri("/partners/me").header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve().body(PartnerId.class);
            if (owned == null || owned.id() == null) {
                throw unavailable();
            }
            // The current owner endpoint can return inactive partners. The catalog resolves active IDs only.
            var active = partner.get().uri("/partners/catalog/{id}", owned.id())
                    .header(HttpHeaders.AUTHORIZATION, authorization).retrieve().body(PartnerId.class);
            if (active == null || !owned.id().equals(active.id())) {
                throw unavailable();
            }
            return owned.id();
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PARTNER_NOT_FOUND", "Estabelecimento ativo não encontrado.");
        } catch (HttpClientErrorException.Unauthorized ex) {
            throw ApiException.invalidSession();
        } catch (RestClientException ex) {
            log.warn("Falha ao verificar estabelecimento no Partner Service ({})", ex.getClass().getSimpleName());
            throw unavailable();
        }
    }

    private ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PARTNER_VERIFICATION_UNAVAILABLE",
                "Não foi possível verificar o estabelecimento.");
    }

    private record PartnerId(UUID id) {}
}
