package com.pwioi.portal.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * In-memory rate limiter for sensitive auth endpoints (login, OTP, password reset).
 * Mirrors the Node backend's express-rate-limit protection.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final int MAX_ATTEMPTS = 30;
    private static final long WINDOW_MS = 15 * 60 * 1000L;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String p = request.getRequestURI();
        return !(p.equals("/api/auth/login")
                || p.equals("/api/auth/register")
                || p.equals("/api/auth/send-otp")
                || p.equals("/api/auth/verify-otp")
                || p.equals("/api/auth/reset-password")
                || p.equals("/api/auth/update-password"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank()
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
        String key = ip + "|" + request.getRequestURI();
        long now = System.currentTimeMillis();
        Window w = windows.compute(key, (k, cur) ->
                (cur == null || now - cur.start > WINDOW_MS) ? new Window(now) : cur);
        if (w.count.incrementAndGet() > MAX_ATTEMPTS) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many attempts, please try again later\"}");
            return;
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> now - e.getValue().start > WINDOW_MS);
        }
        chain.doFilter(request, response);
    }

    private static final class Window {
        final long start;
        final AtomicInteger count = new AtomicInteger();

        Window(long start) {
            this.start = start;
        }
    }
}
