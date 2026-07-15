# Graph Report - frontend\src\components\resume  (2026-07-15)

## Corpus Check
- 12 files · ~22,705 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 47 nodes · 53 edges · 10 communities (4 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf48a472`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ResumePreview.jsx
- CustomResumeBuilder.jsx
- PDFPreviewErrorBoundary
- ResumeBuilder.jsx
- ResumeAnalyzer.jsx
- SectionForms.jsx
- ResumeTemplate2.jsx
- ResumeTemplate3.jsx

## God Nodes (most connected - your core abstractions)
1. `PDFPreviewErrorBoundary` - 6 edges
2. `JobPickerDropdown()` - 3 edges
3. `ResumeAnalyzer()` - 2 edges
4. `buildResumeTextForAnalysis()` - 2 edges
5. `ResumeBuilder()` - 2 edges
6. `ResumePreview()` - 2 edges
7. `ResumeTemplate1()` - 2 edges
8. `ResumeTemplate2()` - 2 edges
9. `ResumeTemplate3()` - 2 edges
10. `ExperienceForm()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (10 total, 6 thin omitted)

### Community 1 - "CustomResumeBuilder.jsx"
Cohesion: 0.22
Nodes (4): DEFAULT_RESUME_DATA, SECTION_ICONS, SECTION_TYPES, ResumePreview()

### Community 3 - "ResumeBuilder.jsx"
Cohesion: 0.60
Nodes (3): buildResumeTextForAnalysis(), ResumeBuilder(), ResumeTemplate1()

## Knowledge Gaps
- **4 isolated node(s):** `SECTION_TYPES`, `SECTION_ICONS`, `DEFAULT_RESUME_DATA`, `TEMPLATES`
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `SECTION_TYPES`, `SECTION_ICONS`, `DEFAULT_RESUME_DATA` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._