package com.pwioi.portal.service;

import com.pwioi.portal.entity.AuditLog;
import com.pwioi.portal.repository.AuditLogRepository;
import com.pwioi.portal.security.PortalPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final AuditLogRepository logs;

    public AuditService(AuditLogRepository logs) {
        this.logs = logs;
    }

    @Async
    public void log(PortalPrincipal actor, String actionType, String targetType, String targetId,
                    String details, HttpServletRequest req) {
        AuditLog row = new AuditLog();
        if (actor != null) {
            row.setActorId(actor.getId());
            row.setActorName(actor.getUsername());
            row.setActorRole(actor.getRole());
        }
        row.setActionType(actionType);
        row.setTargetType(targetType);
        row.setTargetId(targetId);
        row.setDetails(details);
        if (req != null) {
            row.setIpAddress(com.pwioi.portal.security.SecurityConfig.clientIp(req));
            row.setUserAgent(req.getHeader("User-Agent"));
        }
        logs.save(row);
    }
}
