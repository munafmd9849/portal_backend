package com.pwioi.portal.websocket;

import com.corundumstudio.socketio.AuthorizationResult;
import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import com.pwioi.portal.config.AppProperties;
import com.pwioi.portal.security.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

@Component
public class SocketIOConfig {
    private static final Logger log = LoggerFactory.getLogger(SocketIOConfig.class);
    private SocketIOServer server;

    @Bean
    public SocketIOServer socketIOServer(
            AppProperties props,
            JwtService jwtService,
            @Value("${server.port:3000}") int httpPort
    ) {
        Configuration cfg = new Configuration();
        cfg.setHostname("0.0.0.0");
        int socketPort = props.getSocket().getPort();
        if (socketPort == httpPort) {
            socketPort = httpPort + 1;
            log.warn("Socket.IO port collided with HTTP {}; using {}", httpPort, socketPort);
        }
        cfg.setPort(socketPort);
        cfg.setOrigin("*");
        cfg.setAllowHeaders("*");
        // Netty 4.2 + netty-socketio 1.7: compression handler is not @Sharable and
        // crashes every handshake (Vite then sees "socket hang up").
        cfg.setHttpCompression(false);
        cfg.setWebsocketCompression(false);
        cfg.getSocketConfig().setReuseAddress(true);
        cfg.setAuthorizationListener(data -> AuthorizationResult.SUCCESSFUL_AUTHORIZATION);
        server = new SocketIOServer(cfg);
        server.addConnectListener(client -> {
            String token = client.getHandshakeData().getSingleUrlParam("token");
            if (token == null || token.isBlank()) {
                String header = client.getHandshakeData().getHttpHeaders().get("Authorization");
                if (header != null && header.startsWith("Bearer ")) {
                    token = header.substring(7);
                }
            }
            if (token != null && !token.isBlank()) {
                try {
                    Claims claims = jwtService.parseAccess(token);
                    String userId = claims.get("userId", String.class);
                    String role = claims.get("role", String.class);
                    client.joinRoom("user:" + userId);
                    if ("STUDENT".equals(role)) client.joinRoom("students");
                    else if ("RECRUITER".equals(role)) client.joinRoom("recruiters");
                    else client.joinRoom("admins");
                    client.set("userId", userId);
                    client.set("role", role);
                } catch (Exception ignored) {
                    // handshake without valid JWT is allowed for public sockets
                }
            }
        });
        server.addEventListener("subscribe:notifications", Object.class, (client, data, ack) -> {
            Object uid = client.get("userId");
            if (uid != null) client.joinRoom("notifications:" + uid);
        });
        server.addEventListener("subscribe:jobs", Object.class, (client, data, ack) -> client.joinRoom("jobs:updates"));
        server.addEventListener("subscribe:applications", Object.class, (client, data, ack) -> {
            Object uid = client.get("userId");
            if (uid != null) client.joinRoom("applications:" + uid);
        });
        server.addEventListener("subscribe:proctoring", String.class, (client, room, ack) -> {
            if ("ADMIN".equals(client.get("role")) || "SUPER_ADMIN".equals(client.get("role"))) {
                client.joinRoom("proctoring:" + room);
            }
        });
        server.addEventListener("unsubscribe:proctoring", String.class, (client, room, ack) ->
                client.leaveRoom("proctoring:" + room));
        server.addEventListener("proctoring:frame", java.util.Map.class, (client, data, ack) -> {
            Object sessionId = data.get("sessionId");
            if (sessionId != null) {
                server.getRoomOperations("proctoring:" + sessionId).sendEvent("proctoring:live-frame", data);
            }
        });
        server.addEventListener("mock-code:join", String.class, (client, slotId, ack) ->
                client.joinRoom("mock-code:" + slotId));
        server.addEventListener("mock-code:leave", String.class, (client, slotId, ack) ->
                client.leaveRoom("mock-code:" + slotId));
        server.addEventListener("mock-code:code-update", java.util.Map.class, (client, data, ack) -> {
            Object slotId = data.get("slotId");
            if (slotId != null) {
                server.getRoomOperations("mock-code:" + slotId).sendEvent("mock-code:code-update", data);
            }
        });
        server.start();
        log.info("Socket.IO listening on {}", socketPort);
        return server;
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.stop();
        }
    }
}
