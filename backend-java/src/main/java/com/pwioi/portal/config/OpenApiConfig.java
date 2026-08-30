package com.pwioi.portal.config;

import com.pwioi.portal.dto.LoginRequest;
import com.pwioi.portal.dto.RefreshTokenRequest;
import com.pwioi.portal.dto.RegisterRequest;
import com.pwioi.portal.dto.SendOtpRequest;
import com.pwioi.portal.dto.VerifyOtpRequest;
import com.pwioi.portal.entity.Announcement;
import com.pwioi.portal.entity.Application;
import com.pwioi.portal.entity.Batch;
import com.pwioi.portal.entity.Center;
import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.Notification;
import com.pwioi.portal.entity.School;
import com.pwioi.portal.entity.Skill;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.entity.User;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.tags.Tag;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI portalOpenApi() {
        return new OpenAPI().info(new Info()
                .title("PWIOI Placement Portal API")
                .version("1.0.0")
                .description("REST API for students, recruiters, admins, and super admins. Same route contracts as the Node backend."));
    }

    @Bean
    public OpenApiCustomizer portalOpenApiCustomizer() {
        return openApi -> {
            Schema<Object> jsonObject = new Schema<>();
            jsonObject.setName("JsonObject");
            jsonObject.setType("object");
            jsonObject.setAdditionalProperties(Boolean.TRUE);
            jsonObject.setDescription("JSON object (free-form fields)");
            if (openApi.getComponents() == null) {
                openApi.setComponents(new io.swagger.v3.oas.models.Components());
            }
            if (openApi.getComponents().getSchemas() == null) {
                openApi.getComponents().setSchemas(new LinkedHashMap<>());
            }
            openApi.getComponents().getSchemas().put("JsonObject", jsonObject);
            registerJavaSchemas(openApi,
                    LoginRequest.class, RegisterRequest.class, SendOtpRequest.class,
                    VerifyOtpRequest.class, RefreshTokenRequest.class,
                    Student.class, User.class, Job.class, Application.class, Skill.class,
                    Notification.class, Announcement.class, School.class, Center.class, Batch.class);
            openApi.getComponents().getSchemas().put("AuthResponse", objectSchema(
                    "success", "accessToken", "refreshToken", "user", "profileCompleted"));
            openApi.getComponents().getSchemas().put("StudentListResponse", objectSchema(
                    "students", "pagination", "summary", "statusBreakdown"));
            openApi.getComponents().getSchemas().put("AnnouncementListResponse", objectSchema(
                    "success", "announcements"));

            if (openApi.getPaths() == null) return;
            Set<String> tagNames = new LinkedHashSet<>();
            openApi.getPaths().forEach((path, item) -> {
                item.readOperationsMap().forEach((method, op) -> {
                    String opId = toOperationId(method, path);
                    op.setOperationId(opId);
                    if (op.getSummary() == null || op.getSummary().isBlank() || op.getSummary().equals(op.getOperationId())) {
                        op.setSummary(toSummary(method, path));
                    }
                    String tag = tagFor(path);
                    op.setTags(List.of(tag));
                    tagNames.add(tag);
                    rewriteBodies(op);
                    applyNamedRequest(path, method, op);
                    applyNamedResponse(path, method, op);
                    rewriteResponses(op);
                });
            });
            openApi.setTags(tagNames.stream().sorted().map(n -> new Tag().name(n)).toList());
        };
    }

    private static void registerJavaSchemas(OpenAPI openApi, Class<?>... types) {
        for (Class<?> type : types) {
            ModelConverters.getInstance().readAll(type).forEach((name, schema) -> {
                if (name != null && schema != null && !openApi.getComponents().getSchemas().containsKey(name)) {
                    openApi.getComponents().addSchemas(name, schema);
                }
            });
        }
    }

    @SuppressWarnings("rawtypes")
    private static Schema<Object> objectSchema(String... fields) {
        Schema<Object> schema = new ObjectSchema();
        LinkedHashMap<String, Schema> props = new LinkedHashMap<>();
        for (String field : fields) {
            if ("profile".equals(field) || "user".equals(field) || "pagination".equals(field)
                    || "summary".equals(field) || "statusBreakdown".equals(field)) {
                Schema obj = new ObjectSchema();
                obj.setAdditionalProperties(Boolean.TRUE);
                props.put(field, obj);
            } else if ("students".equals(field) || "announcements".equals(field)) {
                Schema arr = new Schema<>();
                arr.setType("array");
                arr.setTypes(Set.of("array"));
                Schema items = new ObjectSchema();
                items.setAdditionalProperties(Boolean.TRUE);
                arr.setItems(items);
                props.put(field, arr);
            } else if ("success".equals(field) || "profileCompleted".equals(field)) {
                Schema bool = new Schema<>();
                bool.setType("boolean");
                bool.setTypes(Set.of("boolean"));
                props.put(field, bool);
            } else {
                props.put(field, new StringSchema());
            }
        }
        schema.setProperties(props);
        return schema;
    }

    private static void applyNamedRequest(String path, PathItem.HttpMethod method, Operation op) {
        String ref = null;
        if (method == PathItem.HttpMethod.POST && "/api/auth/login".equals(path)) ref = "LoginRequest";
        else if (method == PathItem.HttpMethod.POST && "/api/auth/register".equals(path)) ref = "RegisterRequest";
        else if (method == PathItem.HttpMethod.POST && "/api/auth/send-otp".equals(path)) ref = "SendOtpRequest";
        else if (method == PathItem.HttpMethod.POST && "/api/auth/verify-otp".equals(path)) ref = "VerifyOtpRequest";
        else if (method == PathItem.HttpMethod.POST && "/api/auth/refresh".equals(path)) ref = "RefreshTokenRequest";
        if (ref == null || op.getRequestBody() == null || op.getRequestBody().getContent() == null) return;
        Schema<?> schema = new Schema<>();
        schema.set$ref("#/components/schemas/" + ref);
        op.getRequestBody().getContent().forEach((media, mt) -> mt.setSchema(schema));
    }

    private static void applyNamedResponse(String path, PathItem.HttpMethod method, Operation op) {
        String ref = null;
        if (method == PathItem.HttpMethod.POST && ("/api/auth/login".equals(path) || "/api/auth/register".equals(path)
                || "/api/auth/refresh".equals(path))) {
            ref = "AuthResponse";
        } else if (method == PathItem.HttpMethod.GET && "/api/auth/me".equals(path)) {
            ref = "AuthResponse";
        } else if (method == PathItem.HttpMethod.GET && ("/api/students".equals(path)
                || "/api/admin/student-directory".equals(path))) {
            ref = "StudentListResponse";
        } else if (method == PathItem.HttpMethod.GET && "/api/announcements".equals(path)) {
            ref = "AnnouncementListResponse";
        }
        if (ref == null || op.getResponses() == null) return;
        ApiResponse ok = op.getResponses().get("200");
        if (ok == null) ok = op.getResponses().get("201");
        if (ok == null || ok.getContent() == null) return;
        Schema<?> schema = new Schema<>();
        schema.set$ref("#/components/schemas/" + ref);
        ok.getContent().forEach((media, mt) -> mt.setSchema(schema));
    }

    private static void rewriteBodies(Operation op) {
        if (op.getRequestBody() == null) return;
        Content content = op.getRequestBody().getContent();
        if (content == null) return;
        content.forEach((media, mt) -> replaceAnonymousObject(mt));
    }

    private static void rewriteResponses(Operation op) {
        if (op.getResponses() == null) return;
        for (ApiResponse response : op.getResponses().values()) {
            Content content = response.getContent();
            if (content == null) continue;
            content.forEach((media, mt) -> {
                if ("*/*".equals(media)) {
                    MediaType json = content.get("application/json");
                    if (json == null) {
                        content.addMediaType("application/json", mt);
                    }
                    content.remove("*/*");
                }
                replaceAnonymousObject(mt);
            });
        }
    }

    @SuppressWarnings("rawtypes")
    private static void replaceAnonymousObject(MediaType mt) {
        if (mt == null) return;
        Schema schema = mt.getSchema();
        if (isAnonymousObject(schema)) {
            Schema ref = new Schema<>();
            ref.set$ref("#/components/schemas/JsonObject");
            mt.setSchema(ref);
        }
    }

    @SuppressWarnings("rawtypes")
    private static boolean isAnonymousObject(Schema schema) {
        if (schema == null || schema.get$ref() != null) return false;
        String type = schema.getType();
        if (type == null && schema.getTypes() != null && schema.getTypes().size() == 1) {
            type = String.valueOf(schema.getTypes().iterator().next());
        }
        if (!"object".equals(type)) return false;
        boolean noProps = schema.getProperties() == null || schema.getProperties().isEmpty();
        Object additional = schema.getAdditionalProperties();
        boolean emptyAdditional = additional == null
                || Boolean.TRUE.equals(additional)
                || (additional instanceof Schema<?> ap && (ap.getProperties() == null || ap.getProperties().isEmpty()) && ap.get$ref() == null);
        return noProps && emptyAdditional;
    }

    private static String toOperationId(PathItem.HttpMethod method, String path) {
        StringBuilder sb = new StringBuilder(method.name().toLowerCase(Locale.ROOT));
        for (String part : path.split("/")) {
            if (part.isBlank()) continue;
            String cleaned = part.replace("{", "").replace("}", "");
            sb.append(Character.toUpperCase(cleaned.charAt(0)));
            if (cleaned.length() > 1) sb.append(cleaned.substring(1));
        }
        return sb.toString();
    }

    private static String toSummary(PathItem.HttpMethod method, String path) {
        return method.name() + " " + path;
    }

    private static String tagFor(String path) {
        if (path.startsWith("/api/auth")) return "Auth";
        if (path.startsWith("/api/students")) return "Students";
        if (path.startsWith("/api/jobs")) return "Jobs";
        if (path.startsWith("/api/applications")) return "Applications";
        if (path.startsWith("/api/admin/job-opportunities")) return "Admin Job Opportunities";
        if (path.startsWith("/api/admin/control-tower")) return "Admin Control Tower";
        if (path.startsWith("/api/admin")) return "Admin";
        if (path.startsWith("/api/super-admin")) return "Super Admin";
        if (path.startsWith("/api/assessments")) return "Assessments";
        if (path.startsWith("/api/mock-interviews") || path.startsWith("/api/ai-mock-interviews")) return "Mock Interviews";
        if (path.startsWith("/api/notifications")) return "Notifications";
        if (path.startsWith("/api/academic")) return "Academic";
        if (path.startsWith("/api/recruiters")) return "Recruiters";
        if (path.startsWith("/api/queries")) return "Queries";
        if (path.startsWith("/api/endorsements")) return "Endorsements";
        if (path.startsWith("/api/announcements")) return "Announcements";
        if (path.startsWith("/api/cms") || path.startsWith("/api/success-stories")) return "CMS";
        if (path.startsWith("/api/placement")) return "Placement";
        if (path.startsWith("/api/public")) return "Public";
        if (path.startsWith("/api/code")) return "Code";
        if (path.startsWith("/api/contact")) return "Contact";
        if (path.startsWith("/health") || path.equals("/")) return "Health";
        if (path.startsWith("/api/")) {
            String[] parts = path.split("/");
            if (parts.length > 2) {
                String raw = parts[2].replace("-", " ");
                return Character.toUpperCase(raw.charAt(0)) + raw.substring(1);
            }
        }
        return "Other";
    }
}
