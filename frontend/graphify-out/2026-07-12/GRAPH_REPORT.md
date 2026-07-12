# Graph Report - frontend  (2026-07-12)

## Corpus Check
- 279 files · ~1,545,543 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1866 nodes · 3884 edges · 114 communities (81 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aed7f8fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- vision_wasm_internal.js
- vision_wasm_nosimd_internal.js
- AdminAssessments.jsx
- ResumeBuilder.jsx
- MockInterviewManagement.jsx
- CreateJob.jsx
- ProctoringEngine
- useToast
- AdminHome.jsx
- dependencies
- api
- useAuth
- App.jsx
- AdminDashboard.jsx
- CustomResumeBuilder.jsx
- Notifications.jsx
- JobPostingsManager.jsx
- SuperAdminDashboard.jsx
- StudentDirectory.jsx
- getJob
- StudentDashboard.jsx
- vision_wasm_module_internal.js
- ConnectGoogleCalendar.jsx
- RecruiterDirectory.jsx
- applicationTrackerState.js
- LiveMockInterviewsStudent.jsx
- devDependencies
- abort
- abort
- JobDescriptionPage.jsx
- JobContent.jsx
- AdminAssessmentResults.jsx
- api.js
- academicOptions.js
- resumes.js
- ExceptionInfo
- ExceptionInfo
- AdminPanel.jsx
- StudentDirectoryTable.jsx
- emailNotifications.js
- WhyPw.jsx
- users.js
- PDFGenerator
- CustomDropdown.jsx
- Query.jsx
- PlacementAnalytics.jsx
- package.json
- Header.jsx
- resumeStorage.js
- RecruiterDirectoryTable.jsx
- DevTeam.jsx
- DashboardLayout.jsx
- CareerService.jsx
- MockInterviewResultBody.jsx
- resumeEnhancer.js
- ProfileCard.jsx
- Records.jsx
- PDFPreviewErrorBoundary
- makeEntry
- makeEntry
- applicationCleanup.js
- notificationActions.js
- applicationWithdraw.js
- PlacementTimeline.jsx
- react
- makeBlendState
- makeVertexAttributes
- makeBlendState
- makeVertexAttributes
- EndorsementManagement.jsx
- stats.jsx
- OurPartners.jsx
- ___syscall_ioctl
- makeColorAttachments
- ___syscall_ioctl
- makeColorAttachments
- AiInterviewResultBody.jsx
- write
- write
- vite.config.js
- close
- convertReturnValue
- ExitStatus
- fromWireType
- get_char
- getFullscreenElement
- init
- lookupPath
- makeDepthStencilState
- mount
- preRun
- registerType
- statfs
- close
- convertReturnValue
- ExitStatus
- fromWireType
- get_char
- getFullscreenElement
- init
- lookupPath
- makeDepthStencilState
- mount
- preRun
- registerType
- statfs
- subscribeToApplications

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 111 edges
2. `api` - 97 edges
3. `useToast()` - 71 edges
4. `ProctoringEngine` - 36 edges
5. `StudentDashboard()` - 31 edges
6. `showError()` - 29 edges
7. `AssessmentApp()` - 22 edges
8. `getStudentProfile()` - 22 edges
9. `CreateJob()` - 21 edges
10. `CustomDropdown()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `CompanyFilterDropdown()` --references--> `react`  [EXTRACTED]
  src/components/dashboard/admin/AdminApplicantsHub.jsx → package.json
- `PDFUploader()` --references--> `react`  [EXTRACTED]
  src/components/dashboard/admin/PDFUploader.jsx → package.json
- `RecruiterDirectory()` --references--> `react`  [EXTRACTED]
  src/components/dashboard/admin/RecruiterDirectory.jsx → package.json
- `EditCGPAModal()` --references--> `react`  [EXTRACTED]
  src/components/dashboard/admin/StudentDirectory.jsx → package.json
- `StudentDashboardPanel()` --references--> `react`  [EXTRACTED]
  src/components/dashboard/admin/StudentDirectory.jsx → package.json

## Import Cycles
- None detected.

## Communities (114 total, 33 thin omitted)

### Community 0 - "vision_wasm_internal.js"
Cohesion: 0.01
Nodes (18): EmscriptenEH, EmscriptenSjLj, RFC-2279, RFC-3629, NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),, NOTE: This is also used as the process return code in shell environments, TODO: check for O_SEARCH? (== search for dir only), NOTE: None of the defaults here are true. We're just returning safe and (+10 more)

### Community 1 - "vision_wasm_nosimd_internal.js"
Cohesion: 0.01
Nodes (18): EmscriptenEH, EmscriptenSjLj, RFC-2279, RFC-3629, NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),, NOTE: This is also used as the process return code in shell environments, TODO: check for O_SEARCH? (== search for dir only), NOTE: None of the defaults here are true. We're just returning safe and (+10 more)

### Community 2 - "AdminAssessments.jsx"
Cohesion: 0.05
Nodes (75): xlsx, evaluateCode(), runCode(), CodingWorkspace(), CODING_LANGUAGES, DEFAULT_STARTERS, parseCodingAnswer(), serializeCodingAnswer() (+67 more)

### Community 3 - "ResumeBuilder.jsx"
Cohesion: 0.06
Nodes (54): ErrorBoundary, StudentDetailsModal(), StudentDetailsModal(), Achievements(), mergeAchievementsAndCertifications(), DashboardHome(), IMPORTANT: Production behavior — no fallback datasets., DashboardStatsSection() (+46 more)

### Community 4 - "MockInterviewManagement.jsx"
Cohesion: 0.08
Nodes (40): CATEGORIES, MockInterviewEditDriveModal(), MockInterviewTechBoard(), AuthContext, AuthProvider(), TODO: Implement email verification, StudentDashboard(), useApplyToJob() (+32 more)

### Community 5 - "CreateJob.jsx"
Cohesion: 0.07
Nodes (40): ResetPasswordForm(), ThankYouPopup(), CreateJob(), DRIVE_VENUES, toDDMMYYYY(), toISOFromDDMMYYYY(), toRoman(), EXCEL_TEMPLATE (+32 more)

### Community 6 - "ProctoringEngine"
Cohesion: 0.08
Nodes (19): ProctoringConsole(), useInterviewSpeech(), AiMockInterviewSession(), PHASE, defaultProctoringConfig, EVENT_SCREENSHOT_VIOLATIONS, ProctoringViolationType, ScreenshotCaptureType (+11 more)

### Community 7 - "useToast"
Cohesion: 0.07
Nodes (26): AcademicStructureManager(), AdminApplicantsHub(), formatDriveDate(), getCompanyTheme(), groupJobsByCompany(), AdminJobApplications(), FINAL_STATUS_OPTIONS, STAGE_OPTIONS (+18 more)

### Community 8 - "AdminHome.jsx"
Cohesion: 0.08
Nodes (34): AdminHome(), TODO: Replace Firebase operations with API calls, CreateDisableAdmins(), CrManagerCard(), STATUS_BADGE, VALUE_COLORS, FunnelStatCard(), STAGE_TONES (+26 more)

### Community 9 - "dependencies"
Cohesion: 0.05
Nodes (44): dependencies, ag-charts-react, chart.js, clsx, date-fns, @fortawesome/free-brands-svg-icons, @fortawesome/free-solid-svg-icons, @fortawesome/react-fontawesome (+36 more)

### Community 10 - "api"
Cohesion: 0.10
Nodes (26): AdminJobDetail(), CandidateAnalysisModal(), ManageJobs(), ScheduleInterview(), StudentSelectorModal(), EndorsementCard(), Endorsements(), parseRelatedSkills() (+18 more)

### Community 11 - "useAuth"
Cohesion: 0.12
Nodes (19): EmailVerificationModal(), LoginForm(), RegisterForm(), AuthRedirect(), AdminProfile(), RecruiterProfile(), AboutMe(), ExperienceSection() (+11 more)

### Community 12 - "App.jsx"
Cohesion: 0.09
Nodes (18): App(), AppContent(), faqData, PlacementFAQ(), PWIOIFooter(), TestimonialSection(), Preloader(), NotificationModal() (+10 more)

### Community 13 - "AdminDashboard.jsx"
Cohesion: 0.09
Nodes (19): AdminAnnouncements(), AdminJobApplicationDetail(), AuditLogs(), ROLE_COLORS, SuperAdminStats(), AdminLayout(), AdminMobileMenuContext, safeDefault (+11 more)

### Community 14 - "CustomResumeBuilder.jsx"
Cohesion: 0.09
Nodes (14): CustomResumeBuilder(), DEFAULT_RESUME_DATA, SECTION_ICONS, SECTION_TYPES, ResumePreview(), TEMPLATES, EducationForm(), ExperienceForm() (+6 more)

### Community 15 - "Notifications.jsx"
Cohesion: 0.16
Nodes (19): NOTIFICATION_TYPES, Notifications(), PRIORITY_LEVELS, deleteNotification(), listNotificationsForUser(), markNotificationAsRead, subscribeToNotifications(), transformNotification() (+11 more)

### Community 16 - "JobPostingsManager.jsx"
Cohesion: 0.19
Nodes (17): JobDetailsModal(), JobInfoDisplay(), JobPostingsManager(), analyticsSubscribers, applyFilters(), approveJob(), archiveJob(), autoArchiveExpiredJobs() (+9 more)

### Community 17 - "SuperAdminDashboard.jsx"
Cohesion: 0.18
Nodes (14): InterviewScheduling(), HelpSupport(), TODO: Replace with actual API calls, RecruiterCalendar(), RecruiterDashboard(), SuperAdminDashboard(), RecruiterDashboard(), BADGE_STYLES (+6 more)

### Community 18 - "StudentDirectory.jsx"
Cohesion: 0.15
Nodes (17): formatPlacementMetricDisplay(), formatResumeFileSize(), normalizePlacementMetric(), PROBABILITY_TIER_LABELS, TODO: Replace Firebase operations with API calls, READINESS_TIER_LABELS, READINESS_TIER_OPTIONS, STATUS_OPTIONS (+9 more)

### Community 19 - "getJob"
Cohesion: 0.15
Nodes (17): defaultInterviewTimeline, getRoundIcon(), JobDescription(), roundColors, JobContent, JobDescriptionModal(), JobDescriptionSkeleton(), JobContent (+9 more)

### Community 20 - "StudentDashboard.jsx"
Cohesion: 0.19
Nodes (15): PlacementResources(), isValidProfileUrl(), normalizeProfileSnapshot(), StudentDashboard(), getStudentApplications(), getStudentInterviewHistory(), TODO: Backend needs GET /api/applications/:applicationId endpoint, subscribeStudentApplications() (+7 more)

### Community 21 - "vision_wasm_module_internal.js"
Cohesion: 0.11
Nodes (18): hardware_concurrency(), RFC-2279, RFC-3629, ModuleFactory(), NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),, NOTE: This is also used as the process return code in shell environments, TODO: check for O_SEARCH? (== search for dir only), NOTE: None of the defaults here are true. We're just returning safe and (+10 more)

### Community 22 - "ConnectGoogleCalendar.jsx"
Cohesion: 0.12
Nodes (25): CustomCalendar(), DirectoryLoadingPanel(), MockInterviewCreate(), aiIsActive(), aiIsPast(), aiIsUpcoming(), driveHasLiveSlots(), driveIsActive() (+17 more)

### Community 23 - "RecruiterDirectory.jsx"
Cohesion: 0.26
Nodes (9): JobDescriptionModal(), RecruiterDirectory(), blockRecruiter(), blockUnblockRecruiter(), getRecruiterHistory(), getRecruiterJobs(), getRecruiterSummary(), sendEmailToRecruiter() (+1 more)

### Community 24 - "applicationTrackerState.js"
Cohesion: 0.28
Nodes (11): ApplicationTrackerSection(), formatDate(), StudentApplicationTracker(), getApplicationPrimaryLabel(), getApplicationPrimaryStatus(), getApplicationTimeline(), getApplicationTrackerDetails(), getPrimaryStatusBadgeClass() (+3 more)

### Community 25 - "LiveMockInterviewsStudent.jsx"
Cohesion: 0.23
Nodes (12): GuidedAiInterviewsStudent(), FEEDBACK_RATING_FIELDS, feedbackScorePercent(), getAiEnrollmentStatusBadge(), LoadingBlock(), PageHeader(), PageShell(), STAT_ICON_BOX (+4 more)

### Community 26 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+7 more)

### Community 27 - "abort"
Cohesion: 0.13
Nodes (15): abort(), assert(), createLazyFile(), createWasm(), findWasmBinary(), forceLoadFile(), getBinarySync(), getMouseWheelDelta() (+7 more)

### Community 28 - "abort"
Cohesion: 0.13
Nodes (15): abort(), assert(), createLazyFile(), createWasm(), findWasmBinary(), forceLoadFile(), getBinarySync(), getMouseWheelDelta() (+7 more)

### Community 29 - "JobDescriptionPage.jsx"
Cohesion: 0.29
Nodes (10): JobApplyQuestionsModal(), isDeadlinePassed(), JobContent, JobDescriptionPage(), meetsCgpaRequirement(), meetsYopRequirement(), JobDetail(), applyToJob() (+2 more)

### Community 30 - "JobContent.jsx"
Cohesion: 0.13
Nodes (9): JD_STAT_TONES, JobContent, OverviewTab, PROCESS_STEP_TONES, ProcessTab, IMPORTANT:, RequirementsTab, roundColors (+1 more)

### Community 31 - "AdminAssessmentResults.jsx"
Cohesion: 0.29
Nodes (13): AdminAssessmentResultsComponent(), computeAssessmentStats(), computeSessionPercentiles(), formatSessionDate(), formatSessionStatus(), formatSessionTime(), normalizeSessionStatus(), summarizeViolations() (+5 more)

### Community 32 - "api.js"
Cohesion: 0.23
Nodes (11): apiRequest(), clearAuthTokens(), getAuthToken(), getRefreshToken(), getToastUtils(), NOTE: URLSearchParams will stringify `undefined` as "undefined" if you pass it d, refreshAccessToken(), setAuthTokens() (+3 more)

### Community 33 - "academicOptions.js"
Cohesion: 0.44
Nodes (10): RecruiterAnalytics(), useAcademicOptions(), batchStorageValue(), buildDropdownAcademicOptions(), buildManageJobsFilterOptions(), buildStandardFilterOptions(), centerStorageValue(), fetchAcademicOptions() (+2 more)

### Community 34 - "resumes.js"
Cohesion: 0.21
Nodes (10): ResumeSplitView(), ensureResumeDoc(), TODO: Replace with API call, TODO: Replace with Socket.IO subscription, TODO: Replace with API call, TODO: Replace all functions with API calls to backend, TODO: Replace with API call to get resume data, TODO: Remove - not needed with API (+2 more)

### Community 37 - "AdminPanel.jsx"
Cohesion: 0.31
Nodes (9): AdminPanel(), TODO: Replace Firebase operations with API calls, buildMonthlyTrendChart(), buildPlacementStatusChart(), downloadDataCSV(), exportReportCSV(), getAdminPanelData(), safeArray() (+1 more)

### Community 38 - "StudentDirectoryTable.jsx"
Cohesion: 0.21
Nodes (10): BADGE_STYLES, BASIC_COLUMNS, cellContent(), displayMock(), formatSrNo(), headerClass(), METRIC_TEXT, MOCK_INTERVIEW_COLUMN (+2 more)

### Community 39 - "emailNotifications.js"
Cohesion: 0.21
Nodes (8): Unsubscribe(), TODO: Backend handles this automatically when job is posted, TODO: Replace with API call, TODO: Replace with API call, TODO: Replace with API call, TODO: Replace with API call, resubscribeUser(), unsubscribeUser()

### Community 40 - "WhyPw.jsx"
Cohesion: 0.24
Nodes (6): HealthcareSkills(), HiringBet(), ManagementSkills(), PillNav(), SkillsDisplay(), WhyPw()

### Community 41 - "users.js"
Cohesion: 0.24
Nodes (9): AdminPanel(), getUser(), listUsersByRole(), TODO: Replace with admin API call, TODO: Replace with admin API call, TODO: Replace with API call, TODO: Replace all functions with API calls to backend, TODO: Replace with: api.getCurrentUser() or admin API (+1 more)

### Community 43 - "CustomDropdown.jsx"
Cohesion: 0.27
Nodes (7): BASE_LOCATION_OPTIONS, EventCreationModal(), BlockModal(), formatBlockDate(), CustomDropdown(), EndorsementPage(), getAllStudents()

### Community 44 - "Query.jsx"
Cohesion: 0.22
Nodes (4): QueryErrorBoundary, QueryWithErrorBoundary(), StudentQuerySystem(), getTargetedJobsForStudent()

### Community 45 - "PlacementAnalytics.jsx"
Cohesion: 0.29
Nodes (5): PlacementAnalytics(), VALUE_COLORS, buildQuery(), fetchPlacementSummary(), fetchStudentsWithScores()

### Community 46 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 47 - "Header.jsx"
Cohesion: 0.29
Nodes (5): Banner(), Header(), Login(), ScribbledText(), TypeWriter()

### Community 48 - "resumeStorage.js"
Cohesion: 0.20
Nodes (5): TODO: Replace with API call, TODO: Replace with API call, TODO: Replace with API call to get student profile (includes resume info), TODO: Replace all functions with API calls to backend (S3 upload), TODO: Replace with: api.uploadResume(file, onProgress)

### Community 49 - "RecruiterDirectoryTable.jsx"
Cohesion: 0.31
Nodes (6): cellContent(), formatSrNo(), getInitials(), RecruiterDirectoryTable(), SCROLL_COLUMNS, STATUS_BADGE_STYLES

### Community 50 - "DevTeam.jsx"
Cohesion: 0.22
Nodes (5): devLayout, devs, MeetDevTeamPage(), mentorLayout, mentors

### Community 51 - "DashboardLayout.jsx"
Cohesion: 0.36
Nodes (5): DashboardLayout(), formatCgpaDisplay(), safeDefault, StudentMobileMenuContext, useStudentMobileMenu()

### Community 52 - "CareerService.jsx"
Cohesion: 0.32
Nodes (3): AdminSlider(), springValues, TiltedCard()

### Community 53 - "MockInterviewResultBody.jsx"
Cohesion: 0.32
Nodes (4): DIMENSION_STYLES, MockInterviewRatingsGrid(), formatDuration(), MockInterviewResultBody()

### Community 54 - "resumeEnhancer.js"
Cohesion: 0.25
Nodes (4): TODO: Replace with API call, TODO: Replace with API call, TODO: Replace all functions with API calls to backend, TODO: Replace with API call

### Community 55 - "ProfileCard.jsx"
Cohesion: 0.38
Nodes (5): adjust(), ANIMATION_CONFIG, clamp(), ProfileCard, ProfileCardComponent()

### Community 56 - "Records.jsx"
Cohesion: 0.38
Nodes (5): ProfileCardBrutalist(), BATCHES, PlacementRecords(), STUDENT_RECORDS, TESTIMONIALS

### Community 58 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 59 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 60 - "applicationCleanup.js"
Cohesion: 0.33
Nodes (3): TODO: Replace with admin API call, TODO: Replace all functions with API calls to backend, TODO: Replace with admin API call

### Community 62 - "applicationWithdraw.js"
Cohesion: 0.60
Nodes (5): BLOCKED_SCREENING, BLOCKED_STATUSES, canStudentWithdrawApplication(), isActiveApplication(), upper()

### Community 63 - "PlacementTimeline.jsx"
Cohesion: 0.50
Nodes (3): gsap, SidebarCard(), TimelineWithSidebar()

### Community 64 - "react"
Cohesion: 0.40
Nodes (5): react, CompanyFilterDropdown(), EditCGPAModal(), Toast(), StudentDashboardPanel()

### Community 65 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 66 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 67 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 68 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 69 - "EndorsementManagement.jsx"
Cohesion: 0.80
Nodes (4): EndorsementManagement(), nameFromEmail(), normalizeEndorsement(), resolveTeacherChoice()

### Community 70 - "stats.jsx"
Cohesion: 0.50
Nodes (3): GlareHover(), PlacementStats(), stats

### Community 71 - "OurPartners.jsx"
Cohesion: 0.50
Nodes (4): CHANGE_ROW2_NAMES(), ORIGINAL_PARTNERS1, ORIGINAL_PARTNERS2, OurPartners()

### Community 72 - "___syscall_ioctl"
Cohesion: 0.50
Nodes (4): ioctl_tcgets(), ioctl_tcsets(), ioctl_tiocgwinsz(), ___syscall_ioctl()

### Community 73 - "makeColorAttachments"
Cohesion: 0.50
Nodes (4): makeColorAttachment(), makeColorAttachments(), makeDepthStencilAttachment(), makeRenderPassDescriptor()

### Community 74 - "___syscall_ioctl"
Cohesion: 0.50
Nodes (4): ioctl_tcgets(), ioctl_tcsets(), ioctl_tiocgwinsz(), ___syscall_ioctl()

### Community 75 - "makeColorAttachments"
Cohesion: 0.50
Nodes (4): makeColorAttachment(), makeColorAttachments(), makeDepthStencilAttachment(), makeRenderPassDescriptor()

### Community 76 - "AiInterviewResultBody.jsx"
Cohesion: 0.67
Nodes (3): AiInterviewResultBody(), formatDuration(), SCORE_FIELDS

### Community 77 - "write"
Cohesion: 0.67
Nodes (3): msync(), put_char(), write()

### Community 78 - "write"
Cohesion: 0.67
Nodes (3): msync(), put_char(), write()

## Knowledge Gaps
- **163 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+158 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api` connect `api` to `AdminAssessments.jsx`, `ResumeBuilder.jsx`, `MockInterviewManagement.jsx`, `CreateJob.jsx`, `ProctoringEngine`, `useToast`, `AdminHome.jsx`, `useAuth`, `App.jsx`, `AdminDashboard.jsx`, `CustomResumeBuilder.jsx`, `Notifications.jsx`, `JobPostingsManager.jsx`, `SuperAdminDashboard.jsx`, `StudentDirectory.jsx`, `StudentDashboard.jsx`, `ConnectGoogleCalendar.jsx`, `RecruiterDirectory.jsx`, `LiveMockInterviewsStudent.jsx`, `JobDescriptionPage.jsx`, `AdminAssessmentResults.jsx`, `api.js`, `academicOptions.js`, `AdminPanel.jsx`, `emailNotifications.js`, `CustomDropdown.jsx`, `PlacementAnalytics.jsx`, `DashboardLayout.jsx`, `EndorsementManagement.jsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `ResumeBuilder.jsx`, `MockInterviewManagement.jsx`, `CreateJob.jsx`, `useToast`, `AdminHome.jsx`, `api`, `App.jsx`, `AdminDashboard.jsx`, `Notifications.jsx`, `JobPostingsManager.jsx`, `SuperAdminDashboard.jsx`, `StudentDirectory.jsx`, `StudentDashboard.jsx`, `ConnectGoogleCalendar.jsx`, `RecruiterDirectory.jsx`, `JobDescriptionPage.jsx`, `academicOptions.js`, `AdminPanel.jsx`, `Query.jsx`, `DashboardLayout.jsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `react`, `AdminAssessments.jsx`, `package.json`, `PlacementTimeline.jsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _256 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `vision_wasm_internal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.009852216748768473 - nodes in this community are weakly interconnected._
- **Should `vision_wasm_nosimd_internal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.009852216748768473 - nodes in this community are weakly interconnected._
- **Should `AdminAssessments.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0537714712471994 - nodes in this community are weakly interconnected._