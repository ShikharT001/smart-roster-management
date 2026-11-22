CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`process_id` text NOT NULL,
	`is_primary` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coverage_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`process_id` text NOT NULL,
	`date` text,
	`weekday` integer,
	`min_staff` integer NOT NULL,
	FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pod_id` text NOT NULL,
	`role` text DEFAULT 'Operations Associate' NOT NULL,
	`is_pod_lead` integer DEFAULT false NOT NULL,
	`preferred_weekly_off_days` text DEFAULT '[]' NOT NULL,
	`max_consecutive_working_days` integer DEFAULT 6 NOT NULL,
	`weekly_offs_per_week` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`pod_id`) REFERENCES `pods`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holidays_date_unique` ON `holidays` (`date`);--> statement-breakpoint
CREATE TABLE `leaves` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text DEFAULT 'PLANNED' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lead_employee_id` text
);
--> statement-breakpoint
CREATE TABLE `processes` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`type` text NOT NULL,
	`calendar_rule` text DEFAULT 'EXCEPT_SUNDAYS_AND_HOLIDAYS' NOT NULL,
	`min_staff_default` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roster_change_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`roster_id` text NOT NULL,
	`at` text NOT NULL,
	`actor` text DEFAULT 'Operations Manager' NOT NULL,
	`description` text NOT NULL,
	`issues_before` text DEFAULT '[]' NOT NULL,
	`issues_after` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roster_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`roster_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'WORKING' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'AUTO' NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `rosters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rosters` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`generated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
