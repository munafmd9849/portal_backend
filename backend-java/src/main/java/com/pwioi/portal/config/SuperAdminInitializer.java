package com.pwioi.portal.config;

import com.pwioi.portal.entity.Admin;
import com.pwioi.portal.entity.User;
import com.pwioi.portal.repository.AdminRepository;
import com.pwioi.portal.repository.UserRepository;
import com.pwioi.portal.security.Roles;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class SuperAdminInitializer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(SuperAdminInitializer.class);
    private final UserRepository users;
    private final AdminRepository admins;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    private final org.springframework.core.env.Environment env;

    public SuperAdminInitializer(UserRepository users, AdminRepository admins,
                                 PasswordEncoder encoder, AppProperties props,
                                 org.springframework.core.env.Environment env) {
        this.users = users;
        this.admins = admins;
        this.encoder = encoder;
        this.props = props;
        this.env = env;
    }

    @Override
    public void run(String... args) {
        try {
            seed();
        } catch (Exception e) {
            log.warn("Super-admin seed skipped: {}", e.getMessage());
        }
    }

    private void seed() {
        String email = props.getSuperAdminEmail();
        if (email == null || email.isBlank()) {
            return;
        }
        var existing = users.findByEmail(email.toLowerCase());
        if (existing.isPresent()) {
            ensureAdminRow(existing.get());
            return;
        }
        String password = env.getProperty("SUPER_ADMIN_PASSWORD", "ChangeMeSuperAdmin!");
        User u = new User();
        u.setEmail(email.toLowerCase());
        u.setPasswordHash(encoder.encode(password));
        u.setRole(Roles.SUPER_ADMIN);
        u.setStatus("ACTIVE");
        u.setEmailVerified(true);
        u.setRecruiterVerified(false);
        u.setGoogleCalendarConnected(false);
        u.setSessionVersion(0);
        u.setDisplayName("Super Admin");
        u = users.save(u);
        ensureAdminRow(u);
        log.info("Created SUPER_ADMIN account for {}", email);
    }

    private void ensureAdminRow(User u) {
        if (admins.findByUserId(u.getId()).isPresent()) {
            return;
        }
        Admin a = new Admin();
        a.setUserId(u.getId());
        a.setName(u.getDisplayName() != null ? u.getDisplayName() : "Super Admin");
        a.setRole(u.getRole());
        admins.save(a);
        log.info("Created admin profile row for {}", u.getEmail());
    }
}
