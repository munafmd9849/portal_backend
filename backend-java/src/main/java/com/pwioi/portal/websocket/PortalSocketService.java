package com.pwioi.portal.websocket;

import com.corundumstudio.socketio.SocketIOServer;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PortalSocketService {
    private static final Logger log = LoggerFactory.getLogger(PortalSocketService.class);
    private final SocketIOServer server;

    public PortalSocketService(SocketIOServer server) {
        this.server = server;
    }

    public void emitToUser(String userId, String event, Object payload) {
        try {
            server.getRoomOperations("user:" + userId).sendEvent(event, payload);
            server.getRoomOperations("notifications:" + userId).sendEvent(event, payload);
        } catch (Exception e) {
            log.debug("socket emit failed: {}", e.getMessage());
        }
    }

    public void emitToRole(String roleRoom, String event, Object payload) {
        try {
            server.getRoomOperations(roleRoom).sendEvent(event, payload);
        } catch (Exception e) {
            log.debug("socket emit failed: {}", e.getMessage());
        }
    }

    public void emit(String room, String event, Object payload) {
        try {
            server.getRoomOperations(room).sendEvent(event, payload);
        } catch (Exception e) {
            log.debug("socket emit failed: {}", e.getMessage());
        }
    }

    public void broadcast(String event, Map<String, Object> payload) {
        server.getBroadcastOperations().sendEvent(event, payload);
    }
}
