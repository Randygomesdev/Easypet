package br.com.easypet.partner.config;

import br.com.easypet.partner.security.AuthSessionFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final AuthSessionFilter authSessionFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/admin/partners", "/admin/partners/**").hasRole("ADMIN")
                .requestMatchers("/admin/reception-customers", "/admin/reception-customers/**").hasRole("ADMIN")
                .requestMatchers("/partners/me/customers", "/partners/me/customers/**",
                        "/internal/partners/me/customers", "/internal/partners/me/customers/**",
                        "/partners/me/desk").hasAnyAuthority("ROLE_PARTNER", "DESK_CUSTOMERS_MANAGE")
                .requestMatchers("/partners/me/staff/**").hasRole("PARTNER")
                .requestMatchers("/internal/partners/me/staff-assignment")
                        .hasAnyAuthority("BOOKINGS_ASSIGNED_READ", "BOOKINGS_ASSIGNED_ATTEND")
                .requestMatchers(HttpMethod.GET, "/internal/partners/customer-claims/*/owner").permitAll()
                .requestMatchers("/partners/customer-claims/**", "/internal/partners/customer-claims/**")
                        .hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.GET, "/partners/me").hasRole("PARTNER")
                .requestMatchers(HttpMethod.HEAD, "/partners/me").hasRole("PARTNER")
                .requestMatchers("/partners/catalog", "/partners/catalog/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/partners").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/partners").hasRole("PARTNER")
                .requestMatchers(HttpMethod.HEAD, "/partners").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/partners/*").hasAnyRole("ADMIN", "PARTNER")
                .requestMatchers(HttpMethod.HEAD, "/partners/*").hasAnyRole("ADMIN", "PARTNER")
                .requestMatchers(HttpMethod.GET, "/partners/*/reviews").permitAll()
                .requestMatchers(HttpMethod.HEAD, "/partners/*/reviews").permitAll()
                .requestMatchers(HttpMethod.POST, "/partners/*/reviews").authenticated()
                .requestMatchers(HttpMethod.POST, "/partners/me/**").hasAnyRole("PARTNER")
                .requestMatchers(HttpMethod.PUT, "/partners/me/**").hasAnyRole("PARTNER")
                .requestMatchers("/partners/**").hasAnyRole("ADMIN", "MASTER", "PARTNER")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(authSessionFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":401,\"message\":\"Token de autenticação ausente ou inválido.\"}");
                })
                .accessDeniedHandler((request, response, denied) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":403,\"message\":\"Acesso negado.\"}");
                })
            );

        return http.build();
    }
}
