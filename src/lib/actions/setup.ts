"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db/client";
import {
  pods,
  employees,
  brands,
  processes,
  assignments,
  coverageOverrides,
  holidays,
  leaves,
} from "../db/schema";
import { eq } from "drizzle-orm";
import {
  PodSchema,
  EmployeeSchema,
  BrandSchema,
  ProcessSchema,
  AssignmentSchema,
  CoverageOverrideSchema,
  HolidaySchema,
  LeaveSchema,
} from "../validation/schemas";
import { checkEntityDependencies } from "../db/queries";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// POD ACTIONS
export async function savePodAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = PodSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, name, leadEmployeeId } = parsed.data;

  try {
    const existing = await db.select().from(pods).where(eq(pods.id, id)).limit(1);
    if (existing.length > 0) {
      await db
        .update(pods)
        .set({ name, leadEmployeeId: leadEmployeeId || null })
        .where(eq(pods.id, id));
    } else {
      await db.insert(pods).values({
        id,
        name,
        leadEmployeeId: leadEmployeeId || null,
      });
    }

    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save pod" };
  }
}

export async function deletePodAction(id: string): Promise<ActionResult> {
  try {
    const check = await checkEntityDependencies("pod", id);
    if (!check.canDelete) {
      return { success: false, error: check.message };
    }

    await db.delete(pods).where(eq(pods.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete pod" };
  }
}

// EMPLOYEE ACTIONS
export async function saveEmployeeAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = EmployeeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  try {
    const existing = await db.select().from(employees).where(eq(employees.id, data.id)).limit(1);
    const serializedPrefs = JSON.stringify(data.preferredWeeklyOffDays);

    if (existing.length > 0) {
      await db
        .update(employees)
        .set({
          name: data.name,
          podId: data.podId,
          role: data.role,
          isPodLead: data.isPodLead,
          preferredWeeklyOffDays: serializedPrefs,
          maxConsecutiveWorkingDays: data.maxConsecutiveWorkingDays,
          weeklyOffsPerWeek: data.weeklyOffsPerWeek,
          active: data.active,
        })
        .where(eq(employees.id, data.id));
    } else {
      await db.insert(employees).values({
        id: data.id,
        name: data.name,
        podId: data.podId,
        role: data.role,
        isPodLead: data.isPodLead,
        preferredWeeklyOffDays: serializedPrefs,
        maxConsecutiveWorkingDays: data.maxConsecutiveWorkingDays,
        weeklyOffsPerWeek: data.weeklyOffsPerWeek,
        active: data.active,
      });
    }

    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save employee" };
  }
}

export async function toggleEmployeeActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await db.update(employees).set({ active }).where(eq(employees.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update employee" };
  }
}

export async function deleteEmployeeAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(employees).where(eq(employees.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete employee" };
  }
}

// BRAND ACTIONS
export async function saveBrandAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = BrandSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, name, active } = parsed.data;

  try {
    const existing = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
    if (existing.length > 0) {
      await db.update(brands).set({ name, active }).where(eq(brands.id, id));
    } else {
      await db.insert(brands).values({ id, name, active });
    }

    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save brand" };
  }
}

export async function toggleBrandActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await db.update(brands).set({ active }).where(eq(brands.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update brand" };
  }
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(brands).where(eq(brands.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete brand" };
  }
}

// PROCESS ACTIONS
export async function saveProcessAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = ProcessSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, brandId, type, calendarRule, minStaffDefault } = parsed.data;

  try {
    const existing = await db.select().from(processes).where(eq(processes.id, id)).limit(1);
    if (existing.length > 0) {
      await db
        .update(processes)
        .set({ brandId, type, calendarRule, minStaffDefault })
        .where(eq(processes.id, id));
    } else {
      await db.insert(processes).values({
        id,
        brandId,
        type,
        calendarRule,
        minStaffDefault,
      });
    }

    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save process" };
  }
}

export async function deleteProcessAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(processes).where(eq(processes.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete process" };
  }
}

// ASSIGNMENT ACTIONS
export async function saveAssignmentAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = AssignmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, employeeId, processId, isPrimary } = parsed.data;

  try {
    const existing = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(assignments)
        .set({ employeeId, processId, isPrimary })
        .where(eq(assignments.id, id));
    } else {
      await db.insert(assignments).values({
        id,
        employeeId,
        processId,
        isPrimary,
      });
    }

    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save assignment" };
  }
}

export async function toggleAssignmentPrimaryAction(id: string, isPrimary: boolean): Promise<ActionResult> {
  try {
    await db.update(assignments).set({ isPrimary }).where(eq(assignments.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update assignment" };
  }
}

export async function deleteAssignmentAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(assignments).where(eq(assignments.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete assignment" };
  }
}

// COVERAGE OVERRIDE ACTIONS
export async function saveCoverageOverrideAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = CoverageOverrideSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, processId, date, weekday, minStaff } = parsed.data;

  try {
    const existing = await db
      .select()
      .from(coverageOverrides)
      .where(eq(coverageOverrides.id, id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(coverageOverrides)
        .set({ processId, date: date || null, weekday: weekday !== undefined ? weekday : null, minStaff })
        .where(eq(coverageOverrides.id, id));
    } else {
      await db.insert(coverageOverrides).values({
        id,
        processId,
        date: date || null,
        weekday: weekday !== undefined ? weekday : null,
        minStaff,
      });
    }

    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save coverage override" };
  }
}

export async function deleteCoverageOverrideAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(coverageOverrides).where(eq(coverageOverrides.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete coverage override" };
  }
}

// HOLIDAY ACTIONS
export async function saveHolidayAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = HolidaySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, date, name } = parsed.data;

  try {
    const existing = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);
    if (existing.length > 0) {
      await db.update(holidays).set({ date, name }).where(eq(holidays.id, id));
    } else {
      await db.insert(holidays).values({ id, date, name });
    }

    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save holiday" };
  }
}

export async function deleteHolidayAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(holidays).where(eq(holidays.id, id));
    revalidatePath("/setup");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete holiday" };
  }
}

// LEAVE ACTIONS
export async function saveLeaveAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = LeaveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, employeeId, date, type, status } = parsed.data;

  try {
    const existing = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
    if (existing.length > 0) {
      await db
        .update(leaves)
        .set({ employeeId, date, type, status })
        .where(eq(leaves.id, id));
    } else {
      await db.insert(leaves).values({ id, employeeId, date, type, status });
    }

    revalidatePath("/setup");
    revalidatePath("/roster");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save leave" };
  }
}

export async function updateLeaveStatusAction(id: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<ActionResult> {
  try {
    await db.update(leaves).set({ status }).where(eq(leaves.id, id));
    revalidatePath("/setup");
    revalidatePath("/roster");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update leave status" };
  }
}

export async function deleteLeaveAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(leaves).where(eq(leaves.id, id));
    revalidatePath("/setup");
    revalidatePath("/roster");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete leave" };
  }
}

// DEPENDENCY CHECK ACTION
export async function getDependenciesAction(type: "pod" | "brand" | "process" | "employee", id: string) {
  return await checkEntityDependencies(type, id);
}
