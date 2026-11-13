package br.com.innkercode.auth.security;

import br.com.innkercode.auth.service.AccountCredentials;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final AccountCredentials credentials;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return credentials.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));
    }

}
