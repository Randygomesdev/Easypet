package br.com.easypet.pet.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

@Component
public class BookingAccessClient {

    private final RestTemplate restTemplate;
    private final String bookingServiceUrl;

    public BookingAccessClient(@Value("${BOOKING_SERVICE_URL:http://localhost:8084/api/v1}") String bookingServiceUrl) {
        this.bookingServiceUrl = bookingServiceUrl;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(5000);
        restTemplate = new RestTemplate(factory);
    }

    public boolean hasPetAccess(UUID petId, UUID ownerId) {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes request)) {
            return false;
        }
        String authorization = request.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null) {
            return false;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, authorization);
        try {
            return Boolean.TRUE.equals(restTemplate.exchange(
                    bookingServiceUrl + "/internal/pets/{petId}/access?ownerId={ownerId}",
                    HttpMethod.GET, new HttpEntity<>(headers), Boolean.class, petId, ownerId
            ).getBody());
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Forbidden |
                 HttpClientErrorException.Unauthorized e) {
            return false;
        }
    }
}
