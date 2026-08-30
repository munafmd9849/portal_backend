package com.pwioi.portal.service;

import com.pwioi.portal.config.AppProperties;
import com.pwioi.portal.entity.Admin;
import com.pwioi.portal.entity.OTP;
import com.pwioi.portal.entity.Recruiter;
import com.pwioi.portal.entity.RefreshToken;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.entity.User;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.exception.EmailSendException;
import com.pwioi.portal.repository.AdminRepository;
import com.pwioi.portal.repository.OTPRepository;
import com.pwioi.portal.repository.RecruiterRepository;
import com.pwioi.portal.repository.RefreshTokenRepository;
import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.repository.UserRepository;
import com.pwioi.portal.security.JwtService;
import com.pwioi.portal.security.PortalPrincipal;
import com.pwioi.portal.security.Roles;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final SecureRandom RNG = new SecureRandom();
    private final UserRepository users;
    private final StudentRepository students;
    private final RecruiterRepository recruiters;
    private final AdminRepository admins;
    private final RefreshTokenRepository refreshTokens;
    private final OTPRepository otps;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmailService email;
    private final AppProperties props;
    private final NotificationService notifications;
    private final AuditService audit;

    public AuthService(UserRepository users, StudentRepository students, RecruiterRepository recruiters,
                       AdminRepository admins, RefreshTokenRepository refreshTokens, OTPRepository otps,
                       PasswordEncoder encoder, JwtService jwt, EmailService email, AppProperties props,
                       NotificationService notifications, AuditService audit) {
        this.users = users;
        this.students = students;
        this.recruiters = recruiters;
        this.admins = admins;
        this.refreshTokens = refreshTokens;
        this.otps = otps;
        this.encoder = encoder;
        this.jwt = jwt;
        this.email = email;
        this.props = props;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional
    public Map<String, Object> register(Map<String, Object> body) {
        String emailAddr = str(body.get("email")).toLowerCase(Locale.ROOT).trim();
        String password = str(body.get("password"));
        String role = str(body.get("role")).toUpperCase(Locale.ROOT);
        if (emailAddr.isBlank() || password.length() < 6) {
            throw ApiException.badRequest("Invalid email or password");
        }
        if (!Roles.STUDENT.equals(role) && !Roles.RECRUITER.equals(role)) {
            throw ApiException.badRequest("Role must be STUDENT or RECRUITER");
        }
        if (users.existsByEmail(emailAddr)) {
            throw ApiException.badRequest("Email already registered");
        }
        boolean emailVerified = false;
        Instant emailVerifiedAt = null;
        String verificationToken = str(body.get("verificationToken"));
        if (!verificationToken.isBlank()) {
            try {
                Claims c = jwt.parseAccess(verificationToken);
                if (!emailAddr.equals(c.get("email", String.class)) || !"verification".equals(c.get("type", String.class))) {
                    throw ApiException.badRequest("Email verification failed");
                }
                Instant window = Instant.now().minus(10, ChronoUnit.MINUTES);
                var used = otps.findFirstByEmailAndPurposeAndIsUsedTrueAndExpiresAtAfterOrderByCreatedAtDesc(
                        emailAddr, "VERIFY_EMAIL", window);
                if (used.isEmpty()) {
                    throw ApiException.badRequest("Email verification required. Please verify OTP first.");
                }
                emailVerified = true;
                emailVerifiedAt = Instant.now();
            } catch (JwtException e) {
                throw ApiException.badRequest("Invalid verification token. Please verify OTP first.");
            }
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> profile = body.get("profile") instanceof Map<?, ?> p ? (Map<String, Object>) p : Map.of();

        User user = new User();
        user.setEmail(emailAddr);
        user.setPasswordHash(encoder.encode(password));
        user.setRole(role);
        user.setStatus(Roles.RECRUITER.equals(role) ? "PENDING" : "ACTIVE");
        user.setEmailVerified(emailVerified);
        user.setEmailVerifiedAt(emailVerifiedAt);
        user.setRecruiterVerified(false);
        user.setSessionVersion(0);
        user = users.save(user);

        if (Roles.STUDENT.equals(role)) {
            Student s = new Student();
            s.setUserId(user.getId());
            s.setFullName(str(profile.get("fullName")));
            s.setEmail(emailAddr);
            s.setPhone(str(profile.get("phone")));
            String enrollment = str(profile.get("enrollmentId"));
            s.setEnrollmentId(enrollment.isBlank() ? null : enrollment);
            s.setSchool(str(profile.get("school")));
            s.setCenter(str(profile.get("center")));
            s.setBatch(str(profile.get("batch")));
            s.setProfileCompleted(false);
            students.save(s);
        } else {
            Recruiter r = new Recruiter();
            r.setUserId(user.getId());
            r.setCompanyName(str(profile.get("companyName")));
            r.setLocation(str(profile.get("location")));
            recruiters.save(r);
        }

        return tokenResponse(user, false);
    }

    @Transactional
    public Map<String, Object> login(Map<String, Object> body) {
        String emailAddr = str(body.get("email")).toLowerCase(Locale.ROOT).trim();
        String password = str(body.get("password"));
        String role = str(body.containsKey("role") ? body.get("role") : body.get("selectedRole")).toUpperCase(Locale.ROOT);

        User user = users.findByEmail(emailAddr).orElseThrow(() -> ApiException.unauthorized("Invalid credentials"));
        if (!encoder.matches(password, user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid credentials");
        }
        if (!role.isBlank() && !user.getRole().equalsIgnoreCase(role) && !Roles.SUPER_ADMIN.equals(user.getRole())) {
            throw ApiException.forbidden("Invalid role for this account");
        }
        if ("BLOCKED".equals(user.getStatus())) {
            throw ApiException.forbidden("Account is blocked");
        }
        Instant now = Instant.now();
        if (Roles.STUDENT.equals(user.getRole()) && !Boolean.TRUE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            user.setEmailVerifiedAt(now);
        }
        user.setLastLoginAt(now);
        user = users.save(user);

        if (Roles.ADMIN.equals(user.getRole()) && "PENDING".equals(user.getStatus())) {
            for (User sa : users.findByRoleAndStatus(Roles.SUPER_ADMIN, "ACTIVE")) {
                notifications.create(sa.getId(),
                        "Admin requesting access: " + (user.getDisplayName() != null ? user.getDisplayName() : user.getEmail()),
                        user.getEmail() + " tried to log in. Admit or Reject in Notifications.",
                        Map.of("type", "admin_login", "adminUserId", user.getId(), "adminEmail", user.getEmail()));
            }
        }
        return tokenResponse(user, true);
    }

    @Transactional
    public Map<String, Object> refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw ApiException.unauthorized("No refresh token provided");
        }
        try {
            jwt.parseRefresh(refreshToken);
        } catch (JwtException e) {
            throw ApiException.unauthorized("Invalid refresh token");
        }
        RefreshToken stored = refreshTokens.findByToken(refreshToken)
                .orElseThrow(() -> ApiException.unauthorized("Invalid or expired refresh token"));
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unauthorized("Invalid or expired refresh token");
        }
        User user = users.findById(stored.getUserId()).orElseThrow(() -> ApiException.unauthorized("User not found"));
        String access = jwt.generateAccessToken(user.getId(), user.getRole(), user.getStatus(),
                user.getSessionVersion() == null ? 0 : user.getSessionVersion());
        return Map.of("accessToken", access);
    }

    @Transactional
    public void logout(String userId) {
        User user = users.findById(userId).orElseThrow();
        user.setSessionVersion((user.getSessionVersion() == null ? 0 : user.getSessionVersion()) + 1);
        users.save(user);
        refreshTokens.deleteByUserId(userId);
    }

    public Map<String, Object> me(PortalPrincipal principal) {
        User user = users.findById(principal.getId()).orElseThrow(() -> ApiException.notFound("User"));
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole());
        profile.put("status", user.getStatus());
        profile.put("emailVerified", user.getEmailVerified());
        profile.put("displayName", user.getDisplayName());
        profile.put("profilePhoto", user.getProfilePhoto());
        students.findByUserId(user.getId()).ifPresent(s -> profile.put("student", s));
        recruiters.findByUserId(user.getId()).ifPresent(r -> profile.put("recruiter", r));
        admins.findByUserId(user.getId()).ifPresent(a -> profile.put("admin", a));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", profile);
        out.put("profileCompleted", isProfileCompleted(user));
        return out;
    }

    @Transactional
    public Map<String, Object> updateProfile(String userId, Map<String, Object> body) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (body.containsKey("displayName")) user.setDisplayName(str(body.get("displayName")));
        if (body.containsKey("profilePhoto")) user.setProfilePhoto(str(body.get("profilePhoto")));
        users.save(user);
        return me(new PortalPrincipal(user.getId(), user.getEmail(), user.getRole(), user.getStatus(),
                user.getSessionVersion() == null ? 0 : user.getSessionVersion(),
                null, null, null, true));
    }

    @Transactional
    public Object updateCompanyDetails(String userId, Map<String, Object> body) {
        Recruiter r = recruiters.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Recruiter profile"));
        if (body.containsKey("companyName")) r.setCompanyName(str(body.get("companyName")));
        if (body.containsKey("location")) r.setLocation(str(body.get("location")));
        if (body.containsKey("relationshipType")) r.setRelationshipType(str(body.get("relationshipType")));
        if (body.containsKey("zone")) r.setZone(str(body.get("zone")));
        return recruiters.save(r);
    }

    @Transactional
    public Map<String, Object> sendOtp(String emailAddr, String purpose) {
        emailAddr = emailAddr.toLowerCase(Locale.ROOT).trim();
        purpose = purpose == null || purpose.isBlank() ? "VERIFY_EMAIL" : purpose;
        if ("VERIFY_EMAIL".equals(purpose) && users.existsByEmail(emailAddr)) {
            throw ApiException.badRequest("Email already registered");
        }
        String code = String.format("%06d", RNG.nextInt(1_000_000));
        OTP otp = new OTP();
        otp.setEmail(emailAddr);
        otp.setOtp(code);
        otp.setPurpose(purpose);
        otp.setIsUsed(false);
        otp.setExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        otps.save(otp);
        try {
            if ("RESET_PASSWORD".equals(purpose)) {
                email.sendPasswordResetOtp(emailAddr, code);
            } else {
                email.sendOtp(emailAddr, code);
            }
        } catch (EmailSendException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to send OTP email. Please try again.");
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "OTP sent");
        return res;
    }

    @Transactional
    public Map<String, Object> verifyOtp(String emailAddr, String code, String purpose) {
        emailAddr = emailAddr.toLowerCase(Locale.ROOT).trim();
        purpose = purpose == null || purpose.isBlank() ? "VERIFY_EMAIL" : purpose;
        OTP otp = otps.findFirstByEmailAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                emailAddr, purpose, Instant.now())
                .orElseThrow(() -> ApiException.badRequest("Invalid or expired OTP"));
        if (!code.equals(otp.getOtp())) {
            throw ApiException.badRequest("Invalid or expired OTP");
        }
        otp.setIsUsed(true);
        otps.save(otp);
        String token = jwt.generateVerificationToken(emailAddr);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("verificationToken", token);
        return res;
    }

    @Transactional
    public Map<String, Object> updatePassword(String emailAddr, String newPassword, String verificationToken) {
        try {
            Claims c = jwt.parseAccess(verificationToken);
            if (!emailAddr.equalsIgnoreCase(c.get("email", String.class))) {
                throw ApiException.badRequest("Invalid verification token");
            }
        } catch (JwtException e) {
            throw ApiException.badRequest("Invalid verification token");
        }
        User user = users.findByEmail(emailAddr.toLowerCase(Locale.ROOT).trim())
                .orElseThrow(() -> ApiException.notFound("User"));
        user.setPasswordHash(encoder.encode(newPassword));
        user.setSessionVersion((user.getSessionVersion() == null ? 0 : user.getSessionVersion()) + 1);
        users.save(user);
        refreshTokens.deleteByUserId(user.getId());
        return Map.of("success", true, "message", "Password updated");
    }

    private Map<String, Object> tokenResponse(User user, boolean includeProfile) {
        int version = user.getSessionVersion() == null ? 0 : user.getSessionVersion();
        String access = jwt.generateAccessToken(user.getId(), user.getRole(), user.getStatus(), version);
        String refresh = jwt.generateRefreshToken(user.getId());
        RefreshToken rt = new RefreshToken();
        rt.setUserId(user.getId());
        rt.setToken(refresh);
        rt.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        refreshTokens.save(rt);

        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", user.getId());
        u.put("email", user.getEmail());
        u.put("role", user.getRole());
        u.put("status", user.getStatus());
        if (includeProfile) {
            u.put("emailVerified", user.getEmailVerified());
            u.put("profileCompleted", isProfileCompleted(user));
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("user", u);
        res.put("accessToken", access);
        res.put("refreshToken", refresh);
        return res;
    }

    private boolean isProfileCompleted(User user) {
        if (!Roles.STUDENT.equals(user.getRole())) return true;
        return students.findByUserId(user.getId()).map(s -> {
            if (Boolean.TRUE.equals(s.getProfileCompleted())) return true;
            return notBlank(user.getEmail()) && notBlank(s.getFullName()) && notBlank(s.getPhone())
                    && notBlank(s.getEnrollmentId()) && notBlank(s.getSchool())
                    && notBlank(s.getCenter()) && notBlank(s.getBatch());
        }).orElse(false);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
