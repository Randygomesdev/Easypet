package br.com.easypet.payment.cashier;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Component
@Order(-110)
class CashierRequestLogFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(CashierRequestLogFilter.class);
    private static final String BASE = "/payments/cashier";
    private static final String REQUEST_ID = "X-Request-Id";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = path(request);
        return !path.equals(BASE) && !path.startsWith(BASE + "/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String incomingId = request.getHeader(REQUEST_ID);
        String requestId = incomingId != null && SAFE_ID.matcher(incomingId).matches()
                ? incomingId : UUID.randomUUID().toString();
        response.setHeader(REQUEST_ID, requestId);
        long start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException ex) {
            record(request, requestId, 500, start);
            throw ex;
        }
        if ("POST".equals(request.getMethod()) || response.getStatus() >= 400) {
            record(request, requestId, response.getStatus(), start);
        }
    }

    private static void record(HttpServletRequest request, String requestId, int status, long start) {
        log.info("cashier_request requestId={} operation={} status={} durationMs={}",
                requestId, operation(request), status, TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start));
    }

    private static String operation(HttpServletRequest request) {
        String suffix = path(request).substring(BASE.length());
        if ("POST".equals(request.getMethod())) {
            if (suffix.equals("/charges")) return "charge";
            if (suffix.startsWith("/charges/") && suffix.endsWith("/receipts")) return "receive";
            if (suffix.startsWith("/receipts/") && suffix.endsWith("/reverse")) return "reverse";
            if (suffix.startsWith("/days/") && suffix.endsWith("/close")) return "close";
        }
        return switch (suffix) {
            case "/context" -> "context";
            case "/days" -> "day";
            default -> suffix.startsWith("/charges") ? "charges" : "other";
        };
    }

    private static String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }
}
