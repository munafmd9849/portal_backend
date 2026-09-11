import { rankCandidatesForJob } from '../src/services/recommendationService.js';
import { computeDrivePhase, getDrivePhaseLabel } from '../src/services/drivePhaseService.js';
import { validateStudentEligibilityForApply } from '../src/utils/jobEligibility.js';
import { validateScreeningTransition, validateStatusTransition } from '../src/services/applicationTransitionService.js';
import { getPlacementPolicyConfig } from '../src/services/placementPolicyService.js';

describe('jobs controller dependencies', () => {
  test('rankCandidatesForJob is exported', () => {
    expect(typeof rankCandidatesForJob).toBe('function');
  });
});

describe('drivePhaseService', () => {
  test('posted job before deadline is APPLICATIONS_OPEN', () => {
    const phase = computeDrivePhase({
      status: 'POSTED',
      isPosted: true,
      applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(phase).toBe('APPLICATIONS_OPEN');
    expect(getDrivePhaseLabel(phase)).toBe('Applications open');
  });

  test('results lock yields RESULTS_DECLARED', () => {
    expect(computeDrivePhase({ resultsLocked: true, status: 'POSTED' })).toBe('RESULTS_DECLARED');
  });
});

describe('jobEligibility', () => {
  test('blocks incomplete profile on apply', () => {
    const result = validateStudentEligibilityForApply(
      { fullName: 'A', email: 'a@test.com' },
      { minCgpa: '7' },
    );
    expect(result?.body?.error).toBe('Profile incomplete');
  });

  test('single YOP stays a cutoff for existing jobs', () => {
    const student = {
      fullName: 'A', email: 'a@test.com', school: 'S', center: 'C', batch: '23-27',
    };
    expect(validateStudentEligibilityForApply(student, { yop: '2028' })).toBeNull();
    expect(validateStudentEligibilityForApply(student, { yop: '2026' })?.body?.error).toBe('YOP requirement not met');
  });

  test('multiple YOP years match only selected batches', () => {
    const eligible = {
      fullName: 'A', email: 'a@test.com', school: 'S', center: 'C', batch: '24-28',
    };
    const skipped = {
      fullName: 'B', email: 'b@test.com', school: 'S', center: 'C', batch: '23-27',
    };
    expect(validateStudentEligibilityForApply(eligible, { yop: '2026,2028' })).toBeNull();
    expect(validateStudentEligibilityForApply(skipped, { yop: '2026,2028' })?.body?.error).toBe('YOP requirement not met');
  });
});

describe('applicationTransitionService', () => {
  test('allows APPLIED to INTERVIEW_ELIGIBLE', () => {
    expect(() => validateScreeningTransition('APPLIED', 'INTERVIEW_ELIGIBLE')).not.toThrow();
  });

  test('blocks invalid screening jump', () => {
    expect(() => validateScreeningTransition('SCREENING_REJECTED', 'INTERVIEW_ELIGIBLE')).toThrow();
  });

  test('blocks APPLIED to JOINED status jump', () => {
    expect(() => validateStatusTransition('APPLIED', 'JOINED')).toThrow(/Invalid status transition/i);
  });

  test('allows offer status update', () => {
    expect(() => validateStatusTransition('SELECTED', 'OFFERED')).not.toThrow();
  });
});

describe('placementPolicyService', () => {
  test('exports dream-tier policy config', () => {
    const config = getPlacementPolicyConfig();
    expect(config).toHaveProperty('blockDualDreamOffers');
    expect(config).toHaveProperty('superDreamRequiresMinCgpa');
  });
});
