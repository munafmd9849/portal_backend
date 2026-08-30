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
@Table(name = "endorsements")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Endorsement {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "tokenId", unique = true)
    private String tokenId;

    @Column(name = "endorserName")
    private String endorserName;

    @Column(name = "endorserEmail")
    private String endorserEmail;

    @Column(name = "endorserRole")
    private String endorserRole;

    @Column(name = "organization")
    private String organization;

    @Column(name = "relationship")
    private String relationship;

    @Column(name = "context")
    private String context;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "skills")
    private String skills;

    @Column(name = "skillRatings")
    private String skillRatings;

    @Column(name = "overallRating")
    private Integer overallRating;

    @Column(name = "consent")
    private Boolean consent;

    @Column(name = "verified")
    private Boolean verified;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "submittedAt")
    @CreationTimestamp
    private Instant submittedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getTokenId() { return tokenId; }
    public void setTokenId(String tokenId) { this.tokenId = tokenId; }

    public String getEndorserName() { return endorserName; }
    public void setEndorserName(String endorserName) { this.endorserName = endorserName; }

    public String getEndorserEmail() { return endorserEmail; }
    public void setEndorserEmail(String endorserEmail) { this.endorserEmail = endorserEmail; }

    public String getEndorserRole() { return endorserRole; }
    public void setEndorserRole(String endorserRole) { this.endorserRole = endorserRole; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }

    public String getContext() { return context; }
    public void setContext(String context) { this.context = context; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }

    public String getSkillRatings() { return skillRatings; }
    public void setSkillRatings(String skillRatings) { this.skillRatings = skillRatings; }

    public Integer getOverallRating() { return overallRating; }
    public void setOverallRating(Integer overallRating) { this.overallRating = overallRating; }

    public Boolean getConsent() { return consent; }
    public void setConsent(Boolean consent) { this.consent = consent; }

    public Boolean getVerified() { return verified; }
    public void setVerified(Boolean verified) { this.verified = verified; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
