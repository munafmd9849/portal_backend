# Graph Report - backend  (2026-07-19)

## Corpus Check
- 232 files · ~206,200 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1560 nodes · 3768 edges · 78 communities (58 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d3a5dc2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- studentDirectoryMetricsService.js
- logger.js
- assessment.js
- adminResumeAtsService.js
- jobs.js
- aiMockInterview.js
- emailService.js
- jobOpportunitiesPipeline.js
- index.js
- mockInterview.js
- server.js
- scripts
- seed.ts
- dependencies
- students.js
- applications.js
- interviewScheduling.js
- auth.js
- superAdmin.js
- interviewSlotService.js
- globalSearchService.js
- logAction
- auth.js
- seedPlacementPipelineVerificationData.js
- googleSheetsExport.js
- csvWorker.js
- recruiterScreening.js
- endorsements.js
- academic.js
- getAdminScopeFilter
- cloudinary.js
- migratePostgresToSqlite.js
- database.js
- uploadToCloudinary
- createNotification
- sendError
- interviews.js
- recruiters.js
- seedStudentsAllCombos.js
- queries.js
- assessmentBulkImportService.js
- cmsService.js
- package.json
- placementsService.js
- authorize
- successStoryService.js
- applicationTrackerState.js
- customCalendar.js
- interviewToken.js
- adminRequests.js
- canStudentWithdrawApplication
- adminScope.js
- assessmentCleanup.js
- successStories.js
- seed-auth-users.js
- s3.js
- validation.js
- check_interviews.js
- check_targets.js
- resume.js
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
1. `authenticate()` - 41 edges
2. `scripts` - 37 edges
3. `logger` - 37 edges
4. `logAction()` - 37 edges
5. `createNotification()` - 34 edges
6. `getAdminScopeFilter()` - 30 edges
7. `sendEmail()` - 28 edges
8. `requireRole()` - 25 edges
9. `loadTemplate()` - 23 edges
10. `runMasterTest()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `createEnrollmentsForInterview()`  [EXTRACTED]
  scripts/seedAiMockInterview.js → src/utils/aiMockInterviewAssignment.js
- `testEmail()` --calls--> `sendOTP()`  [EXTRACTED]
  test-email.js → src/services/emailService.js
- `downloadTemplate()` --references--> `xlsx`  [EXTRACTED]
  src/controllers/assessmentBulkImport.js → package.json
- `sheetToRows()` --references--> `xlsx`  [EXTRACTED]
  src/controllers/assessmentBulkImport.js → package.json
- `main()` --calls--> `deleteFromCloudinary()`  [EXTRACTED]
  scripts/cleanupOrphanAssessmentCloudinary.js → src/config/cloudinary.js

## Import Cycles
- None detected.

## Communities (78 total, 20 thin omitted)

### Community 0 - "studentDirectoryMetricsService.js"
Cohesion: 0.06
Nodes (83): getStudentDetail(), getStudents(), getSummary(), buildClosedDrivesBreakdown(), buildJobPipelineCounts(), buildRecruiterOverview(), buildSchoolOverview(), buildStudentFilterWhere() (+75 more)

### Community 1 - "logger.js"
Cohesion: 0.06
Nodes (67): logger, createCalendarEvent(), deleteCalendarEvent(), disconnectCalendar(), getCalendarEvents(), getCalendarStatus(), getOAuthUrl(), IMPORTANT: Also fetch events where user is an attendee but not the organizer (+59 more)

### Community 2 - "assessment.js"
Cohesion: 0.06
Nodes (67): main(), QUESTIONS, ALL_LANGS, assessmentTitle(), buildQuestions(), CODING_QUESTIONS, createMixedAssessment(), DESCRIPTIVE_QUESTIONS (+59 more)

### Community 3 - "adminResumeAtsService.js"
Cohesion: 0.05
Nodes (59): AI_CONFIG, validateAIConfig(), listResumeAts(), scoreBatch(), scoreOne(), analyzeATSResume(), generateProjectContentEndpoint(), optimizeResumeForJob() (+51 more)

### Community 4 - "jobs.js"
Cohesion: 0.05
Nodes (57): exportApplications(), getExportStatus(), analyzeCandidates(), approveJob(), attachDrivePhase(), createJob(), creatorInclude, deleteJob() (+49 more)

### Community 5 - "aiMockInterview.js"
Cohesion: 0.06
Nodes (60): main(), QUESTIONS, buildWindow(), createGuidedInterview(), GUIDED_TEMPLATES, main(), assertEnrollmentAccess(), buildTimelineFromAnswers() (+52 more)

### Community 6 - "emailService.js"
Cohesion: 0.09
Nodes (57): __dirname, dummyAdmin, dummyApplication, dummyJob, dummyRecruiter, dummyStudent, dummyTeacher, runMasterTest() (+49 more)

### Community 7 - "jobOpportunitiesPipeline.js"
Cohesion: 0.08
Nodes (54): buildStudentWhere(), bumpBreakdown(), getActiveDrives(), getDashboardStats(), getScopeFunnelStats(), INTERVIEWED_STATUSES, isShortlisted(), PLACED_STATUSES (+46 more)

### Community 8 - "index.js"
Cohesion: 0.08
Nodes (45): evaluateTestCases(), extractCodeFromAnswer(), normalizeLanguage(), normalizeTestCases(), runCode(), RUNNERS, SUPPORTED, resolveWrappedSubmission() (+37 more)

### Community 9 - "mockInterview.js"
Cohesion: 0.10
Nodes (39): initSocket(), proctorStudentSockets, assertMockCodeSlotAccess(), assignStudentToSlot(), buildSlotsForDrive(), createMockInterviewDrive(), defaultDraftSchedule(), deleteMockInterviewDrive() (+31 more)

### Community 10 - "server.js"
Cohesion: 0.05
Nodes (37): router, router, router, router, router, router, router, router (+29 more)

### Community 11 - "scripts"
Cohesion: 0.05
Nodes (37): scripts, build, db:add-profile-data, db:add-single-student, db:baseline, db:check-qualified, db:check-screening, db:create-admin (+29 more)

### Community 12 - "seed.ts"
Cohesion: 0.09
Nodes (35): BATCHES, buildJobDescription(), CENTERS, COMPANY_NAMES, cryptoRandomToken(), EMAIL_DOMAINS, FIRST_NAMES, hashSeedToUint32() (+27 more)

### Community 13 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, better-sqlite3, bullmq, cloudinary, cors (+22 more)

### Community 14 - "students.js"
Cohesion: 0.08
Nodes (9): blockUnblockStudent(), getAllStudents(), getStudentProfile(), getStudentSkills(), isSqliteDb(), syncCodingProfiles(), updateStudentProfile(), updateUserProfilePhoto() (+1 more)

### Community 15 - "applications.js"
Cohesion: 0.13
Nodes (24): applyToJob(), buildTrackerForApplication(), computeApplicationTrackingFields(), formatStudentApplicationRecord(), getAdminJobApplicationDetail(), getAdminJobApplications(), getAllApplications(), getFinalStatus() (+16 more)

### Community 16 - "interviewScheduling.js"
Cohesion: 0.19
Nodes (25): autoCorrectSessionStatus(), configureRounds(), csvEscape(), declareResults(), endRound(), endSession(), evaluateCandidate(), exportSessionSpreadsheet() (+17 more)

### Community 17 - "auth.js"
Cohesion: 0.20
Nodes (6): authenticate(), requirePermission(), requireRole(), roles, router, router

### Community 18 - "superAdmin.js"
Cohesion: 0.17
Nodes (22): getAdminPerformanceAnalytics(), getBatchPerformance(), getCenterPerformance(), getCommonFilters(), getCompanyPerformance(), getFunnel(), getOverview(), getSchoolPerformance() (+14 more)

### Community 19 - "interviewSlotService.js"
Cohesion: 0.18
Nodes (22): assignSlot(), getEligibleApplications(), getSessionSlots(), normalizeRole(), studentJoinSlot(), updateSlotAttendance(), sendInterviewSlotScheduledEmail(), buildSlotEventTimes() (+14 more)

### Community 20 - "globalSearchService.js"
Cohesion: 0.18
Nodes (21): search(), suggest(), autocomplete(), containsFilter(), ENTITY_TYPES, globalSearch(), highlight(), normalizeQuery() (+13 more)

### Community 21 - "logAction"
Cohesion: 0.13
Nodes (13): xlsx, commitImport(), downloadTemplate(), previewImport(), rollbackImport(), sheetToRows(), upload, uploadImportFile (+5 more)

### Community 22 - "auth.js"
Cohesion: 0.19
Nodes (18): getGoogleLoginUrl(), handleGoogleLoginCallback(), redirectLoginError(), generateAccessToken(), generateRefreshToken(), verifyRefreshToken(), TODO: Send email verification, IMPORTANT: This endpoint ONLY clears refresh tokens for session management. (+10 more)

### Community 23 - "seedPlacementPipelineVerificationData.js"
Cohesion: 0.20
Nodes (19): daysFromNow(), __dirname, ensureAdmin(), ensureApplication(), ensureAssessment(), ensureAssessmentAssignment(), ensureAssessmentQuestion(), ensureInterviewRound() (+11 more)

### Community 24 - "googleSheetsExport.js"
Cohesion: 0.22
Nodes (15): getGoogleSheetsSettings(), updateGoogleSheetsSettings(), CONFIG_PATH, __dirname, getGoogleSheetsSpreadsheetId(), setGoogleSheetsSpreadsheetId(), appendSnapshotToNewTab(), escapeSheetRange() (+7 more)

### Community 25 - "csvWorker.js"
Cohesion: 0.27
Nodes (12): sendBulkEmail(), isRedisAvailable(), buildCSVString(), createWorker(), formatRoundScores(), initCsvWorker(), parseCustomAnswers(), createWorker() (+4 more)

### Community 26 - "recruiterScreening.js"
Cohesion: 0.27
Nodes (15): notifyStudentApplicationUpdate(), respondToOffer(), updateApplicationStatus(), buildScreeningSummary(), finalizeScreening(), generateScreeningToken(), getOrCreateScreeningSession(), streamResume() (+7 more)

### Community 27 - "endorsements.js"
Cohesion: 0.18
Nodes (13): adminScopeMatchesStudent(), deleteEndorsementRequest(), generateSecureToken(), getEndorsementByToken(), getEndorsementTeachers(), getStudentEndorsements(), requestEndorsement(), scopeValueMatches() (+5 more)

### Community 28 - "academic.js"
Cohesion: 0.25
Nodes (13): createBatch(), createCenter(), createSchool(), deleteBatch(), deleteCenter(), deleteSchool(), getBatches(), getCenters() (+5 more)

### Community 29 - "getAdminScopeFilter"
Cohesion: 0.31
Nodes (12): exportDirectory(), exportDirectoryToGoogleSheets(), getDirectory(), getStudentPanelData(), getStudentResumeViewUrl(), router, buildExportTabName(), DIRECTORY_EXPORT_HEADERS (+4 more)

### Community 30 - "cloudinary.js"
Cohesion: 0.21
Nodes (11): destroyAsset(), dryRun, listResources(), main(), dryRun, listAllUnderPrefix(), main(), deleteFromCloudinary() (+3 more)

### Community 31 - "migratePostgresToSqlite.js"
Cohesion: 0.24
Nodes (13): buildColumnMap(), __dirname, __filename, getPostgresColumns(), getSqliteColumns(), main(), migrateTable(), normalizeKey() (+5 more)

### Community 32 - "database.js"
Cohesion: 0.16
Nodes (6): __dirname, __filename, handleDatabaseError(), optimizedDatabaseUrl, RETRYABLE_CODES, withDbRetry()

### Community 33 - "uploadToCloudinary"
Cohesion: 0.25
Nodes (13): uploadToCloudinary(), uploadCmsMedia(), uploadStoryMedia(), createAnnouncementImageUpload(), createMouUpload(), createProfileImageUpload(), createProofDocumentUpload(), createResumeUpload() (+5 more)

### Community 34 - "createNotification"
Cohesion: 0.22
Nodes (7): getIO(), restoreApplication(), revokeApplication(), withdrawApplication(), submitContactForm(), createNotification(), syncJobApplicationsFromAssessment()

### Community 35 - "sendError"
Cohesion: 0.34
Nodes (11): getAuditLogs(), generatePublicProfileId(), getPublicProfile(), getPublicProfileSettings(), regeneratePublicProfileId(), updatePublicProfileSettings(), sendError(), sendForbidden() (+3 more)

### Community 36 - "interviews.js"
Cohesion: 0.19
Nodes (4): startInterviewSession(), validateSessionToken(), generateSessionToken(), isValidTokenFormat()

### Community 37 - "recruiters.js"
Cohesion: 0.23
Nodes (9): aggregateApplicationStats(), blockUnblockRecruiter(), getRecruiterCompanyAnalytics(), getRecruiterDashboardStats(), getRecruiterDirectory(), isManagerRecruiter(), isPostedJob(), parseBlockInfo() (+1 more)

### Community 38 - "seedStudentsAllCombos.js"
Cohesion: 0.20
Nodes (11): BATCHES, CENTERS, __dirname, ensureAcademicStructure(), __filename, FIRST_NAMES, LAST_NAMES, main() (+3 more)

### Community 39 - "queries.js"
Cohesion: 0.32
Nodes (11): buildReferenceId(), createStudentQuery(), formatQuery(), getAllQueries(), getStudentQueries(), normalizeType(), notifyAdminsAboutQuery(), parseMetadata() (+3 more)

### Community 40 - "assessmentBulkImportService.js"
Cohesion: 0.38
Nodes (11): commitImport(), createImportBatch(), getImportBatch(), listImportHistory(), normalizeType(), parseJsonSafe(), QUESTION_TYPES, rollbackImport() (+3 more)

### Community 41 - "cmsService.js"
Cohesion: 0.30
Nodes (9): getPublishedLanding(), listSections(), parseJson(), publishPage(), reorderSections(), restoreVersion(), serializeSection(), setSectionStatus() (+1 more)

### Community 42 - "package.json"
Cohesion: 0.18
Nodes (10): description, devDependencies, jest, nodemon, supertest, tsx, main, name (+2 more)

### Community 43 - "placementsService.js"
Cohesion: 0.42
Nodes (9): getPlacements(), patchPlacementCompensation(), buildStudentWhere(), formatPlacement(), listJoinedPlacements(), normalizePlacementType(), PLACEMENT_TYPES, updateJoinedPlacementCompensation() (+1 more)

### Community 44 - "authorize"
Cohesion: 0.18
Nodes (7): authorize(), router, mediaUpload, router, router, mediaUpload, router

### Community 45 - "successStoryService.js"
Cohesion: 0.36
Nodes (9): createStory(), getPublishedStories(), getStoryById(), listStories(), normalizeType(), parseJson(), serializeStory(), STORY_TYPES (+1 more)

### Community 46 - "applicationTrackerState.js"
Cohesion: 0.42
Nodes (10): buildApplicationTrackerState(), getFinalStatus(), getInitialScreeningStatusForJob(), interviewEligible(), jobRequiresPreInterviewGate(), normalizeInterviewStatus(), normalizeScreeningStatus(), REJECTED_SCREENING_STATUSES (+2 more)

### Community 47 - "customCalendar.js"
Cohesion: 0.36
Nodes (8): createCustomEvent(), deleteCustomEvent(), getCustomEvent(), getCustomEvents(), getEventColor(), respondToCustomEvent(), updateCustomEvent(), router

### Community 48 - "interviewToken.js"
Cohesion: 0.38
Nodes (8): endRoundByToken(), evaluateCandidateByToken(), getActivitiesByToken(), getCandidatesByToken(), getCandidatesForRound(), getSessionByToken(), startRoundByToken(), router

### Community 49 - "adminRequests.js"
Cohesion: 0.36
Nodes (6): approveAdminRequest(), createAdminRequest(), getAllAdminRequests(), getPendingAdminRequests(), rejectAdminRequest(), router

### Community 50 - "canStudentWithdrawApplication"
Cohesion: 0.44
Nodes (8): BLOCKED_SCREENING_ALWAYS, BLOCKED_STATUSES, canStudentWithdrawApplication(), INTERVIEW_NOT_STARTED, jobHasPreInterviewGate(), resolveInterviewStatusCode(), resolveLastRoundReached(), upper()

### Community 51 - "adminScope.js"
Cohesion: 0.36
Nodes (7): asIdList(), buildFullAccessPayload(), dimensionIsWildcard(), expandCaseVariants(), hasPermission(), resolveAdminScopeFromIds(), safeParseScope()

### Community 52 - "assessmentCleanup.js"
Cohesion: 0.48
Nodes (5): dryRun, main(), deleteAllAssessmentsWithAssets(), deleteAssessmentWithAssets(), deleteCloudinaryForAssessmentIds()

### Community 53 - "successStories.js"
Cohesion: 0.29
Nodes (3): createStory(), deleteStory(), updateStory()

### Community 54 - "seed-auth-users.js"
Cohesion: 0.40
Nodes (5): __dirname, __filename, main(), prisma, upsertUser()

### Community 55 - "s3.js"
Cohesion: 0.47
Nodes (4): deleteFromS3(), s3Client, uploadToS3(), uploadResume()

### Community 56 - "validation.js"
Cohesion: 0.40
Nodes (5): handleValidationErrors(), validateApplication, validateJob, validateStudentProfile, validateUUID()

### Community 59 - "resume.js"
Cohesion: 0.83
Nodes (3): escapeHtml(), generateResumeHTML(), generateResumePDF()

## Knowledge Gaps
- **231 isolated node(s):** `prisma`, `name`, `version`, `description`, `main` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`, `logAction`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `cloudinary` connect `dependencies` to `cloudinary.js`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `prisma`, `name`, `version` to the rest of the system?**
  _245 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `studentDirectoryMetricsService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.056669339748730285 - nodes in this community are weakly interconnected._
- **Should `logger.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06442577030812324 - nodes in this community are weakly interconnected._
- **Should `assessment.js` be split into smaller, more focused modules?**
  _Cohesion score 0.061938061938061936 - nodes in this community are weakly interconnected._