package com.pwioi.portal.coding;

import com.pwioi.portal.config.AppProperties;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class Judge0Service {
    private final AppProperties props;
    private final WebClient http = WebClient.builder().build();

    public Judge0Service(AppProperties props) {
        this.props = props;
    }

    public Map<String, Object> status() {
        if (!props.getJudge0().isEnabled() || props.getJudge0().getApiUrl() == null
                || props.getJudge0().getApiUrl().isBlank()) {
            return Map.of("enabled", false, "provider", "local-disabled");
        }
        return Map.of("enabled", true, "provider", props.getJudge0().getProvider());
    }

    public Map<String, Object> run(Map<String, Object> body) {
        if (!props.getJudge0().isEnabled()) {
            return Map.of(
                    "stdout", "",
                    "stderr", "Judge0 is not enabled on this server",
                    "status", Map.of("id", 6, "description", "Disabled")
            );
        }
        String url = props.getJudge0().getApiUrl().replaceAll("/$", "") + "/submissions?wait=true&base64_encoded=false";
        var spec = http.post().uri(url).contentType(MediaType.APPLICATION_JSON).bodyValue(body);
        if (props.getJudge0().getAuthToken() != null && !props.getJudge0().getAuthToken().isBlank()) {
            spec = spec.header("X-Auth-Token", props.getJudge0().getAuthToken());
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> res = spec.retrieve().bodyToMono(Map.class).block();
        return res == null ? Map.of() : res;
    }
}
