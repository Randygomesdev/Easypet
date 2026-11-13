package br.com.innkercode.auth.security;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.service.AccountCredentials;
import br.com.innkercode.auth.service.OAuth2TokenExchangeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final AccountCredentials credentials;
    private final OAuth2TokenExchangeService tokenExchangeService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        // 1. Obter o usuário autenticado pelo Google
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        // 2. Buscar no banco
        User user = email != null && Boolean.TRUE.equals(oAuth2User.getAttribute("email_verified"))
                ? credentials.findByEmail(email).orElse(null) : null;
        if (user == null || !user.isEnabled() || user.getRole() == UserRole.TEAM_MEMBER) {
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?error=oauth");
            return;
        }

        // 3. Gerar o JWT EasyPet
        String jwt = jwtService.generateToken(user);

        // 4. Gerar código efêmero de troca (one-time, TTL 2 min)
        //    O JWT NÃO vai na URL — apenas o código curto vai
        String exchangeCode = tokenExchangeService.createExchangeCode(jwt);

        // 5. Redirecionar com o código (não o JWT) para o frontend
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login-success")
                .queryParam("code", exchangeCode)
                .build().toUriString();

        log.info("Login social concluído.");
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
