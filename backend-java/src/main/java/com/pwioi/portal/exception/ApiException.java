package com.pwioi.portal.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String error;
    private final String code;

    public ApiException(HttpStatus status, String error) {
        this(status, error, error, null);
    }

    public ApiException(HttpStatus status, String error, String message) {
        this(status, error, message, null);
    }

    public ApiException(HttpStatus status, String error, String message, String code) {
        super(message != null ? message : error);
        this.status = status;
        this.error = error;
        this.code = code;
    }

    public static ApiException unauthorized(String error) {
        return new ApiException(HttpStatus.UNAUTHORIZED, error);
    }

    public static ApiException forbidden(String error) {
        return new ApiException(HttpStatus.FORBIDDEN, error);
    }

    public static ApiException badRequest(String error) {
        return new ApiException(HttpStatus.BAD_REQUEST, error);
    }

    public static ApiException notFound(String resource) {
        return new ApiException(HttpStatus.NOT_FOUND, resource + " not found");
    }

    public HttpStatus getStatus() { return status; }
    public String getError() { return error; }
    public String getCode() { return code; }
}
