package com.pwioi.portal.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class Jsons {
    private final ObjectMapper mapper;

    public Jsons(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String toJson(Object value) {
        try {
            return mapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception e) {
            return "{}";
        }
    }

    public Map<String, Object> toMap(Object entity) {
        return mapper.convertValue(entity, new TypeReference<>() {});
    }

    public <T> T fromJson(String json, Class<T> type) {
        try {
            return mapper.readValue(json == null || json.isBlank() ? "{}" : json, type);
        } catch (Exception e) {
            return null;
        }
    }

    public List<Object> fromJsonList(String json) {
        try {
            return mapper.readValue(json == null || json.isBlank() ? "[]" : json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    public static Map<String, Object> ok(Object data) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", data);
        return m;
    }

    public static Map<String, Object> ok(Object data, String message) {
        Map<String, Object> m = ok(data);
        m.put("message", message);
        return m;
    }

    public static Map<String, Object> msg(String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("message", message);
        return m;
    }
}
