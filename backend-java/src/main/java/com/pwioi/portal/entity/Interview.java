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
@Table(name = "interviews")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Interview {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "jobId", unique = true)
    private String jobId;

    @Column(name = "companyId")
    private String companyId;

    @Column(name = "status")
    private String status;

    @Column(name = "currentRound")
    private String currentRound;

    @Column(name = "rounds")
    private String rounds;

    @Column(name = "totalCandidates")
    private Integer totalCandidates;

    @Column(name = "doneCandidates")
    private Integer doneCandidates;

    @Column(name = "pendingCandidates")
    private Integer pendingCandidates;

    @Column(name = "selectedCandidates")
    private Integer selectedCandidates;

    @Column(name = "onHoldCandidates")
    private Integer onHoldCandidates;

    @Column(name = "createdBy")
    private String createdBy;

    @Column(name = "sessionToken", unique = true)
    private String sessionToken;

    @Column(name = "startedAt")
    @CreationTimestamp
    private Instant startedAt;

    @Column(name = "completedAt")
    private Instant completedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCurrentRound() { return currentRound; }
    public void setCurrentRound(String currentRound) { this.currentRound = currentRound; }

    public String getRounds() { return rounds; }
    public void setRounds(String rounds) { this.rounds = rounds; }

    public Integer getTotalCandidates() { return totalCandidates; }
    public void setTotalCandidates(Integer totalCandidates) { this.totalCandidates = totalCandidates; }

    public Integer getDoneCandidates() { return doneCandidates; }
    public void setDoneCandidates(Integer doneCandidates) { this.doneCandidates = doneCandidates; }

    public Integer getPendingCandidates() { return pendingCandidates; }
    public void setPendingCandidates(Integer pendingCandidates) { this.pendingCandidates = pendingCandidates; }

    public Integer getSelectedCandidates() { return selectedCandidates; }
    public void setSelectedCandidates(Integer selectedCandidates) { this.selectedCandidates = selectedCandidates; }

    public Integer getOnHoldCandidates() { return onHoldCandidates; }
    public void setOnHoldCandidates(Integer onHoldCandidates) { this.onHoldCandidates = onHoldCandidates; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
