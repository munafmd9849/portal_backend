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
@Table(name = "mock_interview_slots")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MockInterviewSlot {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "driveId")
    private String driveId;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "interviewerId")
    private String interviewerId;

    @Column(name = "startTime")
    private Instant startTime;

    @Column(name = "endTime")
    private Instant endTime;

    @Column(name = "status")
    private String status;

    @Column(name = "meetingRoomId", unique = true)
    private String meetingRoomId;

    @Column(name = "joinLink")
    private String joinLink;

    @Column(name = "liveCode")
    private String liveCode;

    @Column(name = "liveCodeLanguage")
    private String liveCodeLanguage;

    @Column(name = "activeQuestionId")
    private String activeQuestionId;

    @Column(name = "extraQuestions")
    private String extraQuestions;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDriveId() { return driveId; }
    public void setDriveId(String driveId) { this.driveId = driveId; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getInterviewerId() { return interviewerId; }
    public void setInterviewerId(String interviewerId) { this.interviewerId = interviewerId; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }

    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMeetingRoomId() { return meetingRoomId; }
    public void setMeetingRoomId(String meetingRoomId) { this.meetingRoomId = meetingRoomId; }

    public String getJoinLink() { return joinLink; }
    public void setJoinLink(String joinLink) { this.joinLink = joinLink; }

    public String getLiveCode() { return liveCode; }
    public void setLiveCode(String liveCode) { this.liveCode = liveCode; }

    public String getLiveCodeLanguage() { return liveCodeLanguage; }
    public void setLiveCodeLanguage(String liveCodeLanguage) { this.liveCodeLanguage = liveCodeLanguage; }

    public String getActiveQuestionId() { return activeQuestionId; }
    public void setActiveQuestionId(String activeQuestionId) { this.activeQuestionId = activeQuestionId; }

    public String getExtraQuestions() { return extraQuestions; }
    public void setExtraQuestions(String extraQuestions) { this.extraQuestions = extraQuestions; }

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
