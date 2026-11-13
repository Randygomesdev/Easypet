package br.com.easypet.payment.config;

import br.com.easypet.payment.security.SessionAuthenticationFilter;
import br.com.easypet.payment.security.VerifiedSession;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final SessionAuthenticationFilter sessionFilter;

    @Bean
    FilterRegistrationBean<SessionAuthenticationFilter> sessionFilterRegistration() {
        var registration = new FilterRegistrationBean<>(sessionFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/payments/cashier/days", "/payments/cashier/days/**", "/payments/cashier/receipts/**")
                    .access(cashierPermission("CASH_CLOSE"))
                .requestMatchers("/payments/cashier", "/payments/cashier/**")
                    .access(cashierPermission("CASH_RECEIVE"))
                .requestMatchers(HttpMethod.POST, "/payments/credits/add", "/payments/credits/packages/restore",
                        "/payments/webhook/**").denyAll()
                .anyRequest().hasAnyRole("PARTNER", "ADMIN", "CUSTOMER", "USER")
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(sessionFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":401,\"message\":\"Token de autenticação ausente ou inválido.\"}");
                })
                .accessDeniedHandler((request, response, denied) -> {
                    // sendError would start a new servlet error dispatch without the JWT authentication.
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":403,\"message\":\"Você não tem permissão para acessar este recurso.\"}");
                })
            );

        return http.build();
    }

    private static AuthorizationManager<RequestAuthorizationContext> cashierPermission(String permission) {
        return (authentication, context) -> new AuthorizationDecision(
                authentication.get().getPrincipal() instanceof VerifiedSession session && session.canUseCashier(permission));
    }
}
