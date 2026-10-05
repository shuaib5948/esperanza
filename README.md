# ESPERANZA 2026–27 — Festival Competition Management System

A production-ready, full-stack competition festival management system engineered specifically for institutional festivals. Built with **Node.js, Express, TypeScript, and MySQL 8.x** on the backend and **React, Vite, TypeScript, and Tailwind CSS** on the frontend.

---

## 🏆 System Highlights

- **Verbatim 60 Competitions Catalogue**: Implements the official Esperanza 2026–27 festival programme containing all 60 items across **J1 (7)**, **J2 (10)**, **Junior (14)**, **Senior (16)**, and **General (13)** groups.
- **Configurable Unknowns**: Flexible administrative settings for Category names, Team names, Stage/Off-stage mappings, and Award Points (1st, 2nd, 3rd, Participation).
- **Strict Role-Based Access Control (RBAC)**:
  - `ADMIN`: Global orchestration, criteria setup, verified result publication, audit control.
  - `TEAM_LEADER`: Multi-tenant isolation restricted solely to own team roster and registrations.
  - `JUDGE`: Air-gapped scoring access strictly isolated to assigned competitions.
  - `PARTICIPANT`: Mobile-first dashboard showing personalized schedule, queue status, and authentic certificates.
- **Atomic Results & Points Engine**: Aggregated score calculation (Average or Highest), draft ranking verification, and single-transaction team points allocation with audited log records.
- **Backstage Live Queue Control**: Real-time performer progression (`WAITING` ➔ `CALLED` ➔ `ON_STAGE` ➔ `COMPLETED` / `ABSENT`).
- **Verifiable Digital Certificates**: Public, cryptographically code-verifiable achievement badges with revocation audit.
- **Real-Time Live Leaderboard**: 10-second polling leaderboard displaying standings, point differentials, and podium counts.
- **Comprehensive Reports**: 1-Click CSV exports for Participants, Registrations, Judging Rubric Scores, and Final Standings.

---

## 🗄️ Database Architecture (MySQL 8.x)

The system is backed by a normalized 23-table schema in MySQL:
1. `users` — Base user accounts with bcrypt hashed passwords.
2. `teams` — Competing houses (Team A and Team B).
3. `participant_categories` — Configurable categories (CAT_1 to CAT_4).
4. `participants` — Student participant roster with team and category links.
5. `programme_groups` — J1, J2, JUNIOR, SENIOR, GENERAL.
6. `competition_types` — STAGE, OFF_STAGE, GENERAL.
7. `competitions` — Unified record for all 60 competitions verbatim.
8. `competition_criteria` — Evaluation rubrics with strict max marks bounds.
9. `competition_category_eligibility` — Mapping of allowable categories per competition.
10. `venues` — Festival stages and event halls.
11. `schedules` — Timetable entries with automated venue clash prevention.
12. `registrations` — Enrolments with duplicate prevention and eligibility validation.
13. `attendance` — Roll-call presence and check-in logs.
14. `stage_queue` — Live performer queue order and status tracking.
15. `submissions` — Artifact links for off-stage writing and arts events.
16. `judges` — Evaluator credentials and qualifications.
17. `competition_judges` — Arbitrated judge-to-competition assignments.
18. `score_sheets` — Draft and locked total scores.
19. `score_details` — Individual criterion mark breakdowns.
20. `results` — Official verified placements and rankings.
21. `point_rules` — Configurable points table for placements.
22. `team_points` — Atomic ledger of standing points awarded to teams.
23. `certificates` — Issued and revocable digital credentials with verification codes.
24. `announcements` — Targeted broadcast notices.
25. `audit_logs` — Immutable audit trail of administrative operations.

---

## 🔑 Demo & Test Credentials

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@esperanza.local` | `Admin@Esperanza2026!` | Full Master Control |
| **Team Leader A** | `leader.teama@esperanza.local` | `Leader@Esperanza2026!` | Team A Roster & Registrations |
| **Team Leader B** | `leader.teamb@esperanza.local` | `Leader@Esperanza2026!` | Team B Roster & Registrations |
| **Judge 1** | `judge1@esperanza.local` | `Judge@Esperanza2026!` | Assigned Scoring Panel |
| **Judge 2** | `judge2@esperanza.local` | `Judge@Esperanza2026!` | Assigned Scoring Panel |
| **Participant** | `part1@esperanza.local` | `Part@Esperanza2026!` | Student Mobile View & Uploads |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js 20.x or higher
- MySQL 8.x running locally on port 3306 (or via Docker Compose)

### 2. Environment Configuration
Backend `.env` file (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=wefiadmin
DB_NAME=esperanza
JWT_SECRET=super-secret-jwt-key-for-esperanza-2026
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=super-secret-refresh-key-for-esperanza-2026
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 3. Database Migration & Seeding
From the root directory:
```bash
npm run db:migrate
npm run db:seed
```

### 4. Running the Complete System
```bash
# Concurrently launches backend (port 5000) and frontend (port 5173)
npm run dev
```

### 5. Running the Automated Test Suite
```bash
# Runs all 48 end-to-end integration tests across all 10 phases
npm test
```

### 6. Production Builds
```bash
# Compiles both TypeScript backend and Vite production bundle
npm run build
```

---

## 📋 The 60 Official Competitions Summary

| Group | Prog # Range | Competitions |
| :--- | :--- | :--- |
| **J1** | 1 – 7 | Story writing, Pencil drawing, Water colour, Book review, Action song, Elocution Malayalam, Elocution English |
| **J2** | 8 – 17 | Story writing, Pencil drawing, Water colour, Book review, Action song, Elocution Malayalam, Elocution English, Versification Malayalam, Versification English, Essay writing |
| **JUNIOR** | 18 – 31 | Story writing, Pencil drawing, Water colour, Calligraphy, Oil painting, Cartoon, Versification Malayalam, Versification English, Versification Arabic, Versification Urdu, Elocution Malayalam, Elocution English, Elocution Arabic, Elocution Urdu |
| **SENIOR** | 32 – 47 | Story writing (Mal/Eng/Ar/Ur), Versification (Mal/Eng/Ar/Ur), Elocution (Mal/Eng/Ar/Ur), Essay writing (Mal/Eng/Ar/Ur) |
| **GENERAL** | 48 – 60 | Extempore (Mal/Eng/Ar/Ur), Quiz, Debate, Group Song, Patriotic Song, Qawwali, Mime, Digital Poster Design, Photography |

---

## 🛡️ Integration Verification

All 10 project phases have been validated with 100% test pass rate:
- **Phase 1**: Project Structure, Scaffolding & Docker Compose
- **Phase 2**: Relational Schema Migrations, Seeds & JWT Authentication
- **Phase 3**: Teams, Configurable Categories & Participant Isolation
- **Phase 4**: 60 Official Competitions Verbatim & Eligibility Criteria
- **Phase 5**: Registration Conflict Engine & Venue Clash Detection
- **Phase 6**: Judge Portal, Rubric Scoring Bounds, Drafts & Locking
- **Phase 7**: Results Verification & Atomic Points Allocation
- **Phase 8**: Live Stage Queue Control, Attendance Roll-Call & Submissions
- **Phase 9**: Verifiable Certificates, Targeted Announcements & CSV Reports
- **Phase 10**: System Audit Logs & Role-Based Dashboards
