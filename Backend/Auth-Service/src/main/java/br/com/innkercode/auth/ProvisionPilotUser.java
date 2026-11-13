package br.com.innkercode.auth;

import br.com.innkercode.auth.config.HomologAuthConfiguration;
import br.com.innkercode.auth.domain.model.UserRole;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.Console;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Locale;
import java.util.UUID;

/** Console command for the operators of the internal pilot. */
public final class ProvisionPilotUser {
    private ProvisionPilotUser() {}

    public static void main(String[] args) {
        try {
            provision(args);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            System.err.println(ex.getMessage());
            System.exit(1);
        } catch (SQLException ex) {
            System.err.println("Falha ao gravar a conta de teste (SQLSTATE " + ex.getSQLState() + ").");
            System.exit(1);
        }
    }

    private static void provision(String[] args) throws SQLException {
        PilotAccount account = validateArgs(System.getenv("SPRING_PROFILES_ACTIVE"), args);
        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException("Execute em um terminal interativo para digitar a senha.");
        }
        char[] password = console.readPassword("Senha da conta de teste (mínimo de 12 caracteres): ");
        char[] confirmation = null;
        String passwordHash;
        try {
            if (password == null || password.length < 12
                    || StandardCharsets.UTF_8.encode(CharBuffer.wrap(password)).remaining() > 72) {
                throw new IllegalArgumentException("Use uma senha de pelo menos 12 caracteres e no máximo 72 bytes.");
            }
            confirmation = console.readPassword("Confirme a senha: ");
            if (!Arrays.equals(password, confirmation)) {
                throw new IllegalArgumentException("As senhas não coincidem.");
            }
            passwordHash = new BCryptPasswordEncoder().encode(CharBuffer.wrap(password));
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
        }

        try (var connection = DriverManager.getConnection(
                requiredEnv("AUTH_DB_URL"), requiredEnv("AUTH_DB_USERNAME"), requiredEnv("AUTH_DB_PASSWORD"))) {
            UUID id = insert(connection, account, passwordHash);
            System.out.printf("Conta de teste criada. ID: %s (%s)%n", id, account.role());
        }
    }

    static PilotAccount validateArgs(String profiles, String[] args) {
        if (profiles == null || Arrays.stream(profiles.split(",")).map(String::trim).noneMatch("homolog"::equals)) {
            throw new IllegalStateException("Comando disponível apenas no ambiente de homologação.");
        }
        if (args.length != 3) {
            throw usage();
        }
        UserRole role = switch (args[0]) {
            case "PARTNER" -> UserRole.PARTNER;
            case "CUSTOMER" -> UserRole.CUSTOMER;
            case "ADMIN" -> UserRole.ADMIN;
            default -> throw usage();
        };
        String email = args[1].trim().toLowerCase(Locale.ROOT);
        String name = args[2].trim();
        if (email.length() > 255 || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")
                || name.isBlank() || name.length() > 255) {
            throw new IllegalArgumentException("Informe e-mail e nome válidos.");
        }
        if (role == UserRole.ADMIN && !HomologAuthConfiguration.isFixtureAddress(email)) {
            throw new IllegalArgumentException("Use um e-mail fictício @example.test para o ADMIN de homologação.");
        }
        return new PilotAccount(role, email, name);
    }

    static UUID insert(Connection connection, PilotAccount account, String passwordHash) throws SQLException {
        UUID id = UUID.randomUUID();
        try (var statement = connection.prepareStatement("""
                     INSERT INTO users (id, email, name, password, role)
                     SELECT ?, ?, ?, ?, ?
                     WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = ?)
                     ON CONFLICT (email) DO NOTHING
                     """)) {
            statement.setObject(1, id);
            statement.setString(2, account.email());
            statement.setString(3, account.name());
            statement.setString(4, passwordHash);
            statement.setString(5, account.role().name());
            statement.setString(6, account.email());
            if (statement.executeUpdate() == 0) {
                throw new IllegalStateException("Já existe uma conta com este e-mail.");
            }
        }
        return id;
    }

    private static IllegalArgumentException usage() {
        return new IllegalArgumentException("Informe: PARTNER|CUSTOMER|ADMIN e-mail 'Nome de teste'.");
    }

    record PilotAccount(UserRole role, String email, String name) {}

    private static String requiredEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Variável de ambiente ausente: " + name);
        }
        return value;
    }
}
