package com.pwioi.portal.security;

import com.pwioi.portal.entity.User;
import com.pwioi.portal.repository.AdminRepository;
import com.pwioi.portal.repository.RecruiterRepository;
import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.repository.UserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository users;
    private final StudentRepository students;
    private final RecruiterRepository recruiters;
    private final AdminRepository admins;

    public JwtAuthFilter(JwtService jwtService, UserRepository users, StudentRepository students,
                         RecruiterRepository recruiters, AdminRepository admins) {
        this.jwtService = jwtService;
        this.users = users;
        this.students = students;
        this.recruiters = recruiters;
        this.admins = admins;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }
        String token = header.substring(7);
        try {
            var claims = jwtService.parseAccess(token);
            String userId = claims.get("userId", String.class);
            if (userId == null) {
                writeUnauthorized(response, "Invalid token");
                return;
            }
            User user = users.findById(userId).orElse(null);
            if (user == null) {
                writeUnauthorized(response, "User not found");
                return;
            }
            if ("BLOCKED".equals(user.getStatus())) {
                writeJson(response, HttpStatus.FORBIDDEN, "{\"error\":\"Account is blocked\"}");
                return;
            }
            int tokenVersion = claims.get("sessionVersion") instanceof Number n ? n.intValue() : 0;
            int current = user.getSessionVersion() == null ? 0 : user.getSessionVersion();
            if (tokenVersion != current) {
                writeJson(response, HttpStatus.UNAUTHORIZED,
                        "{\"error\":\"Session expired\",\"code\":\"SESSION_SUPERSEDED\",\"message\":\"Your session has ended. Please log in again.\"}");
                return;
            }
            String studentId = students.findByUserId(user.getId()).map(s -> s.getId()).orElse(null);
            String recruiterId = recruiters.findByUserId(user.getId()).map(r -> r.getId()).orElse(null);
            String adminId = admins.findByUserId(user.getId()).map(a -> a.getId()).orElse(null);
            boolean profileCompleted = students.findByUserId(user.getId())
                    .map(s -> Boolean.TRUE.equals(s.getProfileCompleted()))
                    .orElse(true);
            PortalPrincipal principal = new PortalPrincipal(
                    user.getId(), user.getEmail(), user.getRole(), user.getStatus(),
                    current, studentId, recruiterId, adminId, profileCompleted);
            var auth = new UsernamePasswordAuthenticationToken(principal, token, principal.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
            chain.doFilter(request, response);
        } catch (ExpiredJwtException e) {
            writeUnauthorized(response, "Token expired");
        } catch (JwtException e) {
            writeUnauthorized(response, "Invalid token");
        }
    }

    private void writeUnauthorized(HttpServletResponse response, String error) throws IOException {
        writeJson(response, HttpStatus.UNAUTHORIZED, "{\"error\":\"" + error + "\"}");
    }

    private void writeJson(HttpServletResponse response, HttpStatus status, String body) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(body);
    }
}
