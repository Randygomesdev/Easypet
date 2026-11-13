package br.com.innkercode.auth.security;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.service.AccountCredentials;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final AccountCredentials credentials;
    private final UserRepository users;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        if (email == null || !Boolean.TRUE.equals(oAuth2User.getAttribute("email_verified"))) {
            throw new OAuth2AuthenticationException("invalid_email");
        }
        Optional<User> userOptional = credentials.findByEmail(email);

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (!user.isEnabled() || user.getRole() == UserRole.TEAM_MEMBER) {
                throw new OAuth2AuthenticationException("account_unavailable");
            }
            users.updateSocialProfile(user.getId(), name == null ? user.getName() : name, picture);
        } else {
            if (users.existsByEmailIgnoreCase(email)) {
                throw new OAuth2AuthenticationException("account_unavailable");
            }
            User newUser = User.builder()
                    .email(AccountCredentials.normalizeEmail(email))
                    .name(name == null ? email : name)
                    .pictureUrl(picture)
                    .role(UserRole.CUSTOMER)
                    .active(true)
                    .build();

            credentials.create(newUser);
        }

        return oAuth2User;
    }

}
