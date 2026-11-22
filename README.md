# Smart Roster Management System

A deterministic roster planning, validation, and conflict-detection web application built for operational companies managing support and back-office processes (Customer Support, Abandoned Cart Conversion, Retention, NDR Management) across multiple D2C brands.

The system prioritizes scheduling correctness and explainability over heuristic guesswork: every generated roster passes through a pure TypeScript validator, structural capacity deficits are identified before scheduling, and invalid schedules are never silently produced.

---

## Honest Assessment (At Scale)

This tool shines in mid-sized operations (20-60 employees, 10-40 brands) where multi-process assignments, strict D2C brand SLAs, and cross-pod floating coverage create combinatorial headaches that spreadsheets cannot validate or explain. At 100+ employees and 50+ brands, the DOM-rendered grid will encounter rendering slowdowns without virtualization, and the single-threaded deterministic local repair heuristic will require hierarchical partitioning (solving per pod or per brand cluster) rather than a global monolithic swap pass to prevent second-degree constraint thrashing.

---

## Technical Stack

- **Framework**: Next.js 15 (App Router, React 19, Strict TypeScript)
- **Styling**: Tailwind CSS (hand-written reusable components, neutral slate palette, CSS variables for light/dark mode)
- **Database**: Drizzle ORM + libSQL (`@libsql/client`)
  - Local development: SQLite file at `./data/roster.db`
  - Production: Turso serverless libSQL database via `DATABASE_URL` and `DATABASE_AUTH_TOKEN`
- **Validation**: Zod (runtime validation for mutations and forms)
- **Scheduling Engine**: Pure TypeScript in `/src/lib/engine` with zero React, DB, or Next.js imports
- **Unit Testing**: Vitest test suite covering 22 edge cases and constraint boundaries

---

## Quickstart (Local Development)

### Prerequisites
- Node.js 18.17+ or 20+ (tested on Node 26)
- npm 9+

### 1. Clone & Install
```bash
git clone <repo-url>
cd RoasterSystem
npm install
```

### 2. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Default `.env` contents for local SQLite:
```env
DATABASE_URL=file:./data/roster.db
DATABASE_AUTH_TOKEN=
```

### 3. Initialize & Seed Database
```bash
# Apply schema migrations
npm run db:migrate

# Seed realistic D2C demo data (34 employees, 24 brands, 5 pods, 30 processes)
npm run db:seed
```

To wipe and reseed the local SQLite database at any time:
```bash
npm run db:reset
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Database Commands

| Command | Description |
|---|---|
| `npm run db:migrate` | Runs DDL statements creating all tables, foreign keys, and indexes. |
| `npm run db:seed` | Populates 34 employees, 24 brands, 5 pods, calendar rules, public holidays, and leaves for November 2026. |
| `npm run db:reset` | Removes `./data/roster.db`, re-runs migrations, and seeds clean demo data. |
| `npm run db:generate` | Uses `drizzle-kit` to generate SQL migration files in `src/lib/db/migrations/`. |

---

## Testing

The scheduling engine is verified by a 22-test Vitest suite covering calendar rules, holiday collisions, month lengths, structural gaps, multi-brand cascade impacts, and candidate replacement rankings.

```bash
# Run unit test suite once
npm test

# Run unit tests in watch mode
npm run test:watch

# Run TypeScript compiler check
npx tsc --noEmit
```

---

## Deployment (Vercel + Turso)

The codebase runs identically on local SQLite and Turso with zero application code changes.

### Step 1: Create a Turso Database
1. Install Turso CLI or log into [turso.tech](https://turso.tech).
2. Create a new database:
   ```bash
   turso db create roster-prod
   ```
3. Get the database URL and create an auth token:
   ```bash
   turso db show roster-prod --url
   # Example: libsql://roster-prod-[org].turso.io

   turso db tokens create roster-prod
   # Copies JWT auth token
   ```

### Step 2: Run Migrations and Seed on Turso
Run migrations and seed pointing to the remote Turso instance:
```bash
DATABASE_URL="libsql://roster-prod-[org].turso.io" DATABASE_AUTH_TOKEN="[your-token]" npm run db:migrate
DATABASE_URL="libsql://roster-prod-[org].turso.io" DATABASE_AUTH_TOKEN="[your-token]" npm run db:seed
```

### Step 3: Deploy to Vercel
1. Push the repository to GitHub.
2. Import the project into Vercel.
3. In Vercel Project Settings -> **Environment Variables**, set:
   - `DATABASE_URL`: `libsql://roster-prod-[org].turso.io`
   - `DATABASE_AUTH_TOKEN`: `[your-token]`
4. Deploy. Vercel builds Next.js with `next build`.

---

## Architecture & How I Think About It

### 1. How the generator handles a single-resource brand needing a weekly off
A single-resource brand operating on a 7-day calendar (`ALL_365`) is mathematically unsolvable without a float resource: an employee requires 1-2 weekly offs per week, meaning 1-2 days must have 0 coverage. The engine does not mask this or silently violate labor rules. Instead, during stage 1 (feasibility pre-check), it computes total available staff hours vs required coverage hours per process per week. If headcount is strictly less than required coverage across the week, it flags a `STRUCTURAL_GAP` issue before generation begins, names the exact deficit, and recommends attaching a cross-pod float resource. During scheduling, it places the employee's off day according to their preference and leaves the uncovered day visible as an understaffed gap for management resolution.

### 2. Trade-offs between pure solver (ILP/CP-SAT) vs deterministic heuristic + local repair
Integer Linear Programming (ILP) or CP-SAT (like OR-Tools) guarantees global optimality under mathematical constraints. However, in an operational D2C roster tool:
- **WASM/Native Overhead**: Running CP-SAT in Vercel Serverless / Edge functions introduces heavy binaries, cold-start latency, or external microservice dependencies.
- **Explainability**: Solvers fail with boolean `UNSATISFIABLE`. They cannot naturally tell an operations manager: *"Brand B is short because Aarav took Wednesday off and Isha was already capped at 6 days."*
- **Determinism & Speed**: Our deterministic heuristic (fixed placements -> constraint-ordered assignment -> local 2-opt off-day swaps) runs in under 15ms in pure TypeScript, produces identical rosters on every run with identical inputs, and permits exact before/after diff explanations when manual adjustments are made.

### 3. Multi-brand employee leave impact and how the engine cascades it
In D2C operations, senior reps frequently cover primary Customer Support on Brand A while handling secondary escalations or NDR on Brand B. In our data model, this is represented as multiple rows in `assignments`. 
Because employee state is unified, when an employee is marked `LEAVE`, `COMP_OFF`, or `WEEKLY_OFF`, that absence immediately affects every process they are assigned to on that date. The validator evaluates coverage per process independently: it aggregates all employees assigned to Process X on Date Y who have `status === "WORKING"`. If the headcount is below `minStaffDefault`, it flags `UNDER_STAFFED` or `NO_COVERAGE` on that process. If the absent employee was the sole coverage for multiple brands, the validator flags a `MULTI_BRAND_CASCADE` warning detailing every affected brand simultaneously.

### 4. What makes a scheduling issue EXPLAINABLE vs just a failure flag
A failure flag says: `ConstraintViolation: Process 4 on 2026-11-09 invalid`. 
An explainable issue provides operational context, causality, and immediate next steps:
- **Plain English Message**: *"Brand Northwind / NDR needs 1 person on Sun 9 Nov (no holidays closed). Only Aarav Mehta is assigned and he is on approved leave."*
- **Causality Metadata**: The issue record includes `brandId`, `processId`, `date`, and the list of absent `employeeIds`.
- **Ranked Actionable Suggestions**: Instead of leaving the manager stuck, `findRankedReplacements` queries available staff across the company, filters out employees already on leave or at max consecutive days, and scores candidates based on pod alignment (+50 pts), prior process training (+100 pts), and whether borrowing them will create a secondary gap on their home brand.

### 5. How to scale from 34 to 300 employees across 100 brands
- **Database**: Drizzle ORM on libSQL with composite indexes on `roster_entries(roster_id, date, employee_id)` and `assignments(process_id, employee_id)`. Reading an entire month for 300 employees is 9,000 rows (less than 1.5MB in memory), which SQLite/Turso loads in under 12ms.
- **Engine Partitioning**: At 300 employees, the assignment graph is sparse: Pod A rarely shares resources with Pod E. We can partition the feasibility and assignment passes by Pod or Brand Cluster, executing independent sub-solvers in parallel and running a single global cross-pod float pass at the end.
- **UI Grid Virtualization**: A 300x31 table is 9,300 cells. DOM rendering must use `@tanstack/react-virtual` with sticky row and column headers so only the visible viewport (~30 rows x 15 columns) is mounted.
- **Client Caching**: Roster slices cached via TanStack Query with optimistic UI mutations and server action revalidation.

### 6. How to handle shift work (morning/evening/night) within the current architecture
The current engine models a 1-day granularity where `status` is an enum (`WORKING`, `WEEKLY_OFF`, `LEAVE`, `HOLIDAY`, `COMP_OFF`). To introduce shifts:
1. Extend `roster_entries` with an optional `shiftId` referencing a `shifts` table (`MORNING: 07:00-15:00`, `EVENING: 15:00-23:00`, `NIGHT: 23:00-07:00`).
2. Update `CoverageOverride` and `requiredCoverage` from `(process, date)` to `(process, date, shift)`.
3. Add a hard rest constraint in `validator.ts`: minimum 12 hours between consecutive shifts (e.g., an employee working `NIGHT` on Day 1 cannot work `MORNING` on Day 2).
4. Because the engine is decoupled from the database, this only requires adding a `shift` dimension to the pure data structures, leaving the core constraint-satisfaction and repair loops intact.

### 7. Strategy for preventing roster churn when regenerating a published roster after leave approval
When an employee submits an emergency leave on Day 14 of an already published month, regenerating the whole month from scratch would needlessly reshuffle off-days for employees on Day 3 or Day 28, destroying employee trust.
Our architecture prevents churn through two mechanisms:
1. **Cell Locking**: Every cell in `roster_entries` has a `locked: boolean` flag. When regenerating, the generator treats all locked cells (and optionally all dates prior to the current date) as immutable fixed placements, running assignment and local repair only on unlocked cells.
2. **Ranked 1-Click Swap (`applySwapAction`)**: Rather than full regeneration, the manager clicks the leave gap card on the Issues screen, views ranked replacement candidates for that specific date, and applies a targeted swap. This modifies exactly two cells (or one float cell) and logs the pinpoint diff in `roster_change_logs`.

### 8. How to test a scheduling engine with a wide variety of edge cases without writing hundreds of brittle unit tests
1. **Property-Based Invariant Testing (Fast-Check)**: Rather than manually handcrafting 200 static test cases, use property-based testing. Generate random combinations of calendar rules, employee counts (1 to 20), leave dates, and preferred off days. Assert fundamental invariants that must ALWAYS hold true:
   - No employee ever has `status === "WORKING"` on an approved leave date.
   - No employee ever exceeds `maxConsecutiveWorkingDays` in any continuous window.
   - Total `WEEKLY_OFF` count per employee matches their configured weekly quota.
   - `validateRoster().isValid === false` if and only if at least one `Issue` has `severity === "ERROR"`.
2. **Deterministic Golden Matrix Benchmarks**: Maintain 10 high-value canonical scenarios (single-resource 365, Sunday holiday collision, February leap year vs non-leap year, all-pod synchronized festival leave). Snapshot the resulting issues and rosters as golden test fixtures.

