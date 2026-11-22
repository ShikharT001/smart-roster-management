"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db/client";
import { rosters, rosterEntries, rosterChangeLogs } from "../db/schema";
import { eq, and } from "drizzle-orm";
import {
  getEngineInputForMonth,
  getRosterByMonth,
  getRosterEntries,
} from "../db/queries";
import {
  generateRoster,
  validateRoster,
  findRankedReplacements,
  applyReplacement,
  EntryStatus,
  GenerationResult,
  ReplacementCandidate,
  Issue,
} from "../engine";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function generateRosterAction(
  month: string,
  preserveManualEdits = false
): Promise<ActionResult<GenerationResult>> {
  try {
    const engineInput = await getEngineInputForMonth(month);
    engineInput.preserveManualEdits = preserveManualEdits;

    const existingRoster = await getRosterByMonth(month);
    const issuesBefore = existingRoster && engineInput.existingEntries
      ? validateRoster(engineInput, engineInput.existingEntries)
      : [];

    const result = generateRoster(engineInput);

    const rosterId = existingRoster ? existingRoster.id : `roster-${month}`;
    const nextVersion = existingRoster ? existingRoster.version + 1 : 1;
    const nowIso = new Date().toISOString();

    if (existingRoster) {
      await db
        .update(rosters)
        .set({
          version: nextVersion,
          generatedAt: nowIso,
          status: "DRAFT",
        })
        .where(eq(rosters.id, rosterId));

      await db.delete(rosterEntries).where(eq(rosterEntries.rosterId, rosterId));
    } else {
      await db.insert(rosters).values({
        id: rosterId,
        month,
        status: "DRAFT",
        generatedAt: nowIso,
        version: 1,
      });
    }

    // Insert new roster entries in batches
    const entriesToInsert = result.entries.map((e, idx) => ({
      id: `entry-${month}-${e.employeeId}-${e.date}-${idx}`,
      rosterId,
      employeeId: e.employeeId,
      date: e.date,
      status: e.status,
      locked: e.locked,
      source: e.source,
    }));

    // Batch insert 50 at a time
    const batchSize = 50;
    for (let i = 0; i < entriesToInsert.length; i += batchSize) {
      const batch = entriesToInsert.slice(i, i + batchSize);
      await db.insert(rosterEntries).values(batch);
    }

    // Log the generation change
    await db.insert(rosterChangeLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rosterId,
      at: nowIso,
      actor: "Operations Manager",
      description: preserveManualEdits
        ? `Regenerated roster v${nextVersion} (preserving locked & manual edits)`
        : `Generated fresh roster v${nextVersion}`,
      issuesBefore: JSON.stringify(issuesBefore),
      issuesAfter: JSON.stringify(result.issues),
    });

    revalidatePath("/");
    revalidatePath("/roster");
    revalidatePath("/coverage");
    revalidatePath("/issues");
    revalidatePath("/changelog");

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate roster",
    };
  }
}

export async function updateRosterCellAction(
  month: string,
  employeeId: string,
  date: string,
  newStatus: EntryStatus,
  locked: boolean
): Promise<ActionResult<{ issuesBefore: Issue[]; issuesAfter: Issue[] }>> {
  try {
    const existingRoster = await getRosterByMonth(month);
    if (!existingRoster) {
      return { success: false, error: "No roster exists for this month. Generate a roster first." };
    }

    const engineInput = await getEngineInputForMonth(month);
    const currentEntries = await getRosterEntries(existingRoster.id);

    const issuesBefore = validateRoster(engineInput, currentEntries);

    // Find and update the specific cell
    const targetEntry = currentEntries.find(
      (e) => e.employeeId === employeeId && e.date === date
    );

    if (targetEntry) {
      await db
        .update(rosterEntries)
        .set({
          status: newStatus,
          locked,
          source: "MANUAL",
        })
        .where(
          and(
            eq(rosterEntries.rosterId, existingRoster.id),
            eq(rosterEntries.employeeId, employeeId),
            eq(rosterEntries.date, date)
          )
        );
    } else {
      await db.insert(rosterEntries).values({
        id: `entry-${month}-${employeeId}-${date}-${Date.now()}`,
        rosterId: existingRoster.id,
        employeeId,
        date,
        status: newStatus,
        locked,
        source: "MANUAL",
      });
    }

    // Compute updated entries for instant before/after validation
    const updatedEntries = currentEntries.map((e) => {
      if (e.employeeId === employeeId && e.date === date) {
        return { ...e, status: newStatus, locked, source: "MANUAL" as const };
      }
      return e;
    });

    const issuesAfter = validateRoster(engineInput, updatedEntries);

    const empName = engineInput.employees.find((e) => e.id === employeeId)?.name || employeeId;

    await db.insert(rosterChangeLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rosterId: existingRoster.id,
      at: new Date().toISOString(),
      actor: "Operations Manager",
      description: `Manual edit for ${empName} on ${date}: status changed to ${newStatus}${locked ? " (locked)" : ""}`,
      issuesBefore: JSON.stringify(issuesBefore),
      issuesAfter: JSON.stringify(issuesAfter),
    });

    revalidatePath("/");
    revalidatePath("/roster");
    revalidatePath("/coverage");
    revalidatePath("/issues");
    revalidatePath("/changelog");

    return {
      success: true,
      data: { issuesBefore, issuesAfter },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update roster cell",
    };
  }
}

export async function publishRosterAction(
  month: string,
  acknowledgeErrors = false
): Promise<ActionResult> {
  try {
    const existingRoster = await getRosterByMonth(month);
    if (!existingRoster) {
      return { success: false, error: "No roster exists to publish" };
    }

    const engineInput = await getEngineInputForMonth(month);
    const currentEntries = await getRosterEntries(existingRoster.id);
    const issues = validateRoster(engineInput, currentEntries);

    const errorIssues = issues.filter((i) => i.severity === "ERROR");
    if (errorIssues.length > 0 && !acknowledgeErrors) {
      return {
        success: false,
        error: `Roster has ${errorIssues.length} unresolved hard constraint ERROR(s). Explicit acknowledgment is required to publish with active gaps.`,
      };
    }

    await db
      .update(rosters)
      .set({ status: "PUBLISHED" })
      .where(eq(rosters.id, existingRoster.id));

    await db.insert(rosterChangeLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rosterId: existingRoster.id,
      at: new Date().toISOString(),
      actor: "Operations Manager",
      description: `Roster published (status: PUBLISHED)${
        errorIssues.length > 0 ? ` [Acknowledged ${errorIssues.length} ERROR issues]` : ""
      }`,
      issuesBefore: JSON.stringify(issues),
      issuesAfter: JSON.stringify(issues),
    });

    revalidatePath("/");
    revalidatePath("/roster");
    revalidatePath("/coverage");
    revalidatePath("/issues");
    revalidatePath("/changelog");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish roster",
    };
  }
}

export async function getRankedReplacementsAction(
  month: string,
  targetDate: string,
  processId: string
): Promise<ActionResult<ReplacementCandidate[]>> {
  try {
    const existingRoster = await getRosterByMonth(month);
    const engineInput = await getEngineInputForMonth(month);
    const currentEntries = existingRoster
      ? await getRosterEntries(existingRoster.id)
      : [];

    const candidates = findRankedReplacements(
      targetDate,
      processId,
      engineInput,
      currentEntries
    );

    return { success: true, data: candidates };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to compute replacements",
    };
  }
}

export async function applySwapAction(
  month: string,
  targetDate: string,
  processId: string,
  candidateEmpId: string,
  originalEmpId?: string
): Promise<ActionResult> {
  try {
    const existingRoster = await getRosterByMonth(month);
    if (!existingRoster) {
      return { success: false, error: "No active roster found" };
    }

    const engineInput = await getEngineInputForMonth(month);
    const currentEntries = await getRosterEntries(existingRoster.id);
    const issuesBefore = validateRoster(engineInput, currentEntries);

    // Apply replacement
    const updatedEntries = applyReplacement(
      currentEntries,
      targetDate,
      candidateEmpId,
      originalEmpId
    );

    // Update candidate entry in database
    await db
      .update(rosterEntries)
      .set({ status: "WORKING", locked: true, source: "MANUAL" })
      .where(
        and(
          eq(rosterEntries.rosterId, existingRoster.id),
          eq(rosterEntries.employeeId, candidateEmpId),
          eq(rosterEntries.date, targetDate)
        )
      );

    // If original employee was replaced, update original to LEAVE
    if (originalEmpId) {
      await db
        .update(rosterEntries)
        .set({ status: "LEAVE", source: "MANUAL" })
        .where(
          and(
            eq(rosterEntries.rosterId, existingRoster.id),
            eq(rosterEntries.employeeId, originalEmpId),
            eq(rosterEntries.date, targetDate)
          )
        );
    }

    const issuesAfter = validateRoster(engineInput, updatedEntries);

    const candName = engineInput.employees.find((e) => e.id === candidateEmpId)?.name || candidateEmpId;
    const origName = originalEmpId
      ? engineInput.employees.find((e) => e.id === originalEmpId)?.name || originalEmpId
      : "";

    await db.insert(rosterChangeLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rosterId: existingRoster.id,
      at: new Date().toISOString(),
      actor: "Operations Manager",
      description: `Applied replacement swap for ${targetDate}: ${candName} assigned to work${origName ? ` (replacing ${origName})` : ""}`,
      issuesBefore: JSON.stringify(issuesBefore),
      issuesAfter: JSON.stringify(issuesAfter),
    });

    revalidatePath("/");
    revalidatePath("/roster");
    revalidatePath("/coverage");
    revalidatePath("/issues");
    revalidatePath("/changelog");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to apply swap",
    };
  }
}
