package br.com.innkercode.auth.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.*;

class HomologAuthConfigurationTest {

    private final MockEnvironment environment = new MockEnvironment();
    private final HomologAuthConfiguration configuration = new HomologAuthConfiguration(environment);

    @Test
    void acceptsExplicitCollectorAndFixtureOriginAndRestrictsRecipients() {
        configureHomolog();
        configuration.validate();
        assertThat(configuration.canSendTo("TUTOR@EXAMPLE.TEST")).isTrue();
        assertThat(configuration.canSendTo("tutor@example.test.example.org")).isFalse();
        assertThat(configuration.canSendTo("tutor@example.org")).isFalse();
    }

    @Test
    void refusesMissingTeamKeyOrPartnerUrlWhenS02IsEnabled() {
        environment.setActiveProfiles("homolog");
        environment.setProperty("app.s02-enabled", "true");
        assertThatThrownBy(configuration::validate).hasMessageContaining("AUTH_TEAM_JWT_SECRET");
        environment.setProperty("AUTH_TEAM_JWT_SECRET", "fixture-team-key-distinct-for-homolog");
        assertThatThrownBy(configuration::validate).hasMessageContaining("PARTNER_SERVICE_URL");
    }

    @Test
    void refusesFallbackSmtpAndNonLoopbackHttpOrigin() {
        configureHomolog();
        environment.setProperty("MAIL_HOST", "");
        assertThatThrownBy(configuration::validate).hasMessageContaining("MAIL_HOST");
        environment.setProperty("MAIL_HOST", "smtp.example.org");
        assertThatThrownBy(configuration::validate).hasMessageContaining("MAIL_HOST");
        environment.setProperty("MAIL_HOST", "smtp-capture");
        environment.setProperty("FRONTEND_URL", "http://homolog.example.test");
        assertThatThrownBy(configuration::validate).hasMessageContaining("FRONTEND_URL");
        environment.setProperty("FRONTEND_URL", "https://homolog.example.test");
        configuration.validate();
    }

    @Test
    void refusesReusedInternalSecretWithoutDisplayingIt() {
        configureHomolog();
        environment.setProperty("JWT_SECRET", "fixture-shared-key-distinct-for-homolog");
        environment.setProperty("NOTIFICATION_RECIPIENT_TOKEN", "fixture-shared-key-distinct-for-homolog");
        assertThatThrownBy(configuration::validate).hasMessageContaining("NOTIFICATION_RECIPIENT_TOKEN")
                .hasMessageNotContaining("fixture-shared-key-distinct-for-homolog");
    }

    @Test
    void featuresDisabledDoNotRequireSmtpOrTeamSettings() {
        environment.setActiveProfiles("homolog");
        configuration.validate();
    }

    private void configureHomolog() {
        environment.setActiveProfiles("prod", "homolog");
        environment.withProperty("app.s02-enabled", "true")
                .withProperty("app.mail.enabled", "true")
                .withProperty("AUTH_TEAM_JWT_SECRET", "fixture-team-key-distinct-for-homolog")
                .withProperty("PARTNER_SERVICE_URL", "http://partner-service:8083/api/v1")
                .withProperty("FRONTEND_URL", "http://127.0.0.1:18080")
                .withProperty("MAIL_HOST", "smtp-capture")
                .withProperty("MAIL_PORT", "1025")
                .withProperty("MAIL_FROM", "auth@example.test")
                .withProperty("spring.mail.properties.mail.smtp.auth", "false");
    }
}
