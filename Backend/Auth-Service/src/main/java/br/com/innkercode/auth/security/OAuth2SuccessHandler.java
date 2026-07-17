package br.com.innkercode.auth.security;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.exception.UserNotFoundException;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.service.OAuth2TokenExchangeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final UserRepository userRepository;
    private final OAuth2TokenExchangeService tokenExchangeService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        // 1. Obter o usuário autenticado pelo Google
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        // 2. Buscar no banco
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Usuário com email " + email + " não encontrado"));

        // 3. Gerar o JWT EasyPet
        String jwt = jwtService.generateToken(user);

        // 4. Gerar código efêmero de troca (one-time, TTL 2 min)
        //    O JWT NÃO vai na URL — apenas o código curto vai
        String exchangeCode = tokenExchangeService.createExchangeCode(jwt);

        // 5. Redirecionar com o código (não o JWT) para o frontend
        String frontendUrl = System.getenv().getOrDefault("FRONTEND_URL", "http://localhost:5173");
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login-success")
                .queryParam("code", exchangeCode)
                .build().toUriString();

        log.info("Login social bem-sucedido para o usuário {}. Redirecionando com código de troca.", email);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
