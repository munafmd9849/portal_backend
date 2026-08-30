package com.pwioi.portal.repository;

import com.pwioi.portal.entity.EmailNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EmailNotificationRepository extends JpaRepository<EmailNotification, String>, JpaSpecificationExecutor<EmailNotification> {
    java.util.List<EmailNotification> findByJobId(String jobId);
    java.util.List<EmailNotification> findByUserId(String userId);
}
