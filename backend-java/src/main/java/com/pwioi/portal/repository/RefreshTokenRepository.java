package com.pwioi.portal.repository;

import com.pwioi.portal.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String>, JpaSpecificationExecutor<RefreshToken> {
    java.util.Optional<RefreshToken> findByToken(String token);
    boolean existsByToken(String token);
    java.util.List<RefreshToken> findByUserId(String userId);
    void deleteByUserId(String userId);
}
