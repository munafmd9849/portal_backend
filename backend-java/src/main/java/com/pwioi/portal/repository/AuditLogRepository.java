package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, String>, JpaSpecificationExecutor<AuditLog> {
    java.util.List<AuditLog> findTop10ByActorIdOrderByTimestampDesc(String actorId);
}
