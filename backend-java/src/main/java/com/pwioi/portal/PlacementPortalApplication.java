package com.pwioi.portal;

import com.pwioi.portal.config.AppProperties;
import com.pwioi.portal.config.DotenvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties(AppProperties.class)
public class PlacementPortalApplication {

    public static void main(String[] args) {
        DotenvLoader.applyToSystemProperties();
        SpringApplication.run(PlacementPortalApplication.class, args);
    }
}
