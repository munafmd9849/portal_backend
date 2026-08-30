package com.pwioi.portal.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("error", ex.getError());
        body.put("message", ex.getMessage());
        if (ex.getCode() != null) {
            body.put("code", ex.getCode());
        }
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toError)
                .collect(Collectors.toList());
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Validation failed",
                "errors", errors
        ));
    }

    @ExceptionHandler({AccessDeniedException.class})
    public ResponseEntity<Map<String, Object>> handleDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "error", "Forbidden",
                "message", "You do not have permission to access this resource"
        ));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCreds(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "success", false,
                "error", "Invalid credentials"
        ));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraint(org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Invalid data",
                "message", "The request conflicts with existing data or required fields are missing"
        ));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleMissing(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "error", "Not found",
                "message", "The requested resource was not found"
        ));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethod(org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(Map.of(
                "success", false,
                "error", "Method not allowed",
                "message", ex.getMessage() == null ? "Request method is not supported" : ex.getMessage()
        ));
    }

    @ExceptionHandler({
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class
    })
    public ResponseEntity<Map<String, Object>> handleMissingPart(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "No file uploaded",
                "message", "Attach a PDF in the resume field and try again"
        ));
    }

    @ExceptionHandler({
            org.springframework.web.multipart.MaxUploadSizeExceededException.class,
            org.springframework.web.multipart.MultipartException.class
    })
    public ResponseEntity<Map<String, Object>> handleMultipart(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Upload failed",
                "message", ex.getMessage() == null ? "The file could not be uploaded" : ex.getMessage()
        ));
    }

    @ExceptionHandler(EmailSendException.class)
    public ResponseEntity<Map<String, Object>> handleEmail(EmailSendException ex) {
        log.error("Email send failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "success", false,
                "error", "Failed to send email",
                "message", "We couldn't send the email. Please try again in a moment."
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception ex) {
        log.error("Unhandled error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Internal server error",
                "message", "An internal server error occurred"
        ));
    }

    private Map<String, String> toError(FieldError fe) {
        return Map.of(
                "path", fe.getField(),
                "msg", fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "invalid",
                "param", fe.getField()
        );
    }
}
