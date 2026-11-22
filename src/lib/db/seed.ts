import { db } from "./client";
import {
  pods,
  employees,
  brands,
  processes,
  assignments,
  coverageOverrides,
  holidays,
  leaves,
  rosters,
  rosterEntries,
  rosterChangeLogs,
} from "./schema";

export async function seed() {
  console.log("Seeding database with realistic D2C operations data...");

  // Clear existing entries
  await db.delete(rosterChangeLogs);
  await db.delete(rosterEntries);
  await db.delete(rosters);
  await db.delete(leaves);
  await db.delete(holidays);
  await db.delete(coverageOverrides);
  await db.delete(assignments);
  await db.delete(processes);
  await db.delete(brands);
  await db.delete(employees);
  await db.delete(pods);

  // 1. Pods
  const podData = [
    { id: "pod-1", name: "Pod Alpha (Personal Care & Beauty)", leadEmployeeId: "emp-1" },
    { id: "pod-2", name: "Pod Bravo (Apparel & Footwear)", leadEmployeeId: "emp-8" },
    { id: "pod-3", name: "Pod Charlie (Food & Beverage)", leadEmployeeId: "emp-15" },
    { id: "pod-4", name: "Pod Delta (Home & Sleep)", leadEmployeeId: "emp-22" },
    { id: "pod-5", name: "Pod Echo (Electronics & Gear)", leadEmployeeId: "emp-29" },
  ];
  await db.insert(pods).values(podData);

  // 2. Employees (34 total)
  const employeeData = [
    // Pod 1 (emp-1 to emp-7, plus emp-32)
    {
      id: "emp-1",
      name: "Aarav Mehta",
      podId: "pod-1",
      role: "Operations Lead",
      isPodLead: true,
      preferredWeeklyOffDays: JSON.stringify([0]), // Sunday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-2",
      name: "Isha Rao",
      podId: "pod-1",
      role: "Customer Support Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]), // Sunday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-3",
      name: "Priya Sharma",
      podId: "pod-1",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-4",
      name: "Rohan Gupta",
      podId: "pod-1",
      role: "Retention Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([6]), // Saturday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-5",
      name: "Kavita Iyer",
      podId: "pod-1",
      role: "Cart Conversion Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-6",
      name: "Varun Nair",
      podId: "pod-1",
      role: "NDR Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([1]), // Monday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-7",
      name: "Sneha Kulkarni",
      podId: "pod-1",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },

    // Pod 2 (emp-8 to emp-14, plus emp-34)
    {
      id: "emp-8",
      name: "Rohan Deshmukh",
      podId: "pod-2",
      role: "Operations Lead",
      isPodLead: true,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-9",
      name: "Ananya Joshi",
      podId: "pod-2",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-10",
      name: "Rahul Verma",
      podId: "pod-2",
      role: "Cart Conversion Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([6]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-11",
      name: "Divya Pillai",
      podId: "pod-2",
      role: "Retention Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-12",
      name: "Amit Chawla",
      podId: "pod-2",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([2]), // Tuesday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-13",
      name: "Neha Bhat",
      podId: "pod-2",
      role: "NDR Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-14",
      name: "Karan Malhotra",
      podId: "pod-2",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([3]), // Wednesday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },

    // Pod 3 (emp-15 to emp-19, plus emp-33)
    {
      id: "emp-15",
      name: "Vikram Nair",
      podId: "pod-3",
      role: "Operations Lead",
      isPodLead: true,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-16",
      name: "Pooja Sundaram",
      podId: "pod-3",
      role: "Support Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([6]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-17",
      name: "Manish Tiwari",
      podId: "pod-3",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-18",
      name: "Swati Reddy",
      podId: "pod-3",
      role: "Cart Conversion Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([4]), // Thursday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-19",
      name: "Arjun Kapoor",
      podId: "pod-3",
      role: "NDR Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },

    // Pod 4 (emp-20 to emp-26)
    {
      id: "emp-20",
      name: "Tanvi Hegde",
      podId: "pod-4",
      role: "Support Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-21",
      name: "Kunal Singhal",
      podId: "pod-4",
      role: "Support Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([1]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-22",
      name: "Kabir Joshi",
      podId: "pod-4",
      role: "Operations Lead",
      isPodLead: true,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-23",
      name: "Meera Nambiar",
      podId: "pod-4",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([6]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-24",
      name: "Harish Menon",
      podId: "pod-4",
      role: "NDR Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-25",
      name: "Ritika Sen",
      podId: "pod-4",
      role: "Cart Conversion Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-26",
      name: "Gaurav Bansal",
      podId: "pod-4",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([5]), // Friday
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },

    // Pod 5 (emp-27 to emp-31)
    {
      id: "emp-27",
      name: "Siddharth Rao",
      podId: "pod-5",
      role: "Support Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-28",
      name: "Shreya Mukherjee",
      podId: "pod-5",
      role: "NDR Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([6]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-29",
      name: "Nikhil Saxena",
      podId: "pod-5",
      role: "Operations Lead",
      isPodLead: true,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-30",
      name: "Deepa Krishnan",
      podId: "pod-5",
      role: "Support Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([1]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-31",
      name: "Tarun Bhardwaj",
      podId: "pod-5",
      role: "Cart Conversion Associate",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },

    // Multi-brand / Float specialists (emp-32, emp-33, emp-34)
    {
      id: "emp-32",
      name: "Ananya Patel",
      podId: "pod-1",
      role: "Multi-Brand Support Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-33",
      name: "Aditya Verma",
      podId: "pod-3",
      role: "Multi-Brand Retention Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([6]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
    {
      id: "emp-34",
      name: "Riya Sen",
      podId: "pod-2",
      role: "Multi-Brand NDR Specialist",
      isPodLead: false,
      preferredWeeklyOffDays: JSON.stringify([0]),
      maxConsecutiveWorkingDays: 6,
      weeklyOffsPerWeek: 1,
      active: true,
    },
  ];
  await db.insert(employees).values(employeeData);

  // 3. Brands (24 total)
  const brandData = [
    // 19 Single-resource/simple brands
    { id: "brand-1", name: "Kiro Botanicals", active: true },
    { id: "brand-2", name: "Soulflower Organics", active: true }, // Deliberate 365-day single resource structural gap!
    { id: "brand-3", name: "Bare Anatomy Care", active: true },
    { id: "brand-4", name: "The Ayurveda Co", active: true },
    { id: "brand-5", name: "Plum Goodness Labs", active: true },
    { id: "brand-6", name: "Dot & Key Skincare", active: true },
    { id: "brand-7", name: "Foxtale Naturals", active: true },
    { id: "brand-8", name: "Snitch Streetwear", active: true },
    { id: "brand-9", name: "Beyours Menswear", active: true },
    { id: "brand-10", name: "Mokobara Travel", active: true },
    { id: "brand-11", name: "Souled Store Daily", active: true },
    { id: "brand-12", name: "Neemans Footwear", active: true },
    { id: "brand-13", name: "BlissClub Athletics", active: true },
    { id: "brand-14", name: "DaMENSCH Essentials", active: true },
    { id: "brand-15", name: "Blue Tokai Coffee", active: true },
    { id: "brand-16", name: "Sleepy Owl Brews", active: true },
    { id: "brand-17", name: "The Whole Truth Foods", active: true },
    { id: "brand-18", name: "Yoga Bar Nutrition", active: true },
    { id: "brand-19", name: "Country Delight Fresh", active: true },
    // 5 Multi-employee brands
    { id: "brand-20", name: "SleepyCat Mattresses", active: true }, // Shared process with minStaff = 2
    { id: "brand-21", name: "Wakefit Home", active: true },        // 7-day CS + Mon-Sat NDR
    { id: "brand-22", name: "Nestasia Living", active: true },
    { id: "brand-23", name: "Portronics Gadgets", active: true },
    { id: "brand-24", name: "Boult Audio Gear", active: true },
  ];
  await db.insert(brands).values(brandData);

  // 4. Processes
  const processData = [
    // Brand 1: Kiro Botanicals
    { id: "proc-1-cs", brandId: "brand-1", type: "Customer Support", calendarRule: "ALL_EXCEPT_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-1-ndr", brandId: "brand-1", type: "NDR Management", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },

    // Brand 2: Soulflower Organics (DELIBERATE STRUCTURAL GAP: 365-day single resource)
    { id: "proc-2-cs", brandId: "brand-2", type: "Customer Support", calendarRule: "ALL_365", minStaffDefault: 1 },

    // Brands 3 to 19: single resource brands
    { id: "proc-3-cs", brandId: "brand-3", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-4-cs", brandId: "brand-4", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-5-cs", brandId: "brand-5", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-6-cs", brandId: "brand-6", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-7-cs", brandId: "brand-7", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-8-cs", brandId: "brand-8", type: "Customer Support", calendarRule: "ALL_EXCEPT_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-9-cs", brandId: "brand-9", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-10-cs", brandId: "brand-10", type: "Customer Support", calendarRule: "ALL_EXCEPT_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-11-cs", brandId: "brand-11", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-12-cs", brandId: "brand-12", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-13-cs", brandId: "brand-13", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-14-cs", brandId: "brand-14", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-15-cs", brandId: "brand-15", type: "Customer Support", calendarRule: "ALL_365", minStaffDefault: 1 },
    { id: "proc-16-cs", brandId: "brand-16", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-17-cs", brandId: "brand-17", type: "Customer Support", calendarRule: "ALL_EXCEPT_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-18-cs", brandId: "brand-18", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-19-cs", brandId: "brand-19", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },

    // Brand 20: SleepyCat Mattresses (SHARED PROCESS: minStaffDefault = 2)
    { id: "proc-20-cs", brandId: "brand-20", type: "Customer Support", calendarRule: "ALL_365", minStaffDefault: 2 },
    { id: "proc-20-cart", brandId: "brand-20", type: "Abandoned Cart Conversion", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },

    // Brand 21: Wakefit Home (ONE 7-DAYS, ONE MON-SAT)
    { id: "proc-21-cs", brandId: "brand-21", type: "Customer Support", calendarRule: "ALL_365", minStaffDefault: 1 },
    { id: "proc-21-ndr", brandId: "brand-21", type: "NDR Management", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },

    // Brand 22: Nestasia Living
    { id: "proc-22-cs", brandId: "brand-22", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-22-ret", brandId: "brand-22", type: "Retention & Loyalty", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },

    // Brand 23: Portronics Gadgets
    { id: "proc-23-cs", brandId: "brand-23", type: "Customer Support", calendarRule: "ALL_EXCEPT_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-23-ndr", brandId: "brand-23", type: "NDR Management", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },

    // Brand 24: Boult Audio Gear
    { id: "proc-24-cs", brandId: "brand-24", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
    { id: "proc-24-cart", brandId: "brand-24", type: "Abandoned Cart Conversion", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
  ];
  await db.insert(processes).values(processData);

  // 5. Assignments (Many-to-many, supporting multi-brand / multi-process)
  const assignmentData = [
    // Brand 1: Aarav Mehta covers CS and NDR; Ananya Patel (float) also assigned as secondary
    { id: "asgn-1-1", employeeId: "emp-1", processId: "proc-1-cs", isPrimary: true },
    { id: "asgn-1-2", employeeId: "emp-1", processId: "proc-1-ndr", isPrimary: true },
    { id: "asgn-1-3", employeeId: "emp-32", processId: "proc-1-cs", isPrimary: false },

    // Brand 2: Isha Rao alone (DELIBERATE STRUCTURAL GAP)
    { id: "asgn-2-1", employeeId: "emp-2", processId: "proc-2-cs", isPrimary: true },

    // Brands 3 to 19 single assignments
    { id: "asgn-3-1", employeeId: "emp-3", processId: "proc-3-cs", isPrimary: true },
    { id: "asgn-4-1", employeeId: "emp-4", processId: "proc-4-cs", isPrimary: true },
    { id: "asgn-5-1", employeeId: "emp-5", processId: "proc-5-cs", isPrimary: true },
    { id: "asgn-6-1", employeeId: "emp-6", processId: "proc-6-cs", isPrimary: true },
    { id: "asgn-7-1", employeeId: "emp-7", processId: "proc-7-cs", isPrimary: true },
    { id: "asgn-7-2", employeeId: "emp-32", processId: "proc-7-cs", isPrimary: false }, // Multi-brand float
    { id: "asgn-8-1", employeeId: "emp-8", processId: "proc-8-cs", isPrimary: true },
    { id: "asgn-9-1", employeeId: "emp-9", processId: "proc-9-cs", isPrimary: true },
    { id: "asgn-10-1", employeeId: "emp-10", processId: "proc-10-cs", isPrimary: true },
    { id: "asgn-10-2", employeeId: "emp-34", processId: "proc-10-cs", isPrimary: false }, // Multi-brand NDR
    { id: "asgn-11-1", employeeId: "emp-11", processId: "proc-11-cs", isPrimary: true },
    { id: "asgn-12-1", employeeId: "emp-12", processId: "proc-12-cs", isPrimary: true },
    { id: "asgn-12-2", employeeId: "emp-34", processId: "proc-12-cs", isPrimary: false }, // Multi-brand NDR
    { id: "asgn-13-1", employeeId: "emp-13", processId: "proc-13-cs", isPrimary: true },
    { id: "asgn-14-1", employeeId: "emp-14", processId: "proc-14-cs", isPrimary: true },
    { id: "asgn-15-1", employeeId: "emp-15", processId: "proc-15-cs", isPrimary: true },
    { id: "asgn-15-2", employeeId: "emp-33", processId: "proc-15-cs", isPrimary: false }, // Multi-brand Retention
    { id: "asgn-16-1", employeeId: "emp-16", processId: "proc-16-cs", isPrimary: true },
    { id: "asgn-16-2", employeeId: "emp-33", processId: "proc-16-cs", isPrimary: false }, // Multi-brand Retention
    { id: "asgn-17-1", employeeId: "emp-17", processId: "proc-17-cs", isPrimary: true },
    { id: "asgn-18-1", employeeId: "emp-18", processId: "proc-18-cs", isPrimary: true },
    { id: "asgn-19-1", employeeId: "emp-19", processId: "proc-19-cs", isPrimary: true },

    // Brand 20: SleepyCat (CS minStaff=2, emp-20 and emp-21 share it; emp-22 does Cart)
    { id: "asgn-20-1", employeeId: "emp-20", processId: "proc-20-cs", isPrimary: true },
    { id: "asgn-20-2", employeeId: "emp-21", processId: "proc-20-cs", isPrimary: true },
    { id: "asgn-20-3", employeeId: "emp-22", processId: "proc-20-cart", isPrimary: true },

    // Brand 21: Wakefit Home (emp-23 does CS, emp-24 does NDR)
    { id: "asgn-21-1", employeeId: "emp-23", processId: "proc-21-cs", isPrimary: true },
    { id: "asgn-21-2", employeeId: "emp-24", processId: "proc-21-ndr", isPrimary: true },

    // Brand 22: Nestasia Living (emp-25 does CS, emp-26 does Ret)
    { id: "asgn-22-1", employeeId: "emp-25", processId: "proc-22-cs", isPrimary: true },
    { id: "asgn-22-2", employeeId: "emp-26", processId: "proc-22-ret", isPrimary: true },

    // Brand 23: Portronics Gadgets (emp-27 and emp-29 share CS, emp-28 does NDR)
    { id: "asgn-23-1", employeeId: "emp-27", processId: "proc-23-cs", isPrimary: true },
    { id: "asgn-23-2", employeeId: "emp-29", processId: "proc-23-cs", isPrimary: false },
    { id: "asgn-23-3", employeeId: "emp-28", processId: "proc-23-ndr", isPrimary: true },

    // Brand 24: Boult Audio Gear (emp-30 does CS, emp-31 does Cart)
    { id: "asgn-24-1", employeeId: "emp-30", processId: "proc-24-cs", isPrimary: true },
    { id: "asgn-24-2", employeeId: "emp-31", processId: "proc-24-cart", isPrimary: true },
  ];
  await db.insert(assignments).values(assignmentData);

  // 6. Indian Public Holidays for November 2026
  const holidayData = [
    { id: "hol-1", date: "2026-11-08", name: "Diwali (Deepavali)" },
    { id: "hol-2", date: "2026-11-09", name: "Govardhan Puja" },
    { id: "hol-3", date: "2026-11-24", name: "Guru Nanak Jayanti" },
  ];
  await db.insert(holidays).values(holidayData);

  // 7. Planned Leaves and Comp-offs for November 2026
  const leaveData = [
    { id: "leave-1", employeeId: "emp-1", date: "2026-11-15", type: "PLANNED", status: "APPROVED" },
    { id: "leave-2", employeeId: "emp-3", date: "2026-11-18", type: "PLANNED", status: "APPROVED" },
    { id: "leave-3", employeeId: "emp-8", date: "2026-11-04", type: "PLANNED", status: "APPROVED" },
    { id: "leave-4", employeeId: "emp-20", date: "2026-11-12", type: "PLANNED", status: "APPROVED" },
    { id: "leave-5", employeeId: "emp-22", date: "2026-11-20", type: "PLANNED", status: "APPROVED" },
    { id: "leave-6", employeeId: "emp-18", date: "2026-11-25", type: "PLANNED", status: "PENDING" },
    { id: "leave-7", employeeId: "emp-10", date: "2026-11-10", type: "COMP_OFF", status: "APPROVED" },
    { id: "leave-8", employeeId: "emp-6", date: "2026-11-16", type: "COMP_OFF", status: "APPROVED" },
  ];
  await db.insert(leaves).values(leaveData);

  // 8. Coverage Overrides (Demonstrating specific spike overrides, e.g. Black Friday / Cyber Monday week)
  const overrideData = [
    { id: "ovr-1", processId: "proc-8-cs", date: "2026-11-27", weekday: null, minStaff: 2 }, // Sale spike
  ];
  await db.insert(coverageOverrides).values(overrideData);

  console.log("Database seeded successfully.");
  console.log(`- 5 Pods`);
  console.log(`- 34 Employees`);
  console.log(`- 24 Brands (19 single-resource, 5 multi-resource)`);
  console.log(`- ${processData.length} Processes across 4 types`);
  console.log(`- ${assignmentData.length} Assignments (with multi-brand float assignments)`);
  console.log(`- 3 Public Holidays for Nov 2026`);
  console.log(`- 8 Leaves (6 planned, 2 comp-offs)`);
  console.log(`- Deliberate structural gap prepared on Brand 'Soulflower Organics' (proc-2-cs, ALL_365, single resource)`);
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("seed.ts")) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
