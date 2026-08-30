package com.pwioi.portal.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.DynamicInsert;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@DynamicInsert
@Table(name = "assessment_questions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AssessmentQuestion {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "assessmentId")
    private String assessmentId;

    @Column(name = "questionText")
    private String questionText;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "type")
    private String type;

    @Column(name = "options")
    private String options;

    @Column(name = "correctAnswer")
    private String correctAnswer;

    @Column(name = "points")
    private Integer points;

    @Column(name = "order")
    @com.fasterxml.jackson.annotation.JsonProperty("order")
    private Integer orderValue;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "starterCode")
    private String starterCode;

    @Column(name = "constraints")
    private String constraints;

    @Column(name = "examples")
    private String examples;

    @Column(name = "testCases")
    private String testCases;

    @Column(name = "explanation")
    private String explanation;

    @Column(name = "hints")
    private String hints;

    @Column(name = "tags")
    private String tags;

    @Column(name = "topic")
    private String topic;

    @Column(name = "category")
    private String category;

    @Column(name = "timeLimitSec")
    private Integer timeLimitSec;

    @Column(name = "language")
    private String language;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAssessmentId() { return assessmentId; }
    public void setAssessmentId(String assessmentId) { this.assessmentId = assessmentId; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getOptions() { return options; }
    public void setOptions(String options) { this.options = options; }

    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }

    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }

    public Integer getOrderValue() { return orderValue; }
    public void setOrderValue(Integer orderValue) { this.orderValue = orderValue; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getStarterCode() { return starterCode; }
    public void setStarterCode(String starterCode) { this.starterCode = starterCode; }

    public String getConstraints() { return constraints; }
    public void setConstraints(String constraints) { this.constraints = constraints; }

    public String getExamples() { return examples; }
    public void setExamples(String examples) { this.examples = examples; }

    public String getTestCases() { return testCases; }
    public void setTestCases(String testCases) { this.testCases = testCases; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public String getHints() { return hints; }
    public void setHints(String hints) { this.hints = hints; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Integer getTimeLimitSec() { return timeLimitSec; }
    public void setTimeLimitSec(Integer timeLimitSec) { this.timeLimitSec = timeLimitSec; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
