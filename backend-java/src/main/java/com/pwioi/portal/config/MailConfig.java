package com.pwioi.portal.config;

import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
public class MailConfig {
    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Bean
    @Primary
    public JavaMailSender javaMailSender(Environment env) {
        String host = first(env, "spring.mail.host", "SMTP_HOST", "EMAIL_HOST");
        String user = first(env, "spring.mail.username", "SMTP_USER", "EMAIL_USER");
        String pass = first(env, "spring.mail.password", "SMTP_PASS", "EMAIL_PASS");
        int port = parsePort(first(env, "spring.mail.port", "SMTP_PORT", "EMAIL_PORT"), 587);

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host == null || host.isBlank() ? "smtp.gmail.com" : host);
        sender.setPort(port);
        sender.setUsername(user);
        sender.setPassword(pass);
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        boolean secure = port == 465;
        props.put("mail.smtp.starttls.enable", String.valueOf(!secure));
        props.put("mail.smtp.starttls.required", String.valueOf(!secure));
        props.put("mail.smtp.ssl.enable", String.valueOf(secure));
        props.put("mail.smtp.ssl.trust", sender.getHost());
        props.put("mail.smtp.connectiontimeout", "15000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        props.put("mail.smtp.ssl.protocols", "TLSv1.2");

        log.info("Mail sender configured host={} port={} user={}",
                sender.getHost(), sender.getPort(),
                user == null || user.isBlank() ? "(missing)" : user);
        return sender;
    }

    private static String first(Environment env, String... keys) {
        for (String key : keys) {
            String v = env.getProperty(key);
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return "";
    }

    private static int parsePort(String raw, int fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
