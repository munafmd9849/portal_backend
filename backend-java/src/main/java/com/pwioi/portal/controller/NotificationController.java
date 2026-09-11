package com.pwioi.portal.controller;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.NotificationService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;
    public NotificationController(NotificationService notifications) { this.notifications = notifications; }
    @GetMapping public Object list() {
        return notifications.listFor(CurrentUser.require().getId()).stream().map(notifications::payload).toList();
    }
    @PatchMapping("/mark-all-read") public Map<String, Object> allRead() {
        notifications.markAllRead(CurrentUser.require().getId()); return Map.of("success", true);
    }
    @PatchMapping("/{notificationId}/read") public Object read(@PathVariable String notificationId) {
        return notifications.payload(notifications.markRead(CurrentUser.require().getId(), notificationId));
    }
    @DeleteMapping("/{notificationId}") public Map<String, Object> del(@PathVariable String notificationId) {
        notifications.delete(CurrentUser.require().getId(), notificationId); return Map.of("success", true);
    }
    @PostMapping public Object create(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER);
        boolean sendEmail = Boolean.TRUE.equals(body.get("sendEmail"));
        Map<String, Object> data = body.get("data") instanceof Map<?, ?> raw
                ? raw.entrySet().stream().collect(java.util.stream.Collectors.toMap(
                        e -> String.valueOf(e.getKey()), java.util.Map.Entry::getValue, (a, b) -> b))
                : Map.of();
        return notifications.create(String.valueOf(body.get("userId")), String.valueOf(body.get("title")),
                String.valueOf(body.get("body")), data, sendEmail);
    }
}
