package com.pwioi.portal.repository;

import com.pwioi.portal.entity.GoogleCalendarToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface GoogleCalendarTokenRepository extends JpaRepository<GoogleCalendarToken, String>, JpaSpecificationExecutor<GoogleCalendarToken> {
    java.util.Optional<GoogleCalendarToken> findByUserId(String userId);
    boolean existsByUserId(String userId);
}
