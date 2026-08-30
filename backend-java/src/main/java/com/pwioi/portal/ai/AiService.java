package com.pwioi.portal.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pwioi.portal.config.AppProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class AiService {
    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private final AppProperties props;
    private final ObjectMapper mapper;
    private final WebClient http = WebClient.builder().build();

    public AiService(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    public boolean isEnabled() {
        return props.getAi().isEnabled();
    }

    public String generate(String prompt) {
        if (!isEnabled()) {
            return fallback(prompt);
        }
        try {
            if ("mistral".equalsIgnoreCase(props.getAi().getProvider()) && notBlank(props.getAi().getMistralApiKey())) {
                return mistral(prompt);
            }
            if (notBlank(props.getAi().getGoogleApiKey())) {
                return gemini(prompt);
            }
            if (notBlank(props.getAi().getMistralApiKey())) {
                return mistral(prompt);
            }
        } catch (Exception e) {
            log.warn("AI generate failed, using fallback: {}", e.getMessage());
        }
        return fallback(prompt);
    }

    public String generateJson(String prompt) {
        String raw = generate(prompt + "\n\nRespond with valid JSON only.");
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return raw.substring(start, end + 1);
        }
        int a = raw.indexOf('[');
        int b = raw.lastIndexOf(']');
        if (a >= 0 && b > a) {
            return raw.substring(a, b + 1);
        }
        return raw;
    }

    private String gemini(String prompt) {
        String model = props.getAi().getGoogleModel();
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + props.getAi().getGoogleApiKey();
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );
        String res = http.post().uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();
        try {
            JsonNode root = mapper.readTree(res);
            return root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        } catch (Exception e) {
            return res == null ? "" : res;
        }
    }

    private String mistral(String prompt) {
        Map<String, Object> body = Map.of(
                "model", props.getAi().getMistralModel(),
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );
        String res = http.post().uri("https://api.mistral.ai/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + props.getAi().getMistralApiKey())
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();
        try {
            JsonNode root = mapper.readTree(res);
            return root.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            return res == null ? "" : res;
        }
    }

    private String fallback(String prompt) {
        return "AI is not configured. Review your profile against the job description and practise STAR answers.";
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
