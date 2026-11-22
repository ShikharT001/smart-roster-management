import {
  EngineInput,
  RosterEntryData,
  ReplacementCandidate,
  ProcessData,
  EmployeeData,
} from "./types";
import { getMonthDates, diffDays, formatHumanDate } from "./date-utils";
import { requiredCoverage } from "./coverage";

export function findRankedReplacements(
  targetDate: string,
  processId: string,
  input: EngineInput,
  currentEntries: RosterEntryData[]
): ReplacementCandidate[] {
  const targetProcess = input.processes.find((p) => p.id === processId);
  if (!targetProcess) return [];

  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const podMap = new Map(input.pods.map((p) => [p.id, p]));
  const procMap = new Map(input.processes.map((p) => [p.id, p]));

  // Index entries by empId -> date -> entry
  const entryMap = new Map<string, Map<string, RosterEntryData>>();
  for (const e of currentEntries) {
    let m = entryMap.get(e.employeeId);
    if (!m) {
      m = new Map();
      entryMap.set(e.employeeId, m);
    }
    m.set(e.date, e);
  }

  // Find employees directly assigned to this process
  const assignedEmpIds = new Set(
    input.assignments.filter((a) => a.processId === processId).map((a) => a.employeeId)
  );

  // Identify reference pod from assigned employees
  const primaryAssigned = input.assignments.find(
    (a) => a.processId === processId && a.isPrimary
  );
  const referenceEmp = primaryAssigned
    ? input.employees.find((e) => e.id === primaryAssigned.employeeId)
    : undefined;
  const targetPodId = referenceEmp?.podId;

  const candidates: ReplacementCandidate[] = [];

  for (const emp of input.employees) {
    if (!emp.active) continue;

    // 1. Must NOT be on approved leave or marked on LEAVE/COMP_OFF on target date
    const hasApprovedLeave = input.leaves.some(
      (l) =>
        l.employeeId === emp.id &&
        l.date === targetDate &&
        l.status === "APPROVED"
    );
    if (hasApprovedLeave) continue;

    const currentEntry = entryMap.get(emp.id)?.get(targetDate);
    if (currentEntry && (currentEntry.status === "LEAVE" || currentEntry.status === "COMP_OFF")) {
      continue;
    }

    const isCurrentlyWorking = currentEntry?.status === "WORKING";

    // If candidate is already assigned to this process AND already working on it, skip
    if (assignedEmpIds.has(emp.id) && isCurrentlyWorking) {
      continue;
    }

    const isAlreadyAssigned = assignedEmpIds.has(emp.id);
    const isSamePod = targetPodId !== undefined && emp.podId === targetPodId;
    const pod = podMap.get(emp.podId);
    const podName = pod ? pod.name : "Pod";

    // 2. Calculate consecutive working days leading up to targetDate
    const monthDates = getMonthDates(input.month);
    const targetIdx = monthDates.indexOf(targetDate);
    let consecutiveDays = 0;

    if (targetIdx !== -1) {
      for (let i = targetIdx - 1; i >= 0; i--) {
        const prevDate = monthDates[i];
        const prevEntry = entryMap.get(emp.id)?.get(prevDate);
        if (prevEntry && prevEntry.status === "WORKING") {
          consecutiveDays++;
        } else {
          break;
        }
      }
    }

    // 3. Check if candidate's current brands would remain covered if they switch
    let ownBrandsCovered = true;
    if (isCurrentlyWorking) {
      const empOtherAssignments = input.assignments.filter(
        (a) => a.employeeId === emp.id && a.processId !== processId
      );

      for (const oa of empOtherAssignments) {
        const proc = procMap.get(oa.processId);
        if (!proc) continue;
        const req = requiredCoverage(
          proc,
          targetDate,
          input.holidays,
          input.coverageOverrides
        );
        if (req <= 0) continue;

        // How many other workers are working for this process today?
        const otherWorkers = input.assignments
          .filter((a) => a.processId === proc.id && a.employeeId !== emp.id)
          .filter((a) => {
            const e = entryMap.get(a.employeeId)?.get(targetDate);
            return e && e.status === "WORKING";
          }).length;

        if (otherWorkers < req) {
          ownBrandsCovered = false;
          break;
        }
      }
    }

    // 4. Calculate ranking score
    let score = 0;
    const reasons: string[] = [];

    if (isAlreadyAssigned) {
      score += 100;
      reasons.push("Already assigned to process");
    }

    if (isSamePod) {
      score += 50;
      reasons.push(`Same pod (${podName})`);
    } else {
      reasons.push(`${podName}`);
    }

    if (!isCurrentlyWorking) {
      score += 40;
      reasons.push("Currently on scheduled off (available to swap)");
    } else if (ownBrandsCovered) {
      score += 20;
      reasons.push("Own assigned brands have surplus coverage");
    } else {
      score -= 60;
      reasons.push("Reassigning would leave own brand understaffed");
    }

    if (consecutiveDays < emp.maxConsecutiveWorkingDays) {
      score += (emp.maxConsecutiveWorkingDays - consecutiveDays) * 10;
      reasons.push(`${consecutiveDays} consecutive day(s) worked`);
    } else {
      score -= 150;
      reasons.push(`At consecutive day limit (${consecutiveDays} days)`);
    }

    candidates.push({
      employeeId: emp.id,
      name: emp.name,
      podName,
      isSamePod,
      isAlreadyAssigned,
      consecutiveDays,
      score,
      reason: reasons.join("; "),
    });
  }

  // Sort highest score first
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

export function applyReplacement(
  currentEntries: RosterEntryData[],
  targetDate: string,
  candidateEmployeeId: string,
  originalEmployeeId?: string
): RosterEntryData[] {
  return currentEntries.map((e) => {
    if (e.employeeId === candidateEmployeeId && e.date === targetDate) {
      return {
        ...e,
        status: "WORKING",
        source: "MANUAL",
        locked: true,
      };
    }
    if (originalEmployeeId && e.employeeId === originalEmployeeId && e.date === targetDate) {
      return {
        ...e,
        status: "LEAVE",
        source: "MANUAL",
      };
    }
    return e;
  });
}
