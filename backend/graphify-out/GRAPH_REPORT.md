# Graph Report - backend  (2026-07-14)

## Corpus Check
- 183 files · ~179,932 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1209 nodes · 2903 edges · 65 communities (45 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf48a472`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- studentDirectoryMetricsService.js
- assessment.js
- emailService.js
- index.js
- interviewScheduling.js
- superAdmin.js
- mockInterview.js
- aiMockInterview.js
- students.js
- jobOpportunitiesPipeline.js
- server.js
- seed.ts
- placement.js
- scripts
- jobs.js
- dependencies
- adminStudentDirectory.js
- createNotification
- applications.js
- auth.js
- calendarServiceEnhanced.js
- database.js
- auth.js
- googleCalendar.js
- academic.js
- calendar.js
- emailWorker.js
- upload.js
- interviewToken.js
- seedStudentsAllCombos.js
- logger.js
- calendarEvents.js
- interviews.js
- queries.js
- package.json
- customCalendar.js
- jobs.js
- queues.js
- googleOAuth.js
- aiService.js
- mistralService.js
- buildApplicationTrackerState
- seed-auth-users.js
- canStudentWithdrawApplication
- endorsements.enhanced.js
- check_interviews.js
- check_targets.js
- webrtc.js
- check_admin.js
- seed-admin-scope.js
- setup-super-admin.js
- check_admin.js
- check_assessments.js
- check_slots.js
- db-check.js
- db-debug.js
- diag.js
- diag-analytics.js
- get-company.js
- seed-review-jobs.js
- update-jobs-status.js
- migrateAcademicStructure.js
- normalize-jobs.js
- test-google-ai.js
- test-profile.js

## God Nodes (most connected - your core abstractions)
1. `prisma` - 63 edges
2. `logger` - 36 edges
3. `scripts` - 35 edges
4. `authenticate()` - 33 edges
5. `createNotification()` - 28 edges
6. `sendEmail()` - 27 edges
7. `loadTemplate()` - 23 edges
8. `requireRole()` - 22 edges
9. `runMasterTest()` - 20 edges
10. `logAction()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `testEmail()` --calls--> `sendOTP()`  [EXTRACTED]
  test-email.js → src/services/emailService.js
- `createGuidedInterview()` --calls--> `createEnrollmentsForInterview()`  [EXTRACTED]
  scripts/seedBulkAiInterviews.js → src/utils/aiMockInterviewAssignment.js
- `main()` --calls--> `serializeStarterCodesForStorage()`  [EXTRACTED]
  scripts/seedCodingAssessment.js → src/coding-engine/starterCodeStorage.js
- `main()` --calls--> `serializeExamplesForStorage()`  [EXTRACTED]
  scripts/seedCodingAssessment.js → src/coding-engine/testCaseStorage.js
- `main()` --calls--> `serializeTestCasesForStorage()`  [EXTRACTED]
  scripts/seedCodingAssessment.js → src/coding-engine/testCaseStorage.js

## Import Cycles
- None detected.

## Communities (65 total, 20 thin omitted)

### Community 0 - "studentDirectoryMetricsService.js"
Cohesion: 0.06
Nodes (81): getStudentDetail(), getStudents(), getSummary(), router, buildClosedDrivesBreakdown(), buildJobPipelineCounts(), buildRecruiterOverview(), buildSchoolOverview() (+73 more)

### Community 1 - "assessment.js"
Cohesion: 0.06
Nodes (64): main(), QUESTIONS, ALL_LANGS, buildQuestions(), CODING_QUESTIONS, DESCRIPTIVE_QUESTIONS, main(), MCQ_QUESTIONS (+56 more)

### Community 2 - "emailService.js"
Cohesion: 0.10
Nodes (54): __dirname, dummyAdmin, dummyApplication, dummyJob, dummyRecruiter, dummyStudent, dummyTeacher, runMasterTest() (+46 more)

### Community 3 - "index.js"
Cohesion: 0.08
Nodes (46): evaluateTestCases(), extractCodeFromAnswer(), gradeCodingAnswer(), normalizeLanguage(), normalizeTestCases(), runCode(), RUNNERS, SUPPORTED (+38 more)

### Community 4 - "interviewScheduling.js"
Cohesion: 0.10
Nodes (44): notifyStudentApplicationUpdate(), getAuditLogs(), autoCorrectSessionStatus(), configureRounds(), csvEscape(), endRound(), endSession(), evaluateCandidate() (+36 more)

### Community 5 - "superAdmin.js"
Cohesion: 0.09
Nodes (39): getAdminPerformanceAnalytics(), getBatchPerformance(), getCenterPerformance(), getCommonFilters(), getCompanyPerformance(), getFunnel(), getOverview(), getSchoolPerformance() (+31 more)

### Community 6 - "mockInterview.js"
Cohesion: 0.10
Nodes (38): initSocket(), proctorStudentSockets, assignStudentToSlot(), buildSlotsForDrive(), createMockInterviewDrive(), defaultDraftSchedule(), deleteMockInterviewDrive(), getMockInterviewDriveResults() (+30 more)

### Community 7 - "aiMockInterview.js"
Cohesion: 0.12
Nodes (35): buildWindow(), createGuidedInterview(), GUIDED_TEMPLATES, main(), assertEnrollmentAccess(), completeAiInterview(), createAiMockInterview(), deleteAiMockInterview() (+27 more)

### Community 8 - "students.js"
Cohesion: 0.07
Nodes (16): deleteFromCloudinary(), deleteFromS3(), s3Client, uploadToS3(), deleteProfileImage(), deleteResume(), getAllStudents(), getStudentProfile() (+8 more)

### Community 9 - "jobOpportunitiesPipeline.js"
Cohesion: 0.12
Nodes (34): buildStudentWhere(), bumpBreakdown(), getActiveDrives(), getDashboardStats(), getScopeFunnelStats(), INTERVIEWED_STATUSES, isShortlisted(), PLACED_STATUSES (+26 more)

### Community 10 - "server.js"
Cohesion: 0.06
Nodes (29): router, router, router, router, router, router, router, router (+21 more)

### Community 11 - "seed.ts"
Cohesion: 0.09
Nodes (35): BATCHES, buildJobDescription(), CENTERS, COMPANY_NAMES, cryptoRandomToken(), EMAIL_DOMAINS, FIRST_NAMES, hashSeedToUint32() (+27 more)

### Community 12 - "placement.js"
Cohesion: 0.11
Nodes (25): AI_CONFIG, validateAIConfig(), placementLimiter, requestCounts, router, generateContent(), initializeGoogleAI(), generateAIContent() (+17 more)

### Community 13 - "scripts"
Cohesion: 0.06
Nodes (35): scripts, build, db:add-profile-data, db:add-single-student, db:baseline, db:check-qualified, db:check-screening, db:create-admin (+27 more)

### Community 14 - "jobs.js"
Cohesion: 0.11
Nodes (24): restoreApplication(), revokeApplication(), createJob(), creatorInclude, deleteJob(), findCompanyByNameCaseInsensitive(), getJob(), getJobs() (+16 more)

### Community 15 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, better-sqlite3, bullmq, cloudinary, cors (+21 more)

### Community 16 - "adminStudentDirectory.js"
Cohesion: 0.15
Nodes (23): exportDirectory(), exportDirectoryToGoogleSheets(), getDirectory(), getStudentPanelData(), getStudentResumeViewUrl(), router, CONFIG_PATH, __dirname (+15 more)

### Community 17 - "createNotification"
Cohesion: 0.13
Nodes (13): getIO(), approveAdminRequest(), createAdminRequest(), getAllAdminRequests(), getPendingAdminRequests(), rejectAdminRequest(), applyToJob(), submitContactForm() (+5 more)

### Community 18 - "applications.js"
Cohesion: 0.15
Nodes (18): buildTrackerForApplication(), computeApplicationTrackingFields(), formatStudentApplicationRecord(), getAdminJobApplicationDetail(), getAdminJobApplications(), getAllApplications(), getFinalStatus(), getRejectedIn() (+10 more)

### Community 19 - "auth.js"
Cohesion: 0.18
Nodes (18): getGoogleLoginUrl(), handleGoogleLoginCallback(), redirectLoginError(), generateAccessToken(), generateRefreshToken(), verifyRefreshToken(), TODO: Send email verification, IMPORTANT: This endpoint ONLY clears refresh tokens for session management. (+10 more)

### Community 20 - "calendarServiceEnhanced.js"
Cohesion: 0.28
Nodes (16): createEventController(), deleteEventController(), getEventDetails(), getEvents(), respondToEventController(), updateEventController(), router, createEvent() (+8 more)

### Community 21 - "database.js"
Cohesion: 0.16
Nodes (9): __dirname, __filename, optimizedDatabaseUrl, prisma, escapeHtml(), generateResumeHTML(), generateResumePDF(), calculateMatchScore() (+1 more)

### Community 22 - "auth.js"
Cohesion: 0.28
Nodes (3): authenticate(), requireRole(), router

### Community 23 - "googleCalendar.js"
Cohesion: 0.27
Nodes (14): getCalendarEvents(), getCalendarStatus(), getOAuthUrl(), handleOAuthCallback(), IMPORTANT: Calendar tokens persist in the database across logout/login cycles., sendOAuthResponse(), router, exchangeCodeForTokens() (+6 more)

### Community 24 - "academic.js"
Cohesion: 0.23
Nodes (14): createBatch(), createCenter(), createSchool(), deleteBatch(), deleteCenter(), deleteSchool(), getBatches(), getCenters() (+6 more)

### Community 25 - "calendar.js"
Cohesion: 0.25
Nodes (13): createCalendarEvent(), deleteCalendarEvent(), disconnectCalendar(), getCalendarEvents(), getCalendarStatus(), getOAuthUrl(), IMPORTANT: Also fetch events where user is an attendee but not the organizer, respondToCalendarEvent() (+5 more)

### Community 26 - "emailWorker.js"
Cohesion: 0.31
Nodes (10): sendBulkEmail(), isRedisAvailable(), buildCSVString(), createWorker(), initCsvWorker(), createWorker(), initEmailWorker(), startWorkers() (+2 more)

### Community 27 - "upload.js"
Cohesion: 0.27
Nodes (12): uploadToCloudinary(), createAnnouncementImageUpload(), createMouUpload(), createProfileImageUpload(), createProofDocumentUpload(), createResumeUpload(), uploadAnnouncementImage(), uploadMouDocument() (+4 more)

### Community 28 - "interviewToken.js"
Cohesion: 0.26
Nodes (10): endRoundByToken(), evaluateCandidateByToken(), getActivitiesByToken(), getCandidatesByToken(), getCandidatesForRound(), getSessionByToken(), startRoundByToken(), validateSessionToken() (+2 more)

### Community 29 - "seedStudentsAllCombos.js"
Cohesion: 0.20
Nodes (11): BATCHES, CENTERS, __dirname, ensureAcademicStructure(), __filename, FIRST_NAMES, LAST_NAMES, main() (+3 more)

### Community 30 - "logger.js"
Cohesion: 0.26
Nodes (6): logger, createAnnouncement(), parseTargeting(), handleOAuthCallback(), parseDuckDuckGoResults(), searchWeb()

### Community 31 - "calendarEvents.js"
Cohesion: 0.41
Nodes (10): createAdminEventController(), createRecruiterEventController(), createRecruiterSelfEventController(), createStudentEventController(), createAdminToStudentsEvent(), createRecruiterSelfEvent(), createRecruiterToStudentEvent(), createStudentSelfEvent() (+2 more)

### Community 32 - "interviews.js"
Cohesion: 0.30
Nodes (10): endInterviewSession(), evaluateCandidate(), getInterviewActivities(), getInterviewSession(), getRoundCandidates(), startAssessment(), startInterviewSession(), updateInterviewRound() (+2 more)

### Community 33 - "queries.js"
Cohesion: 0.32
Nodes (11): buildReferenceId(), createStudentQuery(), formatQuery(), getAllQueries(), getStudentQueries(), normalizeType(), notifyAdminsAboutQuery(), parseMetadata() (+3 more)

### Community 34 - "package.json"
Cohesion: 0.18
Nodes (10): description, devDependencies, jest, nodemon, supertest, tsx, main, name (+2 more)

### Community 35 - "customCalendar.js"
Cohesion: 0.36
Nodes (8): createCustomEvent(), deleteCustomEvent(), getCustomEvent(), getCustomEvents(), getEventColor(), respondToCustomEvent(), updateCustomEvent(), router

### Community 36 - "jobs.js"
Cohesion: 0.24
Nodes (8): requirePermission(), handleValidationErrors(), validateApplication, validateJob, validateStudentProfile, validateUUID(), router, hasPermission()

### Community 37 - "queues.js"
Cohesion: 0.28
Nodes (8): exportApplications(), getExportStatus(), addCsvExportJob(), addEmailToQueue(), emailNotificationQueue, getCsvExportsQueue(), getEmailNotificationQueue(), jobDistributionQueue

### Community 38 - "googleOAuth.js"
Cohesion: 0.42
Nodes (7): checkCalendarStatus(), disconnectCalendar(), getGoogleOAuthUrl(), handleGoogleCallback(), initGoogleOAuth(), router, generateOAuthUrl()

### Community 39 - "aiService.js"
Cohesion: 0.36
Nodes (8): analyzeATSResume(), generateProjectContentEndpoint(), analyzeATSResume(), generateATSFallback(), generateBulletsFallback(), generateFallback(), generateProjectContent(), generateSummaryFallback()

### Community 40 - "mistralService.js"
Cohesion: 0.39
Nodes (7): optimizeResumeForJob(), arr(), callMistralJSON(), clampInt(), getClient(), optimizeResumeForJob(), scoreATSWithJob()

### Community 41 - "buildApplicationTrackerState"
Cohesion: 0.54
Nodes (7): buildApplicationTrackerState(), getFinalStatus(), interviewEligible(), normalizeInterviewStatus(), normalizeScreeningStatus(), screeningPhaseComplete(), variantForPrimary()

### Community 42 - "seed-auth-users.js"
Cohesion: 0.40
Nodes (5): __dirname, __filename, main(), prisma, upsertUser()

### Community 43 - "canStudentWithdrawApplication"
Cohesion: 0.53
Nodes (5): withdrawApplication(), BLOCKED_SCREENING, BLOCKED_STATUSES, canStudentWithdrawApplication(), upper()

### Community 44 - "endorsements.enhanced.js"
Cohesion: 0.53
Nodes (4): extractAndLogToken(), findTokenInDatabase(), getEndorsementByToken(), validateTokenStatus()

## Knowledge Gaps
- **206 isolated node(s):** `prisma`, `name`, `version`, `description`, `main` (+201 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `database.js` to `studentDirectoryMetricsService.js`, `assessment.js`, `emailService.js`, `interviewScheduling.js`, `superAdmin.js`, `aiMockInterview.js`, `students.js`, `jobOpportunitiesPipeline.js`, `server.js`, `jobs.js`, `adminStudentDirectory.js`, `createNotification`, `applications.js`, `auth.js`, `calendarServiceEnhanced.js`, `auth.js`, `googleCalendar.js`, `academic.js`, `calendar.js`, `emailWorker.js`, `upload.js`, `interviewToken.js`, `logger.js`, `calendarEvents.js`, `interviews.js`, `queries.js`, `customCalendar.js`, `googleOAuth.js`, `endorsements.enhanced.js`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `cloudinary` connect `dependencies` to `assessment.js`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `prisma`, `name`, `version` to the rest of the system?**
  _219 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `studentDirectoryMetricsService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `assessment.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06385964912280702 - nodes in this community are weakly interconnected._
- **Should `emailService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10153358011634056 - nodes in this community are weakly interconnected._