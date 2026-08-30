package com.pwioi.portal.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class EmailTemplateLoader {
    private static final Logger log = LoggerFactory.getLogger(EmailTemplateLoader.class);
    private static final Pattern IF_BLOCK = Pattern.compile("\\{\\{#if\\s+(\\w+)\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}");
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public String render(String templateName, Map<String, ?> data) {
        String html = load(templateName);
        Map<String, ?> vars = data == null ? Map.of() : data;
        html = processConditionals(html, vars);
        for (Map.Entry<String, ?> e : vars.entrySet()) {
            String value = e.getValue() == null ? "" : String.valueOf(e.getValue());
            html = html.replace("{{" + e.getKey() + "}}", value);
        }
        return html;
    }

    private String load(String templateName) {
        return cache.computeIfAbsent(templateName, this::read);
    }

    private String read(String templateName) {
        String classpath = "email-templates/" + templateName + ".html";
        try {
            ClassPathResource resource = new ClassPathResource(classpath);
            if (resource.exists()) {
                return resource.getContentAsString(StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            log.warn("Could not read classpath template {}: {}", classpath, e.getMessage());
        }
        Path cwd = Path.of(System.getProperty("user.dir", ".")).toAbsolutePath().normalize();
        for (Path candidate : new Path[] {
                cwd.resolve("../backend/email-templates/color-email-templates/" + templateName + ".html"),
                cwd.resolve("backend/email-templates/color-email-templates/" + templateName + ".html"),
                cwd.getParent() == null ? null
                        : cwd.getParent().resolve("backend/email-templates/color-email-templates/" + templateName + ".html")
        }) {
            if (candidate == null) continue;
            Path normalized = candidate.normalize();
            if (Files.isRegularFile(normalized)) {
                try {
                    return Files.readString(normalized, StandardCharsets.UTF_8);
                } catch (IOException ignored) {
                    // try next
                }
            }
        }
        throw new IllegalStateException("Email template not found: " + templateName);
    }

    private static String processConditionals(String html, Map<String, ?> data) {
        Matcher matcher = IF_BLOCK.matcher(html);
        StringBuffer out = new StringBuffer();
        while (matcher.find()) {
            Object value = data.get(matcher.group(1));
            boolean keep = value != null && !String.valueOf(value).isBlank();
            matcher.appendReplacement(out, Matcher.quoteReplacement(keep ? matcher.group(2) : ""));
        }
        matcher.appendTail(out);
        return out.toString();
    }
}
