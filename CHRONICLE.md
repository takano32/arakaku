# ARAKAKU Project Chronicle

This file tracks the evolution of the ARAKAKU project based on its commit history.

## Project Timeline

### Phase 1: Foundations (2026-05-21)
- **Bootstrap:** Initial setup of the CSV-backed database, GitHub Pages viewer, and build/validation pipeline.
- **Core Navigation:** Added title lineage and core viewer navigation.
- **Video Catalog:** Introduced video metadata and a dedicated videos tab.
- **Data Expansion:** Expanded initial CSV data and added YouTube description candidates for review.

### Phase 2: Extraction & Review Workflows (2026-05-21)
- **Result Candidates:** Added scripts to extract and review note result candidates.
- **Structured Results:** Implemented a workflow for structured note results and result patches.
- **Entity Linking:** Improved links between bouts, fighters, and events in the viewer.
- **Source Documents:** Imported source documents (note articles) and added a source view.
- **CI/CD:** Established GitHub Actions for automated testing and Pages deployment.

### Phase 3: Source Intelligence (2026-05-21)
- **Source Mentions:** Added source mentions data and a corresponding viewer tab.
- **Handoff Documentation:** Created `AGENTS.md`, `HANDOFF.md`, and initial Codex/agent instructions.
- **Contextual Viewer:** Showed related source context and document-grouped candidates in the viewer.
- **Viewer Refactoring:** Split the monolithic viewer app script into modular files (`app-config.js`, `app-core.js`, etc.).
- **Reference Candidates:** Automated the generation of source reference candidates.

### Phase 4: Refinement & UI/UX (2026-05-22)
- **Database Maturation:** Built a comprehensive source document database and cleaned up duplicate bouts.
- **Typography & Aesthetics:** Set consistent viewer typography and added a GitHub ribbon.
- **Card Details:** Enhanced viewer cards to show more detailed metadata and relationships.
- **Detail Toggles:** Implemented folding detail toggles for note articles, YouTube descriptions, and source candidates.
- **Localization:** Adopted `スーパーうんどう` naming and used kana video titles.
- **History Documentation:** Formalized project history and handoff documentation (this file and others).

## Key Architectural Decisions
- **Static First:** Chose a static site architecture (CSV -> JSON -> GitHub Pages) for low maintenance and high availability.
- **Human-in-the-loop:** Decided to use `review/` CSVs for all automated extractions to ensure high data quality.
- **Context-Rich Viewer:** Focused on showing source context directly in the viewer to aid data verification.
