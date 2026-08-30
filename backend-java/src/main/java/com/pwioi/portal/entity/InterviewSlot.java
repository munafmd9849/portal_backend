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
@Table(name = "interview_slots")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InterviewSlot {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "sessionId")
    private String sessionId;

    @Column(name = "applicationId")
    private String applicationId;

    @Column(name = "roundId")
    private String roundId;

    @Column(name = "scheduledAt")
    private Instant scheduledAt;

    @Column(name = "room")
    private String room;

    @Column(name = "slotDeliveryMode")
    private String slotDeliveryMode;

    @Column(name = "meetingLink")
    private String meetingLink;

    @Column(name = "meetingProvider")
    private String meetingProvider;

    @Column(name = "calendarEventId")
    private String calendarEventId;

    @Column(name = "joinInstructions")
    private String joinInstructions;

    @Column(name = "autoGenerateMeet")
    private Boolean autoGenerateMeet;

    @Column(name = "studentJoinedAt")
    private Instant studentJoinedAt;

    @Column(name = "panelEmails")
    private String panelEmails;

    @Column(name = "status")
    private String status;

    @Column(name = "notes")
    private String notes;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getApplicationId() { return applicationId; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }

    public String getRoundId() { return roundId; }
    public void setRoundId(String roundId) { this.roundId = roundId; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public String getSlotDeliveryMode() { return slotDeliveryMode; }
    public void setSlotDeliveryMode(String slotDeliveryMode) { this.slotDeliveryMode = slotDeliveryMode; }

    public String getMeetingLink() { return meetingLink; }
    public void setMeetingLink(String meetingLink) { this.meetingLink = meetingLink; }

    public String getMeetingProvider() { return meetingProvider; }
    public void setMeetingProvider(String meetingProvider) { this.meetingProvider = meetingProvider; }

    public String getCalendarEventId() { return calendarEventId; }
    public void setCalendarEventId(String calendarEventId) { this.calendarEventId = calendarEventId; }

    public String getJoinInstructions() { return joinInstructions; }
    public void setJoinInstructions(String joinInstructions) { this.joinInstructions = joinInstructions; }

    public Boolean getAutoGenerateMeet() { return autoGenerateMeet; }
    public void setAutoGenerateMeet(Boolean autoGenerateMeet) { this.autoGenerateMeet = autoGenerateMeet; }

    public Instant getStudentJoinedAt() { return studentJoinedAt; }
    public void setStudentJoinedAt(Instant studentJoinedAt) { this.studentJoinedAt = studentJoinedAt; }

    public String getPanelEmails() { return panelEmails; }
    public void setPanelEmails(String panelEmails) { this.panelEmails = panelEmails; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

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
