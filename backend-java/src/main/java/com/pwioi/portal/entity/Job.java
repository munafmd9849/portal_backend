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
@Table(name = "jobs")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Job {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "jobTitle")
    private String jobTitle;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "requiredSkills")
    private String requiredSkills;

    @Column(name = "companyId")
    private String companyId;

    @Column(name = "recruiterId")
    private String recruiterId;

    @Column(name = "companyName")
    private String companyName;

    @Column(name = "recruiterEmail")
    private String recruiterEmail;

    @Column(name = "recruiterName")
    private String recruiterName;

    @Column(name = "recruiterEmails")
    private String recruiterEmails;

    @Column(name = "salary")
    private String salary;

    @Column(name = "ctc")
    private String ctc;

    @Column(name = "salaryRange")
    private String salaryRange;

    @Column(name = "location")
    private String location;

    @Column(name = "companyLocation")
    private String companyLocation;

    @Column(name = "driveDate")
    private Instant driveDate;

    @Column(name = "applicationDeadline")
    private Instant applicationDeadline;

    @Column(name = "jobType")
    private String jobType;

    @Column(name = "workMode")
    private String workMode;

    @Column(name = "experienceLevel")
    private String experienceLevel;

    @Column(name = "driveVenues")
    private String driveVenues;

    @Column(name = "reportingTime")
    private String reportingTime;

    @Column(name = "qualification")
    private String qualification;

    @Column(name = "specialization")
    private String specialization;

    @Column(name = "yop")
    private String yop;

    @Column(name = "minCgpa")
    private String minCgpa;

    @Column(name = "gapAllowed")
    private String gapAllowed;

    @Column(name = "gapYears")
    private String gapYears;

    @Column(name = "backlogs")
    private String backlogs;

    @Column(name = "spocs")
    private String spocs;

    @Column(name = "status")
    private String status;

    @Column(name = "isActive")
    private Boolean isActive;

    @Column(name = "isPosted")
    private Boolean isPosted;

    @Column(name = "applicationDeadlineMailSent")
    private Boolean applicationDeadlineMailSent;

    @Column(name = "driveReminder7dSent")
    private Boolean driveReminder7dSent;

    @Column(name = "driveReminder3dSent")
    private Boolean driveReminder3dSent;

    @Column(name = "driveReminder24hSent")
    private Boolean driveReminder24hSent;

    @Column(name = "adminNote")
    private String adminNote;

    @Column(name = "recruiterNote")
    private String recruiterNote;

    @Column(name = "interviewRounds")
    private String interviewRounds;

    @Column(name = "customQuestions")
    private String customQuestions;

    @Column(name = "requiresScreening")
    private Boolean requiresScreening;

    @Column(name = "requiresTest")
    private Boolean requiresTest;

    @Column(name = "linkedAssessmentId")
    private String linkedAssessmentId;

    @Column(name = "assessmentPassPercent")
    private Double assessmentPassPercent;

    @Column(name = "companyTier")
    private String companyTier;

    @Column(name = "interviewMode")
    private String interviewMode;

    @Column(name = "defaultMeetingProvider")
    private String defaultMeetingProvider;

    @Column(name = "resultsDeclaredAt")
    private Instant resultsDeclaredAt;

    @Column(name = "resultsLocked")
    private Boolean resultsLocked;

    @Column(name = "targetSchools")
    private String targetSchools;

    @Column(name = "targetCenters")
    private String targetCenters;

    @Column(name = "targetBatches")
    private String targetBatches;

    @Column(name = "targetBranches")
    private String targetBranches;

    @Column(name = "targetSchoolIds")
    private String targetSchoolIds;

    @Column(name = "targetCenterIds")
    private String targetCenterIds;

    @Column(name = "targetBatchIds")
    private String targetBatchIds;

    @Column(name = "submittedAt")
    private Instant submittedAt;

    @Column(name = "postedAt")
    private Instant postedAt;

    @Column(name = "postedBy")
    private String postedBy;

    @Column(name = "approvedAt")
    private Instant approvedAt;

    @Column(name = "approvedBy")
    private String approvedBy;

    @Column(name = "rejectedAt")
    private Instant rejectedAt;

    @Column(name = "rejectedBy")
    private String rejectedBy;

    @Column(name = "rejectionReason")
    private String rejectionReason;

    @Column(name = "archivedAt")
    private Instant archivedAt;

    @Column(name = "archivedBy")
    private String archivedBy;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    @Column(name = "visibilityMode")
    private String visibilityMode;

    @Column(name = "recommendationEnabled")
    private Boolean recommendationEnabled;

    @Column(name = "createdBy")
    private String createdBy;

    @Column(name = "assignedTo")
    private String assignedTo;

    @Column(name = "updatedBy")
    private String updatedBy;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }

    public String getRequiredSkills() { return requiredSkills; }
    public void setRequiredSkills(String requiredSkills) { this.requiredSkills = requiredSkills; }

    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }

    public String getRecruiterId() { return recruiterId; }
    public void setRecruiterId(String recruiterId) { this.recruiterId = recruiterId; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getRecruiterEmail() { return recruiterEmail; }
    public void setRecruiterEmail(String recruiterEmail) { this.recruiterEmail = recruiterEmail; }

    public String getRecruiterName() { return recruiterName; }
    public void setRecruiterName(String recruiterName) { this.recruiterName = recruiterName; }

    public String getRecruiterEmails() { return recruiterEmails; }
    public void setRecruiterEmails(String recruiterEmails) { this.recruiterEmails = recruiterEmails; }

    public String getSalary() { return salary; }
    public void setSalary(String salary) { this.salary = salary; }

    public String getCtc() { return ctc; }
    public void setCtc(String ctc) { this.ctc = ctc; }

    public String getSalaryRange() { return salaryRange; }
    public void setSalaryRange(String salaryRange) { this.salaryRange = salaryRange; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getCompanyLocation() { return companyLocation; }
    public void setCompanyLocation(String companyLocation) { this.companyLocation = companyLocation; }

    public Instant getDriveDate() { return driveDate; }
    public void setDriveDate(Instant driveDate) { this.driveDate = driveDate; }

    public Instant getApplicationDeadline() { return applicationDeadline; }
    public void setApplicationDeadline(Instant applicationDeadline) { this.applicationDeadline = applicationDeadline; }

    public String getJobType() { return jobType; }
    public void setJobType(String jobType) { this.jobType = jobType; }

    public String getWorkMode() { return workMode; }
    public void setWorkMode(String workMode) { this.workMode = workMode; }

    public String getExperienceLevel() { return experienceLevel; }
    public void setExperienceLevel(String experienceLevel) { this.experienceLevel = experienceLevel; }

    public String getDriveVenues() { return driveVenues; }
    public void setDriveVenues(String driveVenues) { this.driveVenues = driveVenues; }

    public String getReportingTime() { return reportingTime; }
    public void setReportingTime(String reportingTime) { this.reportingTime = reportingTime; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public String getYop() { return yop; }
    public void setYop(String yop) { this.yop = yop; }

    public String getMinCgpa() { return minCgpa; }
    public void setMinCgpa(String minCgpa) { this.minCgpa = minCgpa; }

    public String getGapAllowed() { return gapAllowed; }
    public void setGapAllowed(String gapAllowed) { this.gapAllowed = gapAllowed; }

    public String getGapYears() { return gapYears; }
    public void setGapYears(String gapYears) { this.gapYears = gapYears; }

    public String getBacklogs() { return backlogs; }
    public void setBacklogs(String backlogs) { this.backlogs = backlogs; }

    public String getSpocs() { return spocs; }
    public void setSpocs(String spocs) { this.spocs = spocs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Boolean getIsPosted() { return isPosted; }
    public void setIsPosted(Boolean isPosted) { this.isPosted = isPosted; }

    public Boolean getApplicationDeadlineMailSent() { return applicationDeadlineMailSent; }
    public void setApplicationDeadlineMailSent(Boolean applicationDeadlineMailSent) { this.applicationDeadlineMailSent = applicationDeadlineMailSent; }

    public Boolean getDriveReminder7dSent() { return driveReminder7dSent; }
    public void setDriveReminder7dSent(Boolean driveReminder7dSent) { this.driveReminder7dSent = driveReminder7dSent; }

    public Boolean getDriveReminder3dSent() { return driveReminder3dSent; }
    public void setDriveReminder3dSent(Boolean driveReminder3dSent) { this.driveReminder3dSent = driveReminder3dSent; }

    public Boolean getDriveReminder24hSent() { return driveReminder24hSent; }
    public void setDriveReminder24hSent(Boolean driveReminder24hSent) { this.driveReminder24hSent = driveReminder24hSent; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String adminNote) { this.adminNote = adminNote; }

    public String getRecruiterNote() { return recruiterNote; }
    public void setRecruiterNote(String recruiterNote) { this.recruiterNote = recruiterNote; }

    public String getInterviewRounds() { return interviewRounds; }
    public void setInterviewRounds(String interviewRounds) { this.interviewRounds = interviewRounds; }

    public String getCustomQuestions() { return customQuestions; }
    public void setCustomQuestions(String customQuestions) { this.customQuestions = customQuestions; }

    public Boolean getRequiresScreening() { return requiresScreening; }
    public void setRequiresScreening(Boolean requiresScreening) { this.requiresScreening = requiresScreening; }

    public Boolean getRequiresTest() { return requiresTest; }
    public void setRequiresTest(Boolean requiresTest) { this.requiresTest = requiresTest; }

    public String getLinkedAssessmentId() { return linkedAssessmentId; }
    public void setLinkedAssessmentId(String linkedAssessmentId) { this.linkedAssessmentId = linkedAssessmentId; }

    public Double getAssessmentPassPercent() { return assessmentPassPercent; }
    public void setAssessmentPassPercent(Double assessmentPassPercent) { this.assessmentPassPercent = assessmentPassPercent; }

    public String getCompanyTier() { return companyTier; }
    public void setCompanyTier(String companyTier) { this.companyTier = companyTier; }

    public String getInterviewMode() { return interviewMode; }
    public void setInterviewMode(String interviewMode) { this.interviewMode = interviewMode; }

    public String getDefaultMeetingProvider() { return defaultMeetingProvider; }
    public void setDefaultMeetingProvider(String defaultMeetingProvider) { this.defaultMeetingProvider = defaultMeetingProvider; }

    public Instant getResultsDeclaredAt() { return resultsDeclaredAt; }
    public void setResultsDeclaredAt(Instant resultsDeclaredAt) { this.resultsDeclaredAt = resultsDeclaredAt; }

    public Boolean getResultsLocked() { return resultsLocked; }
    public void setResultsLocked(Boolean resultsLocked) { this.resultsLocked = resultsLocked; }

    public String getTargetSchools() { return targetSchools; }
    public void setTargetSchools(String targetSchools) { this.targetSchools = targetSchools; }

    public String getTargetCenters() { return targetCenters; }
    public void setTargetCenters(String targetCenters) { this.targetCenters = targetCenters; }

    public String getTargetBatches() { return targetBatches; }
    public void setTargetBatches(String targetBatches) { this.targetBatches = targetBatches; }

    public String getTargetBranches() { return targetBranches; }
    public void setTargetBranches(String targetBranches) { this.targetBranches = targetBranches; }

    public String getTargetSchoolIds() { return targetSchoolIds; }
    public void setTargetSchoolIds(String targetSchoolIds) { this.targetSchoolIds = targetSchoolIds; }

    public String getTargetCenterIds() { return targetCenterIds; }
    public void setTargetCenterIds(String targetCenterIds) { this.targetCenterIds = targetCenterIds; }

    public String getTargetBatchIds() { return targetBatchIds; }
    public void setTargetBatchIds(String targetBatchIds) { this.targetBatchIds = targetBatchIds; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    public Instant getPostedAt() { return postedAt; }
    public void setPostedAt(Instant postedAt) { this.postedAt = postedAt; }

    public String getPostedBy() { return postedBy; }
    public void setPostedBy(String postedBy) { this.postedBy = postedBy; }

    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public Instant getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(Instant rejectedAt) { this.rejectedAt = rejectedAt; }

    public String getRejectedBy() { return rejectedBy; }
    public void setRejectedBy(String rejectedBy) { this.rejectedBy = rejectedBy; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }

    public String getArchivedBy() { return archivedBy; }
    public void setArchivedBy(String archivedBy) { this.archivedBy = archivedBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getVisibilityMode() { return visibilityMode; }
    public void setVisibilityMode(String visibilityMode) { this.visibilityMode = visibilityMode; }

    public Boolean getRecommendationEnabled() { return recommendationEnabled; }
    public void setRecommendationEnabled(Boolean recommendationEnabled) { this.recommendationEnabled = recommendationEnabled; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
