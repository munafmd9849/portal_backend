package com.pwioi.portal.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Parses a Node-style {@code .env} file (including unquoted values with {@code < >} and spaces)
 * and aliases {@code EMAIL_*} keys to {@code SMTP_*} so the existing backend env file works.
 */
public final class DotenvLoader {
    private static final Logger log = LoggerFactory.getLogger(DotenvLoader.class);

    private static final Map<String, String> ALIASES = Map.of(
            "EMAIL_HOST", "SMTP_HOST",
            "EMAIL_PORT", "SMTP_PORT",
            "EMAIL_USER", "SMTP_USER",
            "EMAIL_PASS", "SMTP_PASS",
            "EMAIL_FROM", "SMTP_FROM"
    );

    private DotenvLoader() {}

    public static Map<String, Object> load() {
        Path file = resolveEnvFile();
        if (file == null) {
            log.warn("No .env file found (looked for backend/.env and backend-java/.env)");
            return Map.of();
        }
        try {
            Map<String, Object> map = parse(Files.readAllLines(file));
            log.info("Loaded environment from {}", file.toAbsolutePath().normalize());
            return map;
        } catch (IOException e) {
            log.warn("Failed to read {}: {}", file, e.getMessage());
            return Map.of();
        }
    }

    public static void applyToSystemProperties() {
        Map<String, Object> map = load();
        for (Map.Entry<String, Object> e : map.entrySet()) {
            if (e.getKey() == null || e.getValue() == null) continue;
            String existing = System.getProperty(e.getKey());
            if (existing == null || existing.isBlank()) {
                System.setProperty(e.getKey(), String.valueOf(e.getValue()));
            }
        }
    }

    static Map<String, Object> parse(List<String> lines) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (String line : lines) {
            if (line == null) continue;
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                continue;
            }
            int eq = trimmed.indexOf('=');
            String key = trimmed.substring(0, eq).trim();
            String value = trimmed.substring(eq + 1).trim();
            if ((value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2)
                    || (value.startsWith("'") && value.endsWith("'") && value.length() >= 2)) {
                value = value.substring(1, value.length() - 1);
            }
            map.put(key, value);
        }
        ALIASES.forEach((from, to) -> {
            if (map.containsKey(from) && (!map.containsKey(to) || String.valueOf(map.get(to)).isBlank())) {
                map.put(to, map.get(from));
            }
        });
        return map;
    }

    private static Path resolveEnvFile() {
        List<Path> candidates = new ArrayList<>();
        Path cwd = Path.of(System.getProperty("user.dir", ".")).toAbsolutePath().normalize();
        Path parent = cwd.getParent();
        candidates.add(cwd.resolve("../backend/.env"));
        candidates.add(cwd.resolve("backend/.env"));
        if (parent != null) {
            candidates.add(parent.resolve("backend/.env"));
        }
        candidates.add(cwd.resolve(".env"));
        candidates.add(cwd.resolve("backend-java/.env"));
        if (parent != null) {
            candidates.add(parent.resolve(".env"));
        }
        for (Path candidate : candidates) {
            Path normalized = candidate.normalize();
            if (Files.isRegularFile(normalized)) {
                return normalized;
            }
        }
        return null;
    }
}
