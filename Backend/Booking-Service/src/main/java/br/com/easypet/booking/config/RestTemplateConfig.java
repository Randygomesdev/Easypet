package br.com.easypet.booking.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.datasource.ConnectionHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.sql.DataSource;
import java.net.http.HttpTimeoutException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CancellationException;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(DataSource dataSource,
            @Value("${app.http.connect-timeout}") Duration connectTimeout,
            @Value("${app.http.read-timeout}") Duration readTimeout) {
        if (connectTimeout.toMillis() <= 0 || readTimeout.toMillis() <= 0) {
            throw new IllegalArgumentException("Os limites HTTP do Booking devem ser positivos.");
        }
        HttpClient client = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory regularFactory = requestFactory(client, readTimeout);
        RestTemplate restTemplate = new RestTemplate((uri, method) -> {
            // JpaTransactionManager shares its deadline with JdbcTemplate through this holder.
            var resource = TransactionSynchronizationManager.getResource(dataSource);
            if (resource instanceof ConnectionHolder connection && connection.hasTimeout()) {
                long remaining = connection.getTimeToLiveInMillis();
                if (remaining < readTimeout.toMillis()) {
                    return requestFactory(client, Duration.ofMillis(remaining)).createRequest(uri, method);
                }
            }
            return regularFactory.createRequest(uri, method);
        });

        restTemplate.setInterceptors(List.of((request, body, execution) -> {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                String authHeader = attributes.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
                if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION) && authHeader != null && !authHeader.isEmpty()) {
                    request.getHeaders().set(HttpHeaders.AUTHORIZATION, authHeader);
                }
            }
            try {
                return execution.execute(request, body);
            } catch (CancellationException ex) {
                // The JDK future can throw directly when the request deadline cancels it before headers arrive.
                var timeout = new HttpTimeoutException("Tempo limite da dependência HTTP excedido.");
                timeout.initCause(ex);
                throw timeout;
            }
        }));

        return restTemplate;
    }

    private JdkClientHttpRequestFactory requestFactory(HttpClient client, Duration timeout) {
        var factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(timeout);
        return factory;
    }
}
