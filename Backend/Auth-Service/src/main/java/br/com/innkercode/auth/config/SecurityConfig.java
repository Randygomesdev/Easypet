package br.com.innkercode.auth.config;

import br.com.innkercode.auth.security.CustomOAuth2UserService;
import br.com.innkercode.auth.security.CustomUserDetailsService;
import br.com.innkercode.auth.security.JwtAuthenticationFilter;
import br.com.innkercode.auth.security.OAuth2SuccessHandler;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oauth2SuccessHandler;
    private final JwtAuthenticationFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;
    private final Environment environment;

    // 1. Lista de rotas públicas (incluindo Swagger)
    private static final String[] WHITE_LIST_URL = {
            "/v3/api-docs/**",
            "/v3/api-docs.yaml",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/login/**",
            "/oauth2/**"
    };

    private static final String[] ACCOUNT_ACCESS_POST = {
            "/auth/forgot-password", "/auth/reset-password", "/auth/reset-password/validate",
            "/auth/team/invitations/accept"
    };

    @Value("${app.s02-enabled}")
    private boolean s02Enabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AuthenticationProvider authenticationProvider) throws Exception {
        boolean homolog = environment.acceptsProfiles(Profiles.of("homolog"));
        http
                .cors(AbstractHttpConfigurer::disable)
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
                            .requestMatchers(HttpMethod.GET, "/auth/session").authenticated()
                            .requestMatchers(HttpMethod.GET, "/internal/notification-recipients/{userId}",
                                    "/internal/reception-claim-customers/{userId}").permitAll()
                            .requestMatchers("/internal/**").denyAll();
                    if (!homolog || s02Enabled) {
                        auth.requestMatchers(HttpMethod.POST, ACCOUNT_ACCESS_POST).permitAll()
                                .requestMatchers(HttpMethod.POST, "/auth/team/invitations").hasRole("PARTNER")
                                .requestMatchers(HttpMethod.GET, "/auth/team/accesses").hasRole("PARTNER")
                                .requestMatchers(HttpMethod.DELETE, "/auth/team/accesses/{id}").hasRole("PARTNER")
                                .requestMatchers(HttpMethod.GET, "/admin/customers").hasRole("ADMIN")
                                .requestMatchers(HttpMethod.PATCH, "/admin/customers/{id}/active").hasRole("ADMIN");
                    }
                    if (homolog) {
                        auth.requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                                .anyRequest().denyAll();
                    } else {
                        auth.requestMatchers(HttpMethod.POST, "/auth/register", "/auth/register/partner",
                                        "/auth/oauth2/exchange").permitAll()
                                .requestMatchers(WHITE_LIST_URL).permitAll()
                                .anyRequest().authenticated();
                    }
                })
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
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

        if (!homolog) {
            http.oauth2Login(oauth2 -> oauth2
                    .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                    .successHandler(oauth2SuccessHandler)
            );
        }

        return http.build();
    }

    // 2. Configuração do Swagger para aceitar JWT
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info().title("Easypet Auth API").version("1.0"))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .name("bearerAuth")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }

    @Bean
    public AuthenticationProvider authenticationProvider(PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public static PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

