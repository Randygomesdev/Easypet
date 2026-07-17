package br.com.innkercode.auth.security;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 1. Carrega o usuário padrão do Google
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // 2. Extrai os dados (O Google usa chaves específicas como 'email', 'name', 'picture')
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        // 3. Verifica se esse email já existe no nosso banco de dados
        Optional<User> userOptional = userRepository.findByEmail(email);

        if(userOptional.isPresent()) {
            // 4. Se usuário já existe, atualiza nome e foto (caso ele tenha mudado no Google)
            User user = userOptional.get();
            user.setName(name);
            user.setPictureUrl(picture);
            userRepository.save(user);
            log.info("Usuário existente logado via Google: {}", email);
        } else {
            // 5. Se o usuário NÃO existe, cria um novo registro.
            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .pictureUrl(picture)
                    .role(UserRole.CUSTOMER)
                    .active(true)
                    .build();

            userRepository.save(newUser);
            log.info("Novo usuário registrado via Google: {}", email);
        }

        //6. Retorna o usuário para o Spring Security saber que deu tudo certo
        return oAuth2User;
    }

}
