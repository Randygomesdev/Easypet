package br.com.innkercode.auth;

import br.com.innkercode.auth.domain.model.UserRole;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.Console;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Arrays;
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
        if (Arrays.stream(requiredEnv("SPRING_PROFILES_ACTIVE").split(","))
                .map(String::trim).noneMatch("homolog"::equals)) {
            throw new IllegalStateException("Comando disponível apenas no ambiente de homologação.");
        }
        if (args.length != 3 || (!args[0].equals("PARTNER") && !args[0].equals("CUSTOMER"))) {
            throw new IllegalArgumentException("Informe: PARTNER|CUSTOMER e-mail 'Nome de teste'.");
        }

        UserRole role = UserRole.valueOf(args[0]);
        String email = args[1].trim();
        String name = args[2].trim();
        if (email.length() > 255 || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")
                || name.isBlank() || name.length() > 255) {
            throw new IllegalArgumentException("Informe e-mail e nome válidos.");
        }

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

        UUID id = UUID.randomUUID();
        try (var connection = DriverManager.getConnection(
                requiredEnv("AUTH_DB_URL"), requiredEnv("AUTH_DB_USERNAME"), requiredEnv("AUTH_DB_PASSWORD"));
             var statement = connection.prepareStatement("""
                     INSERT INTO users (id, email, name, password, role)
                     VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT (email) DO NOTHING
                     """)) {
            statement.setObject(1, id);
            statement.setString(2, email);
            statement.setString(3, name);
            statement.setString(4, passwordHash);
            statement.setString(5, role.name());
            if (statement.executeUpdate() == 0) {
                throw new IllegalStateException("Já existe uma conta com este e-mail.");
            }
        }
        System.out.printf("Conta de teste criada. ID: %s (%s)%n", id, role);
    }

    private static String requiredEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Variável de ambiente ausente: " + name);
        }
        return value;
    }
}
