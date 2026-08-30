package com.pwioi.portal.repository;

import com.pwioi.portal.entity.OTP;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OTPRepository extends JpaRepository<OTP, String>, JpaSpecificationExecutor<OTP> {
    Optional<OTP> findFirstByEmailAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String email, String purpose, Instant now);

    Optional<OTP> findFirstByEmailAndPurposeAndIsUsedTrueAndExpiresAtAfterOrderByCreatedAtDesc(
            String email, String purpose, Instant now);

    List<OTP> findByEmailAndPurpose(String email, String purpose);
}
