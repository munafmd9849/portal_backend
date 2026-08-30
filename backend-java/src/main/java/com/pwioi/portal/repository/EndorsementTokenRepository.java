package com.pwioi.portal.repository;

import com.pwioi.portal.entity.EndorsementToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EndorsementTokenRepository extends JpaRepository<EndorsementToken, String>, JpaSpecificationExecutor<EndorsementToken> {
    java.util.Optional<EndorsementToken> findByToken(String token);
    boolean existsByToken(String token);
    java.util.List<EndorsementToken> findByStudentId(String studentId);
}
