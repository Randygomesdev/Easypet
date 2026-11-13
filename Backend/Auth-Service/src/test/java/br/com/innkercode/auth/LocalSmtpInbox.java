package br.com.innkercode.auth;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

final class LocalSmtpInbox implements AutoCloseable {

    private final ServerSocket server;
    private final LinkedBlockingQueue<MimeMessage> messages = new LinkedBlockingQueue<>();

    LocalSmtpInbox() {
        try {
            server = new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"));
        } catch (IOException ex) {
            throw new IllegalStateException("Não foi possível iniciar SMTP descartável.", ex);
        }
        Thread.ofVirtual().name("s02-smtp").start(this::listen);
    }

    int port() {
        return server.getLocalPort();
    }

    MimeMessage take(long timeoutMillis) throws InterruptedException {
        return messages.poll(timeoutMillis, TimeUnit.MILLISECONDS);
    }

    void clear() {
        messages.clear();
    }

    private void listen() {
        while (!server.isClosed()) {
            try {
                Socket connection = server.accept();
                Thread.ofVirtual().start(() -> receive(connection));
            } catch (IOException ex) {
                if (!server.isClosed()) throw new IllegalStateException(ex);
            }
        }
    }

    private void receive(Socket connection) {
        try (connection;
             var input = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.US_ASCII));
             var output = new PrintWriter(connection.getOutputStream(), true, StandardCharsets.US_ASCII)) {
            reply(output, "220 local.test");
            for (String line; (line = input.readLine()) != null;) {
                if (line.equals("DATA")) {
                    reply(output, "354 End data with <CRLF>.<CRLF>");
                    StringBuilder content = new StringBuilder();
                    while ((line = input.readLine()) != null && !line.equals(".")) {
                        content.append(line.startsWith("..") ? line.substring(1) : line).append("\r\n");
                    }
                    var message = new MimeMessage((Session) null,
                            new ByteArrayInputStream(content.toString().getBytes(StandardCharsets.US_ASCII)));
                    messages.add(message);
                    reply(output, "250 Queued locally");
                } else if (line.equals("QUIT")) {
                    reply(output, "221 Goodbye");
                    return;
                } else {
                    reply(output, "250 OK");
                }
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Falha no coletor SMTP de teste.", ex);
        }
    }

    private static void reply(PrintWriter output, String response) {
        output.print(response + "\r\n");
        output.flush();
    }

    @Override
    public void close() throws IOException {
        server.close();
    }
}
