package com.pwioi.portal.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.pwioi.portal.config.AppProperties;
import com.pwioi.portal.exception.ApiException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CloudinaryService {
    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);
    private final AppProperties props;
    private final Cloudinary cloudinary;

    public CloudinaryService(AppProperties props) {
        this.props = props;
        if (props.getCloudinary().isConfigured()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", props.getCloudinary().getCloudName(),
                    "api_key", props.getCloudinary().getApiKey(),
                    "api_secret", props.getCloudinary().getApiSecret(),
                    "secure", true
            ));
        } else {
            this.cloudinary = null;
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logStatus() {
        if (cloudinary != null) {
            log.info("Cloudinary ready cloud_name={}", props.getCloudinary().getCloudName());
        } else {
            log.error("Cloudinary is NOT configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env");
        }
    }

    public boolean isConfigured() {
        return cloudinary != null;
    }

    public Map<String, Object> upload(MultipartFile file, String folder, String resourceType) {
        if (cloudinary == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "File storage is not configured (Cloudinary)",
                    "Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
        }
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("No file uploaded");
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", resourceType == null || resourceType.isBlank() ? "auto" : resourceType,
                    "use_filename", true,
                    "unique_filename", true,
                    "overwrite", false
            ));
            if (result.get("secure_url") == null && result.get("url") != null) {
                result.put("secure_url", result.get("url"));
            }
            if (result.get("secure_url") == null) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Cloudinary upload failed",
                        "Cloudinary did not return a file URL");
            }
            return result;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Cloudinary upload failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Cloudinary upload failed",
                    e.getMessage() == null ? "Upload failed" : e.getMessage());
        }
    }

    public void destroy(String publicId) {
        destroy(publicId, "raw");
    }

    public void destroy(String publicId, String resourceType) {
        if (cloudinary == null || publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "resource_type", resourceType == null ? "image" : resourceType
            ));
        } catch (Exception e) {
            log.debug("Cloudinary destroy skipped: {}", e.getMessage());
        }
    }
}
