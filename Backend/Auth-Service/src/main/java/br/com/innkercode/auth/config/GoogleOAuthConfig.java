package br.com.innkercode.auth.config;

import br.com.innkercode.auth.security.GoogleOAuthFlow;
import jakarta.servlet.SessionCookieConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.NullSecurityContextRepository;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

import java.time.Clock;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "app.google-auth.enabled", havingValue = "true")
public class GoogleOAuthConfig {

    private static final String PROVIDER = "spring.security.oauth2.client.provider.google.";

    @Bean
    GoogleAuthSettings googleAuthSettings(Environment environment) {
        return GoogleAuthSettings.load(environment);
    }

    @Bean
    Clock googleOAuthClock() {
        return Clock.systemUTC();
    }

    @Bean
    ClientRegistrationRepository googleRegistration(GoogleAuthSettings settings, Environment environment) {
        var registration = CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(GoogleAuthSettings.required(environment, "GOOGLE_CLIENT_ID"))
                .clientSecret(GoogleAuthSettings.required(environment, "GOOGLE_CLIENT_SECRET"))
                .redirectUri(settings.callback().toString())
                .issuerUri(environment.getProperty(PROVIDER + "issuer-uri", "https://accounts.google.com"))
                .userNameAttributeName(IdTokenClaimNames.SUB);
        // Supply a local issuer and endpoint overrides in the isolated acceptance environment.
        registration.authorizationUri(environment.getProperty(PROVIDER + "authorization-uri",
                        "https://accounts.google.com/o/oauth2/v2/auth"))
                .tokenUri(environment.getProperty(PROVIDER + "token-uri", "https://oauth2.googleapis.com/token"))
                .jwkSetUri(environment.getProperty(PROVIDER + "jwk-set-uri", "https://www.googleapis.com/oauth2/v3/certs"));
        return new InMemoryClientRegistrationRepository(registration.build());
    }

    @Bean
    ServletContextInitializer secureOAuthSessionCookie(GoogleAuthSettings settings) {
        return context -> {
            SessionCookieConfig cookie = context.getSessionCookieConfig();
            cookie.setSecure("https".equals(settings.origin().getScheme()));
        };
    }

    @Bean
    @Order(1)
    SecurityFilterChain googleFlow(HttpSecurity http, ClientRegistrationRepository registrations, GoogleOAuthFlow flow)
            throws Exception {
        var resolver = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
        resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
        var oidcUsers = new OidcUserService();
        oidcUsers.setRetrieveUserInfo(request -> false);
        return http
                .securityMatcher(request -> "GET".equals(request.getMethod())
                        && (GoogleOAuthFlow.AUTHORIZATION.equals(request.getServletPath())
                        || GoogleOAuthFlow.CALLBACK.equals(request.getServletPath())))
                .csrf(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
                .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
                .headers(headers -> headers.addHeaderWriter(new StaticHeadersWriter("Referrer-Policy", "no-referrer")))
                .oauth2Login(login -> login
                        .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(resolver)
                                .authorizationRequestRepository(flow.authorizationRequests(
                                        new HttpSessionOAuth2AuthorizationRequestRepository())))
                        .redirectionEndpoint(endpoint -> endpoint.baseUri(GoogleOAuthFlow.CALLBACK))
                        .userInfoEndpoint(endpoint -> endpoint.oidcUserService(oidcUsers))
                        .authorizedClientRepository(flow.discardProviderTokens())
                        .successHandler(flow::success)
                        .failureHandler(flow::failure))
                .build();
    }
}
