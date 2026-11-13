package br.com.easypet.notification;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.time.Duration;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
class InternalHttp {
    private final SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
        @Override
        protected void prepareConnection(HttpURLConnection connection, String method) throws IOException {
            super.prepareConnection(connection, method);
            connection.setInstanceFollowRedirects(false);
        }
    };

    InternalHttp() {
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
    }

    RestClient.Builder client(String baseUrl) {
        return RestClient.builder().baseUrl(baseUrl).requestFactory(factory)
                .defaultStatusHandler(status -> status.is3xxRedirection(), (request, response) -> {
                    throw new RestClientException("Redirecionamento interno inesperado");
                });
    }
}
