package br.com.innkercode.auth;

import br.com.innkercode.auth.domain.model.UserRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class ProvisionPilotUserTest {

    @Test
    void acceptsExplicitTestAdministratorInHomolog() {
        var account = ProvisionPilotUser.validateArgs("prod, homolog", new String[] {
                "ADMIN", "Admin@Example.Test", "  Admin H1  "
        });
        assertThat(account.role()).isEqualTo(UserRole.ADMIN);
        assertThat(account.email()).isEqualTo("admin@example.test");
        assertThat(account.name()).isEqualTo("Admin H1");
    }

    @Test
    void refusesOtherProfilesUnsupportedRolesAndPasswordArguments() {
        String[] args = {"ADMIN", "admin@example.test", "Admin H1"};
        assertThatThrownBy(() -> ProvisionPilotUser.validateArgs("prod,homolog-preview", args))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> ProvisionPilotUser.validateArgs(null, args))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> ProvisionPilotUser.validateArgs("homolog",
                new String[] {"TEAM_MEMBER", "team@example.test", "Equipe"})).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ProvisionPilotUser.validateArgs("homolog",
                new String[] {"ADMIN", "admin@example.org", "Admin H1"})).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ProvisionPilotUser.validateArgs("homolog",
                new String[] {"ADMIN", "admin@example.test", "Admin H1", "senha-proibida"}))
                .isInstanceOf(IllegalArgumentException.class).hasMessageNotContaining("senha-proibida");
    }
}
