package com.pwioi.portal.service;

import com.pwioi.portal.entity.Notification;
import com.pwioi.portal.repository.NotificationRepository;
import com.pwioi.portal.repository.UserRepository;
import com.pwioi.portal.util.Jsons;
import com.pwioi.portal.websocket.PortalSocketService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final Jsons jsons;
    private final PortalSocketService sockets;
    private final EmailService email;
    private final UserRepository users;

    public NotificationService(NotificationRepository notifications, Jsons jsons, PortalSocketService sockets,
                               EmailService email, UserRepository users) {
        this.notifications = notifications;
        this.jsons = jsons;
        this.sockets = sockets;
        this.email = email;
        this.users = users;
    }

    @Transactional
    public Notification create(String userId, String title, String body, Map<String, Object> data) {
        return create(userId, title, body, data, false);
    }

    @Transactional
    public Notification create(String userId, String title, String body, Map<String, Object> data, boolean sendEmail) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setTitle(title);
        n.setBody(body);
        n.setData(jsons.toJson(data == null ? Map.of() : data));
        n.setIsRead(false);
        Notification saved = notifications.save(n);
        sockets.emitToUser(userId, "notification:new", jsons.toMap(saved));
        if (sendEmail) {
            users.findById(userId).ifPresent(user ->
                    email.sendGenericNotification(user.getEmail(), title, title,
                            user.getDisplayName() == null ? user.getEmail() : user.getDisplayName(), body));
        }
        return saved;
    }

    public List<Notification> listFor(String userId) {
        return notifications.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public Notification markRead(String userId, String id) {
        Notification n = notifications.findById(id).orElseThrow();
        if (!userId.equals(n.getUserId())) {
            throw new com.pwioi.portal.exception.ApiException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Forbidden");
        }
        n.setIsRead(true);
        n.setReadAt(java.time.Instant.now());
        return notifications.save(n);
    }

    @Transactional
    public void markAllRead(String userId) {
        for (Notification n : notifications.findByUserId(userId)) {
            if (!Boolean.TRUE.equals(n.getIsRead())) {
                n.setIsRead(true);
                n.setReadAt(java.time.Instant.now());
                notifications.save(n);
            }
        }
    }

    @Transactional
    public void delete(String userId, String id) {
        Notification n = notifications.findById(id).orElseThrow();
        if (!userId.equals(n.getUserId())) {
            throw new com.pwioi.portal.exception.ApiException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Forbidden");
        }
        notifications.delete(n);
    }

    public Map<String, Object> payload(Notification n) {
        Map<String, Object> m = new LinkedHashMap<>(jsons.toMap(n));
        m.put("data", jsons.fromJson(n.getData(), Map.class));
        return m;
    }
}
