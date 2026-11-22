# Smart Roster Management System

> 🚀 **Live Production App**: [https://smart-roster-management-ivory.vercel.app](https://smart-roster-management-ivory.vercel.app)  
> 📦 **GitHub Repository**: [https://github.com/ShikharT001/smart-roster-management](https://github.com/ShikharT001/smart-roster-management)

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

## Engineering & Design Decisions (Q&A)

Here is a breakdown of the core architectural choices, operational tradeoffs, and implementation decisions made in building this system.

---

### 1. How did you model employees, brands, processes, pods, and their relationships?

In operations and BPO companies supporting multiple D2C brands, the common trap is directly linking employees to brands (`employee.brand_id`). In reality, that model falls apart quickly:
1. Brands operate multiple functional channels (e.g. Customer Support runs 7 days a week, while NDR calling and Abandoned Cart recovery only run Monday through Saturday).
2. Senior operators often "float" across sister brands to cover peak hours or leave deficits.

To capture this accurately without hacks, I structured the domain into five core relational entities:

- **Pods (`pods`)**: The organizational grouping (e.g., *Pod Alpha - D2C Care*). Every employee belongs to exactly one Pod, led by a Pod Lead. Pods establish natural affinity groups for shared training, localized peer substitutions, and managerial oversight.
- **Brands (`brands`)**: The client business entities (*Northwind Apparel*, *Soulflower Organics*, etc.). Brands act as administrative containers rather than direct scheduling targets.
- **Processes (`processes`)**: The actual atomic units of work demand. Each process belongs to a brand and defines:
  - `type`: E.g., `Customer Support`, `Abandoned Cart`, `NDR Management`, `Retention`.
  - `calendarRule`: Operating calendar (`ALL_365`, `EXCEPT_SUNDAYS`, or `EXCEPT_SUNDAYS_AND_HOLIDAYS`).
  - `minStaffDefault`: Baseline headcount required whenever the process is operational (can be dynamically overridden per date via `coverage_overrides`).
- **Employees (`employees`)**: The labor supply. Stores human constraints and labor limits: their parent Pod, role, preferred weekly off days, `weeklyOffsPerWeek` (1 or 2), `maxConsecutiveWorkingDays` (default 6), and active status.
- **Assignments (`assignments`)**: A dedicated many-to-many junction table linking employees to processes. It includes an `isPrimary` flag (1 = dedicated primary owner, 0 = secondary cross-brand float).

**Why this separation matters:** An associate can be the primary CS representative for Brand A from Monday to Friday, while acting as an authorized float for Brand B's NDR on weekends. When an employee takes leave, their absence automatically ripples through every process they are qualified to cover without duplicate data entry.

---

### 2. How does your system generate a roster and determine whether it satisfies the required constraints?

I deliberately chose **not** to use an opaque mathematical solver (like an ILP or CP-SAT black box). In production serverless environments, heavy C++/WASM binaries add latency, and more importantly, when solvers fail, they simply output `UNSATISFIABLE` without telling the operations manager *why* or what to do about it.

Instead, the system uses a **transparent, deterministic 3-tier pipeline** that runs in ~10ms:

1. **Phase 1: Pre-flight Feasibility Math (`src/lib/engine/feasibility.ts`)**  
   Before generating a single shift, the engine tallies total available staff work-days against total required process coverage days for the month. If the math is physically impossible (e.g., 7 days of coverage required from a single person who is legally owed 1 weekly off), it flags a `STRUCTURAL_GAP` upfront rather than failing halfway through.

2. **Phase 2: Deterministic 3-Step Generator (`src/lib/engine/generator.ts`)**  
   - **Step 1 (Fixed Placements)**: Hard-locks approved leaves, public holidays (where the process is closed), and any historical or manually locked cells.
   - **Step 2 (Off-Day Assignment)**: Distributes weekly off days based on employee preferences (`preferredWeeklyOffDays`), evenly spacing them across 7-day rolling cycles and strictly capping consecutive working days at 6.
   - **Step 3 (Greedy Local Repair)**: If an assigned off day leaves a critical process below `minStaffDefault`, a local swap heuristic scans adjacent days for that employee (or peer floats) to trade off-days without breaking rest rules.

3. **Phase 3: Independent Constraint Audit (`src/lib/engine/validator.ts`)**  
   The validator is completely decoupled from the generator: it does not care *how* a roster was created (auto-generated or manually edited). It audits the entire matrix against 5 hard rules:
   - No working on approved leave.
   - No working on closed holiday calendars.
   - No employee exceeds `maxConsecutiveWorkingDays` in any continuous window.
   - Every employee receives their exact weekly off quota.
   - Minimum staffing requirements are satisfied for every operating process on every date.

Any failure produces an explicit, typed `Issue` object containing the severity (`ERROR`, `WARNING`, `INFO`), affected process/employee IDs, human-readable explanations, and ranked remediation suggestions.

---

### 3. How did you handle the difference between single-resource brands and brands with multiple employees?

Single-resource brands on 7-day calendars (`ALL_365`) are the classic operational paradox: the brand contract demands coverage every day, but the sole assigned employee legally and ethically requires 1 weekly off. 7 days of work > 6 allowable consecutive days.

Here is how the system differentiates and solves both cases:

- **Single-Resource Brands:**  
  The engine refuses to hide this gap or violate labor rules by forcing the person to work 7 days straight. During Stage 1 (Feasibility), it flags an explicit `STRUCTURAL_GAP`. During generation, it honors the employee's weekly off day (protecting employee rest), leaves the uncovered day visible as a `NO_COVERAGE` alert, and automatically triggers the **Candidate Recommendation Engine** to suggest qualified float agents from the same pod who can bridge the gap.
- **Multi-Resource Brands:**  
  The engine treats multi-person processes as a cooperative team pool. It staggers weekly offs across the assigned staff. If two associates both prefer Sunday off, the generator gives Sunday to one and an adjacent day (e.g., Saturday or Monday) to the other, balancing fairness while ensuring that `minStaffDefault >= 1` is maintained across all operating days.

---

### 4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?

In D2C operations, having a solo operator is a major "bus factor" vulnerability. When this employee takes planned leave, sick leave, or an off day:

1. **Cascade Detection**: The validator detects that every process linked to that brand has dropped to 0 staff on that date. It flags a high-priority **`MULTI_BRAND_CASCADE`** alert, warning operations leadership that the client's operations are completely unstaffed.
2. **Ranked Replacement Engine (`src/lib/engine/suggestions.ts`)**: Rather than just displaying a red error badge, the system immediately runs a company-wide candidate scan:
   - Filters out anyone already working at capacity, on leave, or nearing consecutive-day caps.
   - Ranks available candidates using a weighted scoring formula:
     - `+100 pts`: Prior certified experience or secondary assignment on this exact brand/process.
     - `+50 pts`: Member of the same Pod (shares team context and supervisor).
     - `-100 pts`: Penalty if borrowing this employee would trigger a new understaffing gap on their own home brand.
3. **One-Click Remediation**: The manager opens the **Issues** tab, sees the top-ranked candidate cards with fit scores, and can apply a 1-click swap or coverage override directly from the UI.

---

### 5. How does your system handle conflicting requirements or insufficient staffing?

Whenever constraints clash, the system enforces a strict **hierarchy of priorities**:

1. **Tier 1 (Non-Negotiable Hard Constraints)**:  
   Approved medical/planned leaves and legal labor limits (`maxConsecutiveWorkingDays <= 6`). The system will *never* force someone on medical leave to work or schedule an illegal 10-day streak just to keep a dashboard green. Labor safety comes first.
2. **Tier 2 (Process SLAs & Minimum Coverage)**:  
   Maintaining `minStaffDefault` for active processes during operating hours.
3. **Tier 3 (Soft Human Preferences)**:  
   Honoring employee preferred off days (e.g. preferring Sunday over Wednesday).

**When resources fall short:**  
The engine satisfies Tier 1, compromises on Tier 3 where needed, and if Tier 2 cannot be satisfied, it surfaces the deficit as an actionable operational issue rather than hallucinating coverage. In the UI, issues are triaged into three clear buckets:
- **Errors (Red)**: Hard deficits (unstaffed processes, legal consecutive-day violations).
- **Warnings (Amber)**: Risk factors (single-resource brands with zero float backup, multi-brand cascade risks).
- **Info/Suggestions (Blue)**: Opportunities for optimization and recommended candidate swaps.

---

### 6. Which parts of the process did you automate, and which did you leave under human control? Why?

A production operations system should automate tedious arithmetic and combinatorial checking, but preserve human context for business-critical decisions.

- **What is Automated:**
  - **Pre-flight capacity math**: Calculating net available hours vs required coverage across 30+ processes in milliseconds.
  - **Baseline roster generation**: Producing a fair, balanced, constraint-compliant schedule in one click.
  - **Independent constraint validation**: Auditing 1,000+ roster cells across 5 rule layers without human error.
  - **Blast-radius calculation for substitutions**: Finding idle staff, checking cross-brand training, and ensuring borrowing someone doesn't create a secondary gap.
  - **Audit trail**: Automatically logging every single cell modification, the actor who made it, and the before/after issue count.

- **What is Left Under Human Control (and Why):**
  - **Leave Approval**: An algorithm cannot evaluate personal emergencies, bereavement, or compassionate exceptions.
  - **Cross-Brand Borrowing Decisions**: Deciding whether to pull someone from Brand A to cover Brand B requires qualitative business judgment (e.g., Brand A is running a flash sale today and cannot afford to lose an associate, whereas Brand B has low ticket volume). The engine suggests the best candidates, but the manager confirms the assignment.
  - **Cell Locking & Manual Overrides**: Managers can click any cell to manually set `WORKING`, `WEEKLY_OFF`, or `COMP_OFF` and lock it. Once locked, subsequent regenerations treat that cell as immutable.
  - **Roster Publishing**: Generated schedules remain in `DRAFT` status until the Operations Lead reviews remaining gaps, makes final adjustments, and clicks "Publish".

---

### 7. If the company doubled its team and brand count, what would you change about your solution?

Scaling from 34 employees and 24 brands to 100+ employees and 50+ brands introduces two primary bottlenecks: UI DOM overhead and combinatorial repair thrashing. Here is the architectural evolution plan:

1. **Partitioned Solving by Pod**:  
   Currently, the generator runs a global pass across all employees. In reality, Pod Alpha (e.g., D2C Apparel) rarely shares daily shifts with Pod Delta (e.g., Health & Wellness). We would partition the feasibility and generation passes by Pod cluster, solve them in parallel workers, and run a fast global pass only for designated cross-pod floats. This keeps generation time under 30ms even at 300+ employees.
2. **Virtual DOM Grid (`@tanstack/react-virtual`)**:  
   A 70-employee by 31-day table mounts 2,170 interactive cells with dropdowns, popovers, and badges. At 150 employees, that's nearly 5,000 DOM nodes. Virtualizing both the row axis (employees) and column axis (days) ensures only the visible ~30x15 viewport is rendered in the DOM, guaranteeing smooth 60 FPS scrolling.
3. **Database Slicing & Pagination**:  
   Instead of loading the entire monthly roster in a single query, slice queries by Pod (`where pod_id = ?`) with cursor pagination and optimistic mutations using TanStack Query.
4. **Batch Operations**:  
   Add bulk shift actions (e.g. "Set all associates in Pod 2 to Saturday off on Diwali week") to streamline operations for large teams.

---

### 8. If you had one additional week to work on this, what would you improve first?

Given an extra week, I would focus on the four highest-leverage operational additions:

1. **Intra-Day Shift Granularity (Morning / Afternoon / Night)**:  
   Currently, the system models day-level allocation (`WORKING` vs `OFF`). Many D2C brands require 24/7 or 16-hour coverage. I would extend the schema to support discrete shifts (`08:00-16:00`, `16:00-00:00`, `00:00-08:00`) with mandatory rest intervals (e.g., minimum 12 hours of rest between a Night shift and a Morning shift).
2. **Interactive "What-If" Scenario Simulator**:  
   A sandbox mode allowing Ops Leads to simulate operational changes before committing them: *"What happens to our SLA if Brand X switches to a 7-day calendar?"* or *"Can we approve 4 simultaneous festival leaves without hiring temporary contract staff?"*
3. **Employee Self-Service Swap Requests**:  
   A mobile-first portal where associates can propose off-day trades directly with peers. The engine would automatically pre-validate that the proposed trade causes zero coverage gaps or consecutive-day violations, and present the Pod Lead with a pre-vetted "1-Click Approve" button.
4. **Slack & Webhook Alerts**:  
   Real-time notifications sent to Slack when an unplanned absence is logged, featuring the top 2 ranked replacement options with 1-click approval buttons directly in the Slack channel.

