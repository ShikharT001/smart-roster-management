"use client";

import React, { useState, useTransition } from "react";
import {
  PodData,
  EmployeeData,
  BrandData,
  ProcessData,
  AssignmentData,
  CoverageOverrideData,
  HolidayData,
  LeaveData,
  CalendarRule,
  LeaveType,
  LeaveStatus,
} from "@/lib/engine/types";
import {
  savePodAction,
  deletePodAction,
  saveEmployeeAction,
  toggleEmployeeActiveAction,
  deleteEmployeeAction,
  saveBrandAction,
  toggleBrandActiveAction,
  deleteBrandAction,
  saveProcessAction,
  deleteProcessAction,
  saveAssignmentAction,
  toggleAssignmentPrimaryAction,
  deleteAssignmentAction,
  saveCoverageOverrideAction,
  deleteCoverageOverrideAction,
  saveHolidayAction,
  deleteHolidayAction,
  saveLeaveAction,
  updateLeaveStatusAction,
  deleteLeaveAction,
  getDependenciesAction,
} from "@/lib/actions/setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Users,
  Briefcase,
  GitBranch,
  Shield,
  Layers,
  Calendar,
  Sun,
  UserX,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";

interface SetupClientProps {
  initialPods: PodData[];
  initialEmployees: EmployeeData[];
  initialBrands: BrandData[];
  initialProcesses: ProcessData[];
  initialAssignments: AssignmentData[];
  initialOverrides: CoverageOverrideData[];
  initialHolidays: HolidayData[];
  initialLeaves: LeaveData[];
}

type TabKey =
  | "employees"
  | "brands"
  | "processes"
  | "pods"
  | "assignments"
  | "calendar"
  | "holidays"
  | "leaves";

export const SetupClient: React.FC<SetupClientProps> = ({
  initialPods,
  initialEmployees,
  initialBrands,
  initialProcesses,
  initialAssignments,
  initialOverrides,
  initialHolidays,
  initialLeaves,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("employees");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Confirm delete modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "pod" | "brand" | "process" | "employee" | "assignment" | "override" | "holiday" | "leave";
    id: string;
    title: string;
    message: string;
    canDelete: boolean;
    details: string[];
  }>({
    isOpen: false,
    type: "employee",
    id: "",
    title: "",
    message: "",
    canDelete: true,
    details: [],
  });

  // Modal forms state
  const [podModal, setPodModal] = useState<{ isOpen: boolean; mode: "add" | "edit"; data: Partial<PodData> }>({
    isOpen: false,
    mode: "add",
    data: {},
  });

  const [employeeModal, setEmployeeModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    data: Partial<EmployeeData>;
  }>({
    isOpen: false,
    mode: "add",
    data: {},
  });

  const [brandModal, setBrandModal] = useState<{ isOpen: boolean; mode: "add" | "edit"; data: Partial<BrandData> }>({
    isOpen: false,
    mode: "add",
    data: {},
  });

  const [processModal, setProcessModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    data: Partial<ProcessData>;
  }>({
    isOpen: false,
    mode: "add",
    data: {},
  });

  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    data: Partial<AssignmentData>;
  }>({
    isOpen: false,
    data: {},
  });

  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    data: Partial<CoverageOverrideData>;
  }>({
    isOpen: false,
    data: {},
  });

  const [holidayModal, setHolidayModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    data: Partial<HolidayData>;
  }>({
    isOpen: false,
    mode: "add",
    data: {},
  });

  const [leaveModal, setLeaveModal] = useState<{
    isOpen: boolean;
    data: Partial<LeaveData>;
  }>({
    isOpen: false,
    data: {},
  });

  const [actionError, setActionError] = useState<string | null>(null);

  // Lookups
  const podMap = new Map(initialPods.map((p) => [p.id, p]));
  const brandMap = new Map(initialBrands.map((b) => [b.id, b]));
  const empMap = new Map(initialEmployees.map((e) => [e.id, e]));
  const procMap = new Map(initialProcesses.map((p) => [p.id, p]));

  // Delete initiation with dependency check
  const handleDeleteCheck = async (
    type: "pod" | "brand" | "process" | "employee" | "assignment" | "override" | "holiday" | "leave",
    id: string,
    displayName: string
  ) => {
    setActionError(null);
    if (type === "pod" || type === "brand" || type === "process" || type === "employee") {
      const depCheck = await getDependenciesAction(type, id);
      setDeleteConfirm({
        isOpen: true,
        type,
        id,
        title: `Delete ${type.toUpperCase()}: ${displayName}`,
        message: depCheck.message,
        canDelete: depCheck.canDelete,
        details: depCheck.details,
      });
    } else {
      setDeleteConfirm({
        isOpen: true,
        type,
        id,
        title: `Delete record`,
        message: `Are you sure you want to delete ${displayName}? This action is immediate.`,
        canDelete: true,
        details: [],
      });
    }
  };

  const handleExecuteDelete = () => {
    startTransition(async () => {
      let res;
      switch (deleteConfirm.type) {
        case "pod":
          res = await deletePodAction(deleteConfirm.id);
          break;
        case "employee":
          res = await deleteEmployeeAction(deleteConfirm.id);
          break;
        case "brand":
          res = await deleteBrandAction(deleteConfirm.id);
          break;
        case "process":
          res = await deleteProcessAction(deleteConfirm.id);
          break;
        case "assignment":
          res = await deleteAssignmentAction(deleteConfirm.id);
          break;
        case "override":
          res = await deleteCoverageOverrideAction(deleteConfirm.id);
          break;
        case "holiday":
          res = await deleteHolidayAction(deleteConfirm.id);
          break;
        case "leave":
          res = await deleteLeaveAction(deleteConfirm.id);
          break;
      }

      if (res && !res.success) {
        setActionError(res.error || "Failed to delete record");
      } else {
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const tabs = [
    { key: "employees" as TabKey, label: "Employees", count: initialEmployees.length, icon: Users },
    { key: "brands" as TabKey, label: "Brands", count: initialBrands.length, icon: Briefcase },
    { key: "processes" as TabKey, label: "Processes", count: initialProcesses.length, icon: GitBranch },
    { key: "pods" as TabKey, label: "Pods", count: initialPods.length, icon: Shield },
    { key: "assignments" as TabKey, label: "Assignments", count: initialAssignments.length, icon: Layers },
    { key: "calendar" as TabKey, label: "Calendar Rules", count: initialOverrides.length, icon: Calendar },
    { key: "holidays" as TabKey, label: "Holidays", count: initialHolidays.length, icon: Sun },
    { key: "leaves" as TabKey, label: "Leaves", count: initialLeaves.length, icon: UserX },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Action error banner */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs and Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchTerm("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap border ${
                  isActive
                    ? "bg-surface text-foreground border-border shadow-sm"
                    : "text-slate-500 hover:text-foreground hover:bg-surface-hover border-transparent"
                }`}
              >
                <Icon size={13} className={isActive ? "text-accent" : "text-slate-400"} />
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-muted text-slate-500 tabular-nums">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface text-foreground border border-border rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === "employees" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Showing active & inactive operational headcount
            </span>
            <Button
              size="sm"
              onClick={() =>
                setEmployeeModal({
                  isOpen: true,
                  mode: "add",
                  data: {
                    id: `emp-${Date.now().toString().slice(-4)}`,
                    name: "",
                    podId: initialPods[0]?.id || "",
                    role: "Customer Support Specialist",
                    isPodLead: false,
                    preferredWeeklyOffDays: [0],
                    maxConsecutiveWorkingDays: 6,
                    weeklyOffsPerWeek: 1,
                    active: true,
                  },
                })
              }
            >
              <Plus size={14} /> Add Employee
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Name / ID</th>
                    <th className="px-3 py-2">Pod</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2 text-center">Pref Off</th>
                    <th className="px-3 py-2 text-center">Max Consec</th>
                    <th className="px-3 py-2 text-center">Offs/Wk</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {initialEmployees
                    .filter((e) =>
                      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      e.role.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((emp) => {
                      const pod = podMap.get(emp.podId);
                      const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                      const prefStr = emp.preferredWeeklyOffDays
                        .map((d) => DAY_NAMES[d])
                        .join(", ");

                      return (
                        <tr key={emp.id} className="hover:bg-surface-hover/50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{emp.name}</span>
                              {emp.isPodLead && (
                                <Badge variant="info" size="sm">
                                  Lead
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 tabular-nums">{emp.id}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {pod?.name || emp.podId}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{emp.role}</td>
                          <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">
                            {prefStr || "None"}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">{emp.maxConsecutiveWorkingDays}d</td>
                          <td className="px-3 py-2 text-center tabular-nums">{emp.weeklyOffsPerWeek}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => {
                                startTransition(async () => {
                                  await toggleEmployeeActiveAction(emp.id, !emp.active);
                                });
                              }}
                              className="focus:outline-none"
                            >
                              <Badge variant={emp.active ? "success" : "neutral"} size="sm">
                                {emp.active ? "Active" : "Inactive"}
                              </Badge>
                            </button>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEmployeeModal({
                                    isOpen: true,
                                    mode: "edit",
                                    data: emp,
                                  })
                                }
                              >
                                <Edit2 size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCheck("employee", emp.id, emp.name)}
                              >
                                <Trash2 size={12} className="text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDS */}
      {activeTab === "brands" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Manage D2C client brands
            </span>
            <Button
              size="sm"
              onClick={() =>
                setBrandModal({
                  isOpen: true,
                  mode: "add",
                  data: {
                    id: `brand-${Date.now().toString().slice(-4)}`,
                    name: "",
                    active: true,
                  },
                })
              }
            >
              <Plus size={14} /> Add Brand
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Brand Name / ID</th>
                  <th className="px-3 py-2 text-center">Active Processes</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialBrands
                  .filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((b) => {
                    const procCount = initialProcesses.filter((p) => p.brandId === b.id).length;

                    return (
                      <tr key={b.id} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground block">{b.name}</span>
                          <span className="text-[10px] text-slate-400">{b.id}</span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          <Badge variant="neutral" size="sm">
                            {procCount} process(es)
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              startTransition(async () => {
                                await toggleBrandActiveAction(b.id, !b.active);
                              });
                            }}
                          >
                            <Badge variant={b.active ? "success" : "neutral"} size="sm">
                              {b.active ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBrandModal({ isOpen: true, mode: "edit", data: b })}
                            >
                              <Edit2 size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCheck("brand", b.id, b.name)}
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROCESSES */}
      {activeTab === "processes" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Operational processes per brand with operating calendar rules
            </span>
            <Button
              size="sm"
              onClick={() =>
                setProcessModal({
                  isOpen: true,
                  mode: "add",
                  data: {
                    id: `proc-${Date.now().toString().slice(-4)}`,
                    brandId: initialBrands[0]?.id || "",
                    type: "Customer Support",
                    calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS",
                    minStaffDefault: 1,
                  },
                })
              }
            >
              <Plus size={14} /> Add Process
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Process / ID</th>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Operating Calendar Rule</th>
                  <th className="px-3 py-2 text-center">Min Staff</th>
                  <th className="px-3 py-2 text-center">Assigned Staff</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialProcesses
                  .filter((p) =>
                    p.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (brandMap.get(p.brandId)?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((p) => {
                    const brand = brandMap.get(p.brandId);
                    const asgnCount = initialAssignments.filter((a) => a.processId === p.id).length;

                    return (
                      <tr key={p.id} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground block">{p.type}</span>
                          <span className="text-[10px] text-slate-400">{p.id}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {brand?.name || p.brandId}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              p.calendarRule === "ALL_365"
                                ? "error"
                                : p.calendarRule === "ALL_EXCEPT_HOLIDAYS"
                                ? "warning"
                                : "default"
                            }
                            size="sm"
                          >
                            {p.calendarRule}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums font-semibold">
                          {p.minStaffDefault}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          <Badge variant={asgnCount >= p.minStaffDefault ? "neutral" : "error"} size="sm">
                            {asgnCount} assigned
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProcessModal({ isOpen: true, mode: "edit", data: p })}
                            >
                              <Edit2 size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteCheck("process", p.id, `${brand?.name || ""} - ${p.type}`)
                              }
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PODS */}
      {activeTab === "pods" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Operational pods grouping cross-functional teams
            </span>
            <Button
              size="sm"
              onClick={() =>
                setPodModal({
                  isOpen: true,
                  mode: "add",
                  data: {
                    id: `pod-${Date.now().toString().slice(-4)}`,
                    name: "",
                    leadEmployeeId: null,
                  },
                })
              }
            >
              <Plus size={14} /> Add Pod
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Pod Name / ID</th>
                  <th className="px-3 py-2">Pod Lead</th>
                  <th className="px-3 py-2 text-center">Members</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialPods
                  .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((pod) => {
                    const lead = pod.leadEmployeeId ? empMap.get(pod.leadEmployeeId) : null;
                    const membersCount = initialEmployees.filter((e) => e.podId === pod.id).length;

                    return (
                      <tr key={pod.id} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground block">{pod.name}</span>
                          <span className="text-[10px] text-slate-400">{pod.id}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {lead?.name || "Unassigned"}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          <Badge variant="neutral" size="sm">
                            {membersCount} employee(s)
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPodModal({ isOpen: true, mode: "edit", data: pod })}
                            >
                              <Edit2 size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCheck("pod", pod.id, pod.name)}
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Many-to-many staffing mappings (multi-brand & float support)
            </span>
            <Button
              size="sm"
              onClick={() =>
                setAssignmentModal({
                  isOpen: true,
                  data: {
                    id: `asgn-${Date.now().toString().slice(-4)}`,
                    employeeId: initialEmployees[0]?.id || "",
                    processId: initialProcesses[0]?.id || "",
                    isPrimary: true,
                  },
                })
              }
            >
              <Plus size={14} /> New Assignment
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Process</th>
                  <th className="px-3 py-2 text-center">Type</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialAssignments
                  .filter((a) => {
                    const emp = empMap.get(a.employeeId);
                    const proc = procMap.get(a.processId);
                    const brand = proc ? brandMap.get(proc.brandId) : null;
                    const q = searchTerm.toLowerCase();
                    return (
                      (emp?.name || "").toLowerCase().includes(q) ||
                      (brand?.name || "").toLowerCase().includes(q) ||
                      (proc?.type || "").toLowerCase().includes(q)
                    );
                  })
                  .map((a) => {
                    const emp = empMap.get(a.employeeId);
                    const proc = procMap.get(a.processId);
                    const brand = proc ? brandMap.get(proc.brandId) : null;

                    return (
                      <tr key={a.id} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-2 font-medium text-foreground">
                          {emp?.name || a.employeeId}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {brand?.name || "Unknown Brand"}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {proc?.type || a.processId}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              startTransition(async () => {
                                await toggleAssignmentPrimaryAction(a.id, !a.isPrimary);
                              });
                            }}
                          >
                            <Badge variant={a.isPrimary ? "default" : "info"} size="sm">
                              {a.isPrimary ? "Primary" : "Secondary / Float"}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteCheck(
                                "assignment",
                                a.id,
                                `${emp?.name} -> ${brand?.name} (${proc?.type})`
                              )
                            }
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: CALENDAR RULES & COVERAGE OVERRIDES */}
      {activeTab === "calendar" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Coverage Overrides</h3>
                <p className="text-xs text-slate-500">
                  Override minimum required staffing for specific spike dates or recurring weekdays
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  setOverrideModal({
                    isOpen: true,
                    data: {
                      id: `ovr-${Date.now().toString().slice(-4)}`,
                      processId: initialProcesses[0]?.id || "",
                      date: "",
                      weekday: null,
                      minStaff: 2,
                    },
                  })
                }
              >
                <Plus size={14} /> Add Override
              </Button>
            </div>

            <div className="border border-border rounded-md overflow-hidden bg-surface">
              {initialOverrides.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No active coverage overrides configured.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Process / Brand</th>
                      <th className="px-3 py-2">Override Condition</th>
                      <th className="px-3 py-2 text-center">Override Min Staff</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {initialOverrides.map((ovr) => {
                      const proc = procMap.get(ovr.processId);
                      const brand = proc ? brandMap.get(proc.brandId) : null;
                      const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                      const condition = ovr.date
                        ? `Specific Date: ${ovr.date}`
                        : ovr.weekday !== null && ovr.weekday !== undefined
                        ? `Every ${DAY_NAMES[ovr.weekday]}`
                        : "General";

                      return (
                        <tr key={ovr.id} className="hover:bg-surface-hover/50">
                          <td className="px-3 py-2">
                            <span className="font-medium text-foreground block">
                              {proc?.type} ({brand?.name})
                            </span>
                            <span className="text-[10px] text-slate-400">{ovr.id}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{condition}</td>
                          <td className="px-3 py-2 text-center tabular-nums font-bold text-accent">
                            {ovr.minStaff}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCheck("override", ovr.id!, `Override ${condition}`)}
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: HOLIDAYS */}
      {activeTab === "holidays" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Registered public holidays for the operating calendar
            </span>
            <Button
              size="sm"
              onClick={() =>
                setHolidayModal({
                  isOpen: true,
                  mode: "add",
                  data: {
                    id: `hol-${Date.now().toString().slice(-4)}`,
                    date: "2026-11-01",
                    name: "",
                  },
                })
              }
            >
              <Plus size={14} /> Add Holiday
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Date (YYYY-MM-DD)</th>
                  <th className="px-3 py-2">Holiday Name</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialHolidays
                  .filter((h) => h.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((h) => (
                    <tr key={h.id} className="hover:bg-surface-hover/50">
                      <td className="px-3 py-2 font-mono font-medium text-foreground">{h.date}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{h.name}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHolidayModal({ isOpen: true, mode: "edit", data: h })}
                          >
                            <Edit2 size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCheck("holiday", h.id!, h.name)}
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: LEAVES */}
      {activeTab === "leaves" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Staff leave and comp-off requests
            </span>
            <Button
              size="sm"
              onClick={() =>
                setLeaveModal({
                  isOpen: true,
                  data: {
                    id: `leave-${Date.now().toString().slice(-4)}`,
                    employeeId: initialEmployees[0]?.id || "",
                    date: "2026-11-15",
                    type: "PLANNED",
                    status: "PENDING",
                  },
                })
              }
            >
              <Plus size={14} /> Request Leave
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialLeaves
                  .filter((l) => {
                    const emp = empMap.get(l.employeeId);
                    return (emp?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((l) => {
                    const emp = empMap.get(l.employeeId);

                    return (
                      <tr key={l.id} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-2 font-medium text-foreground">
                          {emp?.name || l.employeeId}
                        </td>
                        <td className="px-3 py-2 font-mono">{l.date}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              l.type === "COMP_OFF"
                                ? "info"
                                : l.type === "SICK"
                                ? "warning"
                                : "default"
                            }
                            size="sm"
                          >
                            {l.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <Badge
                              variant={
                                l.status === "APPROVED"
                                  ? "success"
                                  : l.status === "REJECTED"
                                  ? "error"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {l.status}
                            </Badge>
                            {l.status !== "APPROVED" && (
                              <button
                                title="Approve Leave"
                                onClick={() => {
                                  startTransition(async () => {
                                    await updateLeaveStatusAction(l.id!, "APPROVED");
                                  });
                                }}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            {l.status !== "REJECTED" && (
                              <button
                                title="Reject Leave"
                                onClick={() => {
                                  startTransition(async () => {
                                    await updateLeaveStatusAction(l.id!, "REJECTED");
                                  });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteCheck("leave", l.id!, `${emp?.name} on ${l.date}`)
                            }
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteDelete}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        canDelete={deleteConfirm.canDelete}
        dependencyDetails={deleteConfirm.details}
        isPending={isPending}
      />

      {/* POD MODAL */}
      <Modal
        isOpen={podModal.isOpen}
        onClose={() => setPodModal((prev) => ({ ...prev, isOpen: false }))}
        title={podModal.mode === "add" ? "Add Pod" : "Edit Pod"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPodModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await savePodAction(podModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save pod");
                  } else {
                    setPodModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Saving..." : "Save Pod"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Pod ID"
            value={podModal.data.id || ""}
            disabled={podModal.mode === "edit"}
            onChange={(e) => setPodModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Input
            label="Pod Name"
            value={podModal.data.name || ""}
            onChange={(e) => setPodModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
          />
          <Select
            label="Pod Lead (Optional)"
            value={podModal.data.leadEmployeeId || ""}
            onChange={(e) =>
              setPodModal((prev) => ({
                ...prev,
                data: { ...prev.data, leadEmployeeId: e.target.value || null },
              }))
            }
          >
            <option value="">None / Unassigned</option>
            {initialEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.role})
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* EMPLOYEE MODAL */}
      <Modal
        isOpen={employeeModal.isOpen}
        onClose={() => setEmployeeModal((prev) => ({ ...prev, isOpen: false }))}
        title={employeeModal.mode === "add" ? "Add Employee" : "Edit Employee"}
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEmployeeModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveEmployeeAction(employeeModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save employee");
                  } else {
                    setEmployeeModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Saving..." : "Save Employee"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Employee ID"
            value={employeeModal.data.id || ""}
            disabled={employeeModal.mode === "edit"}
            onChange={(e) => setEmployeeModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Input
            label="Full Name"
            value={employeeModal.data.name || ""}
            onChange={(e) => setEmployeeModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
          />
          <Select
            label="Pod"
            value={employeeModal.data.podId || ""}
            onChange={(e) => setEmployeeModal((prev) => ({ ...prev, data: { ...prev.data, podId: e.target.value } }))}
          >
            {initialPods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            label="Role Title"
            value={employeeModal.data.role || ""}
            onChange={(e) => setEmployeeModal((prev) => ({ ...prev, data: { ...prev.data, role: e.target.value } }))}
          />
          <Input
            type="number"
            label="Max Consecutive Days"
            min={1}
            max={14}
            value={employeeModal.data.maxConsecutiveWorkingDays || 6}
            onChange={(e) =>
              setEmployeeModal((prev) => ({
                ...prev,
                data: { ...prev.data, maxConsecutiveWorkingDays: parseInt(e.target.value, 10) },
              }))
            }
          />
          <Input
            type="number"
            label="Weekly Offs Target"
            min={0}
            max={3}
            value={employeeModal.data.weeklyOffsPerWeek || 1}
            onChange={(e) =>
              setEmployeeModal((prev) => ({
                ...prev,
                data: { ...prev.data, weeklyOffsPerWeek: parseInt(e.target.value, 10) },
              }))
            }
          />
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-foreground block mb-1">
              Preferred Weekly Off Days
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => {
                const currentPrefs = employeeModal.data.preferredWeeklyOffDays || [];
                const isSelected = currentPrefs.includes(idx);
                return (
                  <button
                    type="button"
                    key={dayName}
                    onClick={() => {
                      const updated = isSelected
                        ? currentPrefs.filter((d) => d !== idx)
                        : [...currentPrefs, idx];
                      setEmployeeModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, preferredWeeklyOffDays: updated },
                      }));
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded border ${
                      isSelected
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-surface text-slate-600 border-border hover:bg-surface-hover"
                    }`}
                  >
                    {dayName}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 sm:col-span-2 mt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={employeeModal.data.isPodLead || false}
                onChange={(e) =>
                  setEmployeeModal((prev) => ({
                    ...prev,
                    data: { ...prev.data, isPodLead: e.target.checked },
                  }))
                }
                className="rounded border-border text-accent focus:ring-accent"
              />
              Designate as Pod Lead
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={employeeModal.data.active ?? true}
                onChange={(e) =>
                  setEmployeeModal((prev) => ({
                    ...prev,
                    data: { ...prev.data, active: e.target.checked },
                  }))
                }
                className="rounded border-border text-accent focus:ring-accent"
              />
              Active Employee
            </label>
          </div>
        </div>
      </Modal>

      {/* BRAND MODAL */}
      <Modal
        isOpen={brandModal.isOpen}
        onClose={() => setBrandModal((prev) => ({ ...prev, isOpen: false }))}
        title={brandModal.mode === "add" ? "Add Brand" : "Edit Brand"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBrandModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveBrandAction(brandModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save brand");
                  } else {
                    setBrandModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Saving..." : "Save Brand"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Brand ID"
            value={brandModal.data.id || ""}
            disabled={brandModal.mode === "edit"}
            onChange={(e) => setBrandModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Input
            label="Brand Name"
            value={brandModal.data.name || ""}
            onChange={(e) => setBrandModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={brandModal.data.active ?? true}
              onChange={(e) =>
                setBrandModal((prev) => ({
                  ...prev,
                  data: { ...prev.data, active: e.target.checked },
                }))
              }
              className="rounded border-border text-accent focus:ring-accent"
            />
            Active Brand
          </label>
        </div>
      </Modal>

      {/* PROCESS MODAL */}
      <Modal
        isOpen={processModal.isOpen}
        onClose={() => setProcessModal((prev) => ({ ...prev, isOpen: false }))}
        title={processModal.mode === "add" ? "Add Process" : "Edit Process"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setProcessModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveProcessAction(processModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save process");
                  } else {
                    setProcessModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Saving..." : "Save Process"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Process ID"
            value={processModal.data.id || ""}
            disabled={processModal.mode === "edit"}
            onChange={(e) => setProcessModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Select
            label="Brand"
            value={processModal.data.brandId || ""}
            onChange={(e) => setProcessModal((prev) => ({ ...prev, data: { ...prev.data, brandId: e.target.value } }))}
          >
            {initialBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Input
            label="Process Type"
            placeholder="e.g. Customer Support, NDR Management"
            value={processModal.data.type || ""}
            onChange={(e) => setProcessModal((prev) => ({ ...prev, data: { ...prev.data, type: e.target.value } }))}
          />
          <Select
            label="Calendar Operating Rule"
            value={processModal.data.calendarRule || "EXCEPT_SUNDAYS_AND_HOLIDAYS"}
            onChange={(e) =>
              setProcessModal((prev) => ({
                ...prev,
                data: { ...prev.data, calendarRule: e.target.value as CalendarRule },
              }))
            }
          >
            <option value="EXCEPT_SUNDAYS_AND_HOLIDAYS">EXCEPT_SUNDAYS_AND_HOLIDAYS (Mon-Sat, closed holidays)</option>
            <option value="ALL_EXCEPT_HOLIDAYS">ALL_EXCEPT_HOLIDAYS (7 days, closed holidays)</option>
            <option value="ALL_365">ALL_365 (7 days, open holidays)</option>
          </Select>
          <Input
            type="number"
            label="Default Minimum Staff"
            min={1}
            value={processModal.data.minStaffDefault || 1}
            onChange={(e) =>
              setProcessModal((prev) => ({
                ...prev,
                data: { ...prev.data, minStaffDefault: parseInt(e.target.value, 10) },
              }))
            }
          />
        </div>
      </Modal>

      {/* ASSIGNMENT MODAL */}
      <Modal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal((prev) => ({ ...prev, isOpen: false }))}
        title="Add Staff Assignment"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAssignmentModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveAssignmentAction(assignmentModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save assignment");
                  } else {
                    setAssignmentModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Assigning..." : "Save Assignment"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Assignment ID"
            value={assignmentModal.data.id || ""}
            onChange={(e) => setAssignmentModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Select
            label="Employee"
            value={assignmentModal.data.employeeId || ""}
            onChange={(e) => setAssignmentModal((prev) => ({ ...prev, data: { ...prev.data, employeeId: e.target.value } }))}
          >
            {initialEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({podMap.get(e.podId)?.name})
              </option>
            ))}
          </Select>
          <Select
            label="Target Process"
            value={assignmentModal.data.processId || ""}
            onChange={(e) => setAssignmentModal((prev) => ({ ...prev, data: { ...prev.data, processId: e.target.value } }))}
          >
            {initialProcesses.map((p) => {
              const brand = brandMap.get(p.brandId);
              return (
                <option key={p.id} value={p.id}>
                  {brand?.name} - {p.type}
                </option>
              );
            })}
          </Select>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={assignmentModal.data.isPrimary ?? true}
              onChange={(e) =>
                setAssignmentModal((prev) => ({
                  ...prev,
                  data: { ...prev.data, isPrimary: e.target.checked },
                }))
              }
              className="rounded border-border text-accent focus:ring-accent"
            />
            Primary assignment (uncheck for secondary/float resource)
          </label>
        </div>
      </Modal>

      {/* OVERRIDE MODAL */}
      <Modal
        isOpen={overrideModal.isOpen}
        onClose={() => setOverrideModal((prev) => ({ ...prev, isOpen: false }))}
        title="Add Coverage Override"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOverrideModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveCoverageOverrideAction(overrideModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save override");
                  } else {
                    setOverrideModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Saving..." : "Save Override"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Override ID"
            value={overrideModal.data.id || ""}
            onChange={(e) => setOverrideModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Select
            label="Target Process"
            value={overrideModal.data.processId || ""}
            onChange={(e) => setOverrideModal((prev) => ({ ...prev, data: { ...prev.data, processId: e.target.value } }))}
          >
            {initialProcesses.map((p) => {
              const brand = brandMap.get(p.brandId);
              return (
                <option key={p.id} value={p.id}>
                  {brand?.name} - {p.type}
                </option>
              );
            })}
          </Select>
          <Input
            type="date"
            label="Specific Date (Optional - Leave blank for recurring weekday)"
            value={overrideModal.data.date || ""}
            onChange={(e) =>
              setOverrideModal((prev) => ({
                ...prev,
                data: { ...prev.data, date: e.target.value || null },
              }))
            }
          />
          <Select
            label="Recurring Weekday (Optional)"
            value={overrideModal.data.weekday !== null && overrideModal.data.weekday !== undefined ? overrideModal.data.weekday : ""}
            onChange={(e) =>
              setOverrideModal((prev) => ({
                ...prev,
                data: { ...prev.data, weekday: e.target.value === "" ? null : parseInt(e.target.value, 10) },
              }))
            }
          >
            <option value="">None (Use Specific Date)</option>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </Select>
          <Input
            type="number"
            label="Override Minimum Staff"
            min={0}
            value={overrideModal.data.minStaff ?? 2}
            onChange={(e) =>
              setOverrideModal((prev) => ({
                ...prev,
                data: { ...prev.data, minStaff: parseInt(e.target.value, 10) },
              }))
            }
          />
        </div>
      </Modal>

      {/* HOLIDAY MODAL */}
      <Modal
        isOpen={holidayModal.isOpen}
        onClose={() => setHolidayModal((prev) => ({ ...prev, isOpen: false }))}
        title={holidayModal.mode === "add" ? "Add Public Holiday" : "Edit Public Holiday"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setHolidayModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveHolidayAction(holidayModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save holiday");
                  } else {
                    setHolidayModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Saving..." : "Save Holiday"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Holiday ID"
            value={holidayModal.data.id || ""}
            disabled={holidayModal.mode === "edit"}
            onChange={(e) => setHolidayModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Input
            type="date"
            label="Holiday Date (YYYY-MM-DD)"
            value={holidayModal.data.date || ""}
            onChange={(e) => setHolidayModal((prev) => ({ ...prev, data: { ...prev.data, date: e.target.value } }))}
          />
          <Input
            label="Holiday Name"
            placeholder="e.g. Diwali, Independence Day"
            value={holidayModal.data.name || ""}
            onChange={(e) => setHolidayModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
          />
        </div>
      </Modal>

      {/* LEAVE MODAL */}
      <Modal
        isOpen={leaveModal.isOpen}
        onClose={() => setLeaveModal((prev) => ({ ...prev, isOpen: false }))}
        title="Add Leave Request"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setLeaveModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveLeaveAction(leaveModal.data);
                  if (!res.success) {
                    setActionError(res.error || "Failed to save leave");
                  } else {
                    setLeaveModal((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            >
              {isPending ? "Saving..." : "Submit Leave"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Leave ID"
            value={leaveModal.data.id || ""}
            onChange={(e) => setLeaveModal((prev) => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
          />
          <Select
            label="Employee"
            value={leaveModal.data.employeeId || ""}
            onChange={(e) => setLeaveModal((prev) => ({ ...prev, data: { ...prev.data, employeeId: e.target.value } }))}
          >
            {initialEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({podMap.get(e.podId)?.name})
              </option>
            ))}
          </Select>
          <Input
            type="date"
            label="Date (YYYY-MM-DD)"
            value={leaveModal.data.date || ""}
            onChange={(e) => setLeaveModal((prev) => ({ ...prev, data: { ...prev.data, date: e.target.value } }))}
          />
          <Select
            label="Leave Type"
            value={leaveModal.data.type || "PLANNED"}
            onChange={(e) =>
              setLeaveModal((prev) => ({
                ...prev,
                data: { ...prev.data, type: e.target.value as LeaveType },
              }))
            }
          >
            <option value="PLANNED">PLANNED (Annual / Vacation)</option>
            <option value="COMP_OFF">COMP_OFF (Earned compensatory off)</option>
            <option value="SICK">SICK (Medical / Emergency)</option>
          </Select>
          <Select
            label="Initial Approval Status"
            value={leaveModal.data.status || "PENDING"}
            onChange={(e) =>
              setLeaveModal((prev) => ({
                ...prev,
                data: { ...prev.data, status: e.target.value as LeaveStatus },
              }))
            }
          >
            <option value="PENDING">PENDING (Awaiting Review)</option>
            <option value="APPROVED">APPROVED (Active Leave)</option>
            <option value="REJECTED">REJECTED (Declined)</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
};
