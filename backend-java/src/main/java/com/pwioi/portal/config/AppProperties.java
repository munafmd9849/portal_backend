package com.pwioi.portal.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String frontendUrl = "http://localhost:5173";
    private String corsOrigin = "";
    private String superAdminEmail = "";
    private boolean requireEmailVerified = true;
    private String emailFrom = "noreply@pwioi.com";

    private final Jwt jwt = new Jwt();
    private final Ai ai = new Ai();
    private final Google google = new Google();
    private final CloudinaryProps cloudinary = new CloudinaryProps();
    private final Judge0 judge0 = new Judge0();
    private final Socket socket = new Socket();
    private final Placement placement = new Placement();

    public String getFrontendUrl() { return frontendUrl; }
    public void setFrontendUrl(String frontendUrl) { this.frontendUrl = frontendUrl; }
    public String getCorsOrigin() { return corsOrigin; }
    public void setCorsOrigin(String corsOrigin) { this.corsOrigin = corsOrigin; }
    public String getSuperAdminEmail() { return superAdminEmail; }
    public void setSuperAdminEmail(String superAdminEmail) { this.superAdminEmail = superAdminEmail; }
    public boolean isRequireEmailVerified() { return requireEmailVerified; }
    public void setRequireEmailVerified(boolean requireEmailVerified) { this.requireEmailVerified = requireEmailVerified; }
    public String getEmailFrom() { return emailFrom; }
    public void setEmailFrom(String emailFrom) { this.emailFrom = emailFrom; }
    public Jwt getJwt() { return jwt; }
    public Ai getAi() { return ai; }
    public Google getGoogle() { return google; }
    public CloudinaryProps getCloudinary() { return cloudinary; }
    public Judge0 getJudge0() { return judge0; }
    public Socket getSocket() { return socket; }
    public Placement getPlacement() { return placement; }

    public static class Jwt {
        private String secret;
        private String refreshSecret;
        private String expiresIn = "1h";
        private String refreshExpiresIn = "7d";
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public String getRefreshSecret() { return refreshSecret; }
        public void setRefreshSecret(String refreshSecret) { this.refreshSecret = refreshSecret; }
        public String getExpiresIn() { return expiresIn; }
        public void setExpiresIn(String expiresIn) { this.expiresIn = expiresIn; }
        public String getRefreshExpiresIn() { return refreshExpiresIn; }
        public void setRefreshExpiresIn(String refreshExpiresIn) { this.refreshExpiresIn = refreshExpiresIn; }
    }

    public static class Ai {
        private boolean enabled = true;
        private String provider = "google";
        private String googleApiKey = "";
        private String googleModel = "gemini-2.5-flash";
        private String mistralApiKey = "";
        private String mistralModel = "mistral-large-latest";
        private String transcribeModel = "voxtral-mini-latest";
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getGoogleApiKey() { return googleApiKey; }
        public void setGoogleApiKey(String googleApiKey) { this.googleApiKey = googleApiKey; }
        public String getGoogleModel() { return googleModel; }
        public void setGoogleModel(String googleModel) { this.googleModel = googleModel; }
        public String getMistralApiKey() { return mistralApiKey; }
        public void setMistralApiKey(String mistralApiKey) { this.mistralApiKey = mistralApiKey; }
        public String getMistralModel() { return mistralModel; }
        public void setMistralModel(String mistralModel) { this.mistralModel = mistralModel; }
        public String getTranscribeModel() { return transcribeModel; }
        public void setTranscribeModel(String transcribeModel) { this.transcribeModel = transcribeModel; }
    }

    public static class Google {
        private String clientId = "";
        private String clientSecret = "";
        private String sheetsSpreadsheetId = "";
        private String sheetsServiceAccountJson = "";
        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }
        public String getClientSecret() { return clientSecret; }
        public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
        public String getSheetsSpreadsheetId() { return sheetsSpreadsheetId; }
        public void setSheetsSpreadsheetId(String sheetsSpreadsheetId) { this.sheetsSpreadsheetId = sheetsSpreadsheetId; }
        public String getSheetsServiceAccountJson() { return sheetsServiceAccountJson; }
        public void setSheetsServiceAccountJson(String sheetsServiceAccountJson) { this.sheetsServiceAccountJson = sheetsServiceAccountJson; }
    }

    public static class CloudinaryProps {
        private String cloudName = "";
        private String apiKey = "";
        private String apiSecret = "";
        public String getCloudName() { return cloudName; }
        public void setCloudName(String cloudName) { this.cloudName = cloudName; }
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getApiSecret() { return apiSecret; }
        public void setApiSecret(String apiSecret) { this.apiSecret = apiSecret; }
        public boolean isConfigured() {
            return notBlank(cloudName) && notBlank(apiKey) && notBlank(apiSecret);
        }

        private static boolean notBlank(String s) {
            return s != null && !s.isBlank();
        }
    }

    public static class Judge0 {
        private boolean enabled = false;
        private String provider = "selfhosted";
        private String apiUrl = "";
        private String authToken = "";
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getApiUrl() { return apiUrl; }
        public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }
        public String getAuthToken() { return authToken; }
        public void setAuthToken(String authToken) { this.authToken = authToken; }
    }

    public static class Socket {
        private int port = 3000;
        public int getPort() { return port; }
        public void setPort(int port) { this.port = port; }
    }

    public static class Placement {
        private int maxActiveOffers = 1;
        private boolean blockWhenJoined = true;
        private boolean blockDualDream = true;
        private int minMocks = 0;
        private int minAssessments = 0;
        private double superDreamMinCgpa = 8;
        public int getMaxActiveOffers() { return maxActiveOffers; }
        public void setMaxActiveOffers(int maxActiveOffers) { this.maxActiveOffers = maxActiveOffers; }
        public boolean isBlockWhenJoined() { return blockWhenJoined; }
        public void setBlockWhenJoined(boolean blockWhenJoined) { this.blockWhenJoined = blockWhenJoined; }
        public boolean isBlockDualDream() { return blockDualDream; }
        public void setBlockDualDream(boolean blockDualDream) { this.blockDualDream = blockDualDream; }
        public int getMinMocks() { return minMocks; }
        public void setMinMocks(int minMocks) { this.minMocks = minMocks; }
        public int getMinAssessments() { return minAssessments; }
        public void setMinAssessments(int minAssessments) { this.minAssessments = minAssessments; }
        public double getSuperDreamMinCgpa() { return superDreamMinCgpa; }
        public void setSuperDreamMinCgpa(double superDreamMinCgpa) { this.superDreamMinCgpa = superDreamMinCgpa; }
    }
}
