package com.pwioi.portal.util;

import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.Student;

/**
 * Mirrors {@code backend/src/utils/jobEligibility.js} so students see the same jobs as Node.
 */
public final class JobEligibility {
    private JobEligibility() {}

    public static boolean hasCompleteProfile(Student student) {
        return student != null
                && notBlank(student.getSchool())
                && notBlank(student.getCenter())
                && notBlank(student.getBatch())
                && notBlank(student.getFullName())
                && notBlank(student.getEmail());
    }

    public static boolean meetsJobEligibility(Student student, Job job) {
        if (!hasCompleteProfile(student) || job == null) return false;

        if (notBlank(job.getYop())) {
            try {
                int jobYop = Integer.parseInt(job.getYop().trim());
                Integer studentYop = deriveStudentYop(student.getBatch());
                if (studentYop != null && studentYop > jobYop) return false;
            } catch (NumberFormatException ignored) {
                // invalid job YOP is ignored, matching Node NaN handling
            }
        }

        if (notBlank(job.getMinCgpa())) {
            Double required = parseRequiredCgpa(job.getMinCgpa());
            Double studentCgpa = student.getCgpa();
            if (studentCgpa == null) return false;
            if (required != null && studentCgpa < required) return false;
        }

        if (notBlank(job.getBacklogs())) {
            String studentBacklogs = student.getBacklogs() == null ? "" : student.getBacklogs().trim();
            if (studentBacklogs.isEmpty()) return false;
            if (!meetsBacklogs(student.getBacklogs(), job.getBacklogs())) return false;
        }

        return true;
    }

    private static Integer deriveStudentYop(String batch) {
        if (!notBlank(batch)) return null;
        String[] parts = batch.split("-");
        String end = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
        try {
            int n = Integer.parseInt(end);
            return n < 100 ? 2000 + n : n;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Double parseRequiredCgpa(String minCgpa) {
        String requirement = minCgpa.trim();
        try {
            if (requirement.endsWith("%")) {
                return Double.parseDouble(requirement.substring(0, requirement.length() - 1).trim()) / 10.0;
            }
            return Double.parseDouble(requirement);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean meetsBacklogs(String studentBacklogs, String jobBacklogsRequirement) {
        String requirement = jobBacklogsRequirement.trim().toLowerCase();
        int studentNum;
        try {
            studentNum = Integer.parseInt(studentBacklogs.trim());
        } catch (NumberFormatException e) {
            studentNum = 0;
        }
        if ("no".equals(requirement) || "0".equals(requirement) || "none".equals(requirement)) {
            return studentNum == 0;
        }
        if (requirement.contains("-")) {
            String[] range = requirement.split("-", 2);
            try {
                int min = Integer.parseInt(range[0].trim());
                int max = Integer.parseInt(range[1].trim());
                return studentNum >= min && studentNum <= max;
            } catch (NumberFormatException e) {
                return true;
            }
        }
        try {
            return studentNum <= Integer.parseInt(requirement);
        } catch (NumberFormatException e) {
            // Node: parseInt("Not Allowed") || 0 → max 0 backlogs
            return studentNum <= 0;
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
