package br.com.easypet.pet.client;

import br.com.easypet.pet.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Component
public class CustomerMembershipClient {
    private final RestTemplate http;
    private final String partnerUrl;
    private final String summaryToken;

    public CustomerMembershipClient(
            @Value("${PARTNER_SERVICE_URL:http://localhost:8083/api/v1}") String partnerUrl,
            @Value("${BOOKING_PET_SUMMARY_TOKEN:}") String summaryToken) {
        this.partnerUrl = partnerUrl;
        this.summaryToken = summaryToken;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(5000);
        http = new RestTemplate(factory);
    }

    public UUID requirePartner(UUID customerId, String authorization) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, authorization);
        try {
            var response = http.exchange(
                    partnerUrl + "/internal/partners/me/customers/{customerId}/membership",
                    HttpMethod.GET, new HttpEntity<>(headers), Membership.class, customerId);
            Membership membership = response.getBody();
            if (response.getStatusCode() == HttpStatus.OK && membership != null
                    && customerId.equals(membership.customerId()) && membership.partnerId() != null) {
                return membership.partnerId();
            }
            throw unavailable();
        } catch (HttpClientErrorException.Unauthorized rejected) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sua sessão expirou.");
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Forbidden exception) {
            throw new ResourceNotFoundException("Cliente não encontrado neste escopo.");
        } catch (RestClientException exception) {
            throw unavailable();
        }
    }

    public List<Membership> findClaimedCustomers() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes request)) {
            throw unavailable();
        }
        String bearer = request.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, bearer);
        try {
            var response = http.exchange(partnerUrl + "/internal/partners/customer-claims/me",
                    HttpMethod.GET, new HttpEntity<>(headers), Membership[].class);
            Membership[] memberships = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || memberships == null) throw unavailable();
            List<Membership> result = List.of(memberships);
            if (result.stream().anyMatch(item -> item.customerId() == null || item.partnerId() == null)) {
                throw unavailable();
            }
            return result;
        } catch (HttpClientErrorException.Unauthorized rejected) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sua sessão expirou.");
        } catch (RestClientException | NullPointerException failure) {
            throw unavailable();
        }
    }

    public boolean isClaimOwner(UUID partnerId, UUID customerId, UUID ownerId) {
        if (summaryToken.isBlank()) throw unavailable();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(summaryToken);
        try {
            var response = http.exchange(
                    partnerUrl + "/internal/partners/customer-claims/{customerId}/owner?partnerId={partnerId}&userId={ownerId}",
                    HttpMethod.GET, new HttpEntity<>(headers), Void.class, customerId, partnerId, ownerId);
            if (response.getStatusCode() != HttpStatus.NO_CONTENT) throw unavailable();
            return true;
        } catch (HttpClientErrorException.NotFound rejected) {
            return false;
        } catch (RestClientException failure) {
            throw unavailable();
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Não foi possível verificar o vínculo do cliente. Tente novamente.");
    }

    public record Membership(UUID customerId, UUID partnerId) {}
}
