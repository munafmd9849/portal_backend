package com.pwioi.portal.config;

import java.net.URI;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class DataSourceConfig {

    /**
     * Accepts Prisma-style {@code postgresql://user:pass@host:5432/db} or JDBC URLs.
     */
    @Bean
    @Primary
    @ConditionalOnProperty(name = "spring.datasource.url")
    public DataSource dataSource(
            @Value("${spring.datasource.url}") String rawUrl,
            @Value("${spring.datasource.username:}") String username,
            @Value("${spring.datasource.password:}") String password
    ) {
        String url = rawUrl;
        String user = username;
        String pass = password;
        if (rawUrl != null && (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://"))) {
            URI uri = URI.create(rawUrl.replaceFirst("^postgres(ql)?://", "http://"));
            String userInfo = uri.getUserInfo();
            if (userInfo != null && userInfo.contains(":")) {
                int idx = userInfo.indexOf(':');
                user = userInfo.substring(0, idx);
                pass = userInfo.substring(idx + 1);
            } else if (userInfo != null) {
                user = userInfo;
            }
            String path = uri.getPath() == null ? "/placement_portal" : uri.getPath();
            String query = uri.getQuery() == null ? "" : "?" + uri.getQuery();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            url = "jdbc:postgresql://" + uri.getHost() + ":" + port + path + query;
        } else if (rawUrl != null && rawUrl.startsWith("postgres://")) {
            url = rawUrl.replace("postgres://", "jdbc:postgresql://");
        }
        return DataSourceBuilder.create()
                .url(url)
                .username(user)
                .password(pass)
                .driverClassName("org.postgresql.Driver")
                .build();
    }
}
