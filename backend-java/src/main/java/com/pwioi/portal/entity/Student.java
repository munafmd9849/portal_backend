package com.pwioi.portal.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.DynamicInsert;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@DynamicInsert
@Table(name = "students")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Student {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "userId", unique = true)
    private String userId;

    @Column(name = "fullName")
    private String fullName;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "phone")
    private String phone;

    @Column(name = "enrollmentId", unique = true)
    private String enrollmentId;

    @Column(name = "profile_completed")
    private Boolean profileCompleted;

    @Column(name = "cgpa")
    private Double cgpa;

    @Column(name = "backlogs")
    private String backlogs;

    @Column(name = "batch")
    private String batch;

    @Column(name = "center")
    private String center;

    @Column(name = "school")
    private String school;

    @Column(name = "branch")
    private String branch;

    @Column(name = "batchId")
    private String batchId;

    @Column(name = "centerId")
    private String centerId;

    @Column(name = "schoolId")
    private String schoolId;

    @Column(name = "bio")
    private String bio;

    @Column(name = "headline")
    private String headline;

    @Column(name = "summary")
    private String summary;

    @Column(name = "city")
    private String city;

    @Column(name = "stateRegion")
    private String stateRegion;

    @Column(name = "jobFlexibility")
    private String jobFlexibility;

    @Column(name = "profileImageUrl")
    private String profileImageUrl;

    @Column(name = "profileImagePublicId")
    private String profileImagePublicId;

    @Column(name = "linkedin")
    private String linkedin;

    @Column(name = "githubUrl")
    private String githubUrl;

    @Column(name = "youtubeUrl")
    private String youtubeUrl;

    @Column(name = "leetcode")
    private String leetcode;

    @Column(name = "codeforces")
    private String codeforces;

    @Column(name = "gfg")
    private String gfg;

    @Column(name = "hackerrank")
    private String hackerrank;

    @Column(name = "otherProfiles")
    private String otherProfiles;

    @Column(name = "resumeUrl")
    private String resumeUrl;

    @Column(name = "resumeFileName")
    private String resumeFileName;

    @Column(name = "resumeUploadedAt")
    private Instant resumeUploadedAt;

    @Column(name = "gender")
    private String gender;

    @Column(name = "resumeVerifiedAt")
    private Instant resumeVerifiedAt;

    @Column(name = "invitedAt")
    private Instant invitedAt;

    @Column(name = "primaryResumeAtsScore")
    private Integer primaryResumeAtsScore;

    @Column(name = "primaryResumeAtsScoredAt")
    private Instant primaryResumeAtsScoredAt;

    @Column(name = "primaryResumeAtsAnalysis")
    private String primaryResumeAtsAnalysis;

    @Column(name = "statsApplied")
    private Integer statsApplied;

    @Column(name = "statsShortlisted")
    private Integer statsShortlisted;

    @Column(name = "statsInterviewed")
    private Integer statsInterviewed;

    @Column(name = "statsOffers")
    private Integer statsOffers;

    @Column(name = "emailNotificationsDisabled")
    private Boolean emailNotificationsDisabled;

    @Column(name = "publicProfileId", unique = true)
    private String publicProfileId;

    @Column(name = "publicProfileShowEmail")
    private Boolean publicProfileShowEmail;

    @Column(name = "publicProfileShowPhone")
    private Boolean publicProfileShowPhone;

    @Column(name = "endorsementsData", columnDefinition = "TEXT")
    private String endorsementsData;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(String enrollmentId) { this.enrollmentId = enrollmentId; }

    public Boolean getProfileCompleted() { return profileCompleted; }
    public void setProfileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; }

    public Double getCgpa() { return cgpa; }
    public void setCgpa(Double cgpa) { this.cgpa = cgpa; }

    public String getBacklogs() { return backlogs; }
    public void setBacklogs(String backlogs) { this.backlogs = backlogs; }

    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }

    public String getCenter() { return center; }
    public void setCenter(String center) { this.center = center; }

    public String getSchool() { return school; }
    public void setSchool(String school) { this.school = school; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getCenterId() { return centerId; }
    public void setCenterId(String centerId) { this.centerId = centerId; }

    public String getSchoolId() { return schoolId; }
    public void setSchoolId(String schoolId) { this.schoolId = schoolId; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getHeadline() { return headline; }
    public void setHeadline(String headline) { this.headline = headline; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getStateRegion() { return stateRegion; }
    public void setStateRegion(String stateRegion) { this.stateRegion = stateRegion; }

    public String getJobFlexibility() { return jobFlexibility; }
    public void setJobFlexibility(String jobFlexibility) { this.jobFlexibility = jobFlexibility; }

    public String getProfileImageUrl() { return profileImageUrl; }
    public void setProfileImageUrl(String profileImageUrl) { this.profileImageUrl = profileImageUrl; }

    public String getProfileImagePublicId() { return profileImagePublicId; }
    public void setProfileImagePublicId(String profileImagePublicId) { this.profileImagePublicId = profileImagePublicId; }

    public String getLinkedin() { return linkedin; }
    public void setLinkedin(String linkedin) { this.linkedin = linkedin; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getYoutubeUrl() { return youtubeUrl; }
    public void setYoutubeUrl(String youtubeUrl) { this.youtubeUrl = youtubeUrl; }

    public String getLeetcode() { return leetcode; }
    public void setLeetcode(String leetcode) { this.leetcode = leetcode; }

    public String getCodeforces() { return codeforces; }
    public void setCodeforces(String codeforces) { this.codeforces = codeforces; }

    public String getGfg() { return gfg; }
    public void setGfg(String gfg) { this.gfg = gfg; }

    public String getHackerrank() { return hackerrank; }
    public void setHackerrank(String hackerrank) { this.hackerrank = hackerrank; }

    public String getOtherProfiles() { return otherProfiles; }
    public void setOtherProfiles(String otherProfiles) { this.otherProfiles = otherProfiles; }

    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }

    public String getResumeFileName() { return resumeFileName; }
    public void setResumeFileName(String resumeFileName) { this.resumeFileName = resumeFileName; }

    public Instant getResumeUploadedAt() { return resumeUploadedAt; }
    public void setResumeUploadedAt(Instant resumeUploadedAt) { this.resumeUploadedAt = resumeUploadedAt; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Instant getResumeVerifiedAt() { return resumeVerifiedAt; }
    public void setResumeVerifiedAt(Instant resumeVerifiedAt) { this.resumeVerifiedAt = resumeVerifiedAt; }

    public Instant getInvitedAt() { return invitedAt; }
    public void setInvitedAt(Instant invitedAt) { this.invitedAt = invitedAt; }

    public Integer getPrimaryResumeAtsScore() { return primaryResumeAtsScore; }
    public void setPrimaryResumeAtsScore(Integer primaryResumeAtsScore) { this.primaryResumeAtsScore = primaryResumeAtsScore; }

    public Instant getPrimaryResumeAtsScoredAt() { return primaryResumeAtsScoredAt; }
    public void setPrimaryResumeAtsScoredAt(Instant primaryResumeAtsScoredAt) { this.primaryResumeAtsScoredAt = primaryResumeAtsScoredAt; }

    public String getPrimaryResumeAtsAnalysis() { return primaryResumeAtsAnalysis; }
    public void setPrimaryResumeAtsAnalysis(String primaryResumeAtsAnalysis) { this.primaryResumeAtsAnalysis = primaryResumeAtsAnalysis; }

    public Integer getStatsApplied() { return statsApplied; }
    public void setStatsApplied(Integer statsApplied) { this.statsApplied = statsApplied; }

    public Integer getStatsShortlisted() { return statsShortlisted; }
    public void setStatsShortlisted(Integer statsShortlisted) { this.statsShortlisted = statsShortlisted; }

    public Integer getStatsInterviewed() { return statsInterviewed; }
    public void setStatsInterviewed(Integer statsInterviewed) { this.statsInterviewed = statsInterviewed; }

    public Integer getStatsOffers() { return statsOffers; }
    public void setStatsOffers(Integer statsOffers) { this.statsOffers = statsOffers; }

    public Boolean getEmailNotificationsDisabled() { return emailNotificationsDisabled; }
    public void setEmailNotificationsDisabled(Boolean emailNotificationsDisabled) { this.emailNotificationsDisabled = emailNotificationsDisabled; }

    public String getPublicProfileId() { return publicProfileId; }
    public void setPublicProfileId(String publicProfileId) { this.publicProfileId = publicProfileId; }

    public Boolean getPublicProfileShowEmail() { return publicProfileShowEmail; }
    public void setPublicProfileShowEmail(Boolean publicProfileShowEmail) { this.publicProfileShowEmail = publicProfileShowEmail; }

    public Boolean getPublicProfileShowPhone() { return publicProfileShowPhone; }
    public void setPublicProfileShowPhone(Boolean publicProfileShowPhone) { this.publicProfileShowPhone = publicProfileShowPhone; }

    public String getEndorsementsData() { return endorsementsData; }
    public void setEndorsementsData(String endorsementsData) { this.endorsementsData = endorsementsData; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
