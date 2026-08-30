package com.pwioi.portal.security;

import com.pwioi.portal.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthFilter jwtAuthFilter;
    private final AppProperties props;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, AppProperties props) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.props = props;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/", "/health", "/actuator/health", "/actuator/health/**",
                                "/api-docs/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                        .requestMatchers("/auth/google/**", "/api/calendar/oauth/callback").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/refresh",
                                "/api/auth/reset-password", "/api/auth/send-otp", "/api/auth/verify-otp",
                                "/api/auth/verify-reset-otp", "/api/auth/update-password",
                                "/api/auth/google-login/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/**", "/api/academic/schools",
                                "/api/academic/centers", "/api/academic/batches",
                                "/api/cms/public/**", "/api/success-stories/public/**").permitAll()
                        .requestMatchers("/api/contact/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/endorsements/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/endorsements/submit/**").permitAll()
                        .requestMatchers("/api/assessments/invite/**").permitAll()
                        .requestMatchers("/api/interview/**").permitAll()
                        .requestMatchers("/api/recruiter/screening/**").permitAll()
                        .requestMatchers("/api/resume/view").permitAll()
                        .requestMatchers("/socket.io/**").permitAll()
                        .requestMatchers("/api/super-admin/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(401);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"error\":\"No token provided\"}");
                        })
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"You do not have permission to access this resource\"}");
                        })
                );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    /** Disable Boot's auto-generated in-memory user (and its logged password). All auth is JWT-based. */
    @Bean
    public org.springframework.security.core.userdetails.UserDetailsService userDetailsService() {
        return username -> {
            throw new org.springframework.security.core.userdetails.UsernameNotFoundException("No local users");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowCredentials(true);
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        List<String> origins = new ArrayList<>();
        origins.add("http://localhost:*");
        origins.add("https://localhost:*");
        origins.add("http://127.0.0.1:*");
        origins.add("https://127.0.0.1:*");
        if (props.getFrontendUrl() != null && !props.getFrontendUrl().isBlank()) {
            origins.add(props.getFrontendUrl());
        }
        if (props.getCorsOrigin() != null && !props.getCorsOrigin().isBlank()) {
            origins.addAll(Arrays.asList(props.getCorsOrigin().split(",")));
        }
        cfg.setAllowedOriginPatterns(origins.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().toList());
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    public static String clientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) {
            return fwd.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
