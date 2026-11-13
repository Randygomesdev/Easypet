package br.com.innkercode.auth.service;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.request.AuthenticationRequest;
import br.com.innkercode.auth.dto.request.RegisterRequest;
import br.com.innkercode.auth.dto.response.AuthenticationResponse;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final AccountCredentials credentials;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final TeamAccessService teamAccess;

    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        return createAccount(request, UserRole.CUSTOMER);
    }

    @Transactional
    public AuthenticationResponse registerPartner(RegisterRequest request) {
        return createAccount(request, UserRole.PARTNER);
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        User user = (User) authentication.getPrincipal();
        if (user.getRole() == UserRole.TEAM_MEMBER) {
            teamAccess.requireActiveAccess(user.getId());
        }
        return sessionFor(user);
    }

    private AuthenticationResponse createAccount(RegisterRequest request, UserRole role) {
        String email = AccountCredentials.normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.emailTaken();
        }
        User user = credentials.create(User.builder()
                .name(request.name().strip())
                .email(email)
                .password(credentials.encodePassword(request.password()))
                .role(role)
                .build());
        return sessionFor(user);
    }

    private AuthenticationResponse sessionFor(User user) {
        return new AuthenticationResponse(jwtService.generateToken(user), user.getId(), user.getName(),
                user.getEmail(), user.getRole().name(), user.getPictureUrl());
    }
}
