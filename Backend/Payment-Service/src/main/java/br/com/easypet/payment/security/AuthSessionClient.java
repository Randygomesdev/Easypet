package br.com.easypet.payment.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings.Redirects;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Component
class AuthSessionClient {
    private final RestTemplate http;
    private final String sessionUrl;

    AuthSessionClient(RestTemplateBuilder builder, @Value("${services.auth-service.url}") String authUrl) {
        this.http = builder.redirects(Redirects.DONT_FOLLOW)
                .connectTimeout(Duration.ofSeconds(2)).readTimeout(Duration.ofSeconds(4)).build();
        this.sessionUrl = authUrl + "/auth/session";
    }

    VerifiedSession verify(String bearer) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, bearer);
        try {
            var response = http.exchange(sessionUrl, HttpMethod.GET, new HttpEntity<>(headers), VerifiedSession.class);
            VerifiedSession session = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || session == null || !session.isValid()) {
                throw new AuthenticationServiceException("Resposta de sessão inválida.");
            }
            return session;
        } catch (HttpClientErrorException.Unauthorized ex) {
            throw new BadCredentialsException("Sessão recusada pelo Auth.", ex);
        } catch (RestClientException ex) {
            throw new AuthenticationServiceException("Não foi possível confirmar a sessão.", ex);
        }
    }
}
