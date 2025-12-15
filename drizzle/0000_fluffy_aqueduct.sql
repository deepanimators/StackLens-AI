CREATE TABLE `ai_training_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`error_type` text NOT NULL,
	`severity` text NOT NULL,
	`suggested_solution` text NOT NULL,
	`source_file` text,
	`line_number` integer,
	`context_before` text,
	`context_after` text,
	`confidence` real DEFAULT 0.8,
	`source` text,
	`is_validated` integer DEFAULT false,
	`validated_by` text,
	`validated_at` integer,
	`features` text,
	`original_data` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analysis_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` integer,
	`user_id` integer,
	`filename` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`upload_timestamp` integer NOT NULL,
	`analysis_timestamp` integer NOT NULL,
	`errors_detected` text,
	`anomalies` text,
	`predictions` text,
	`suggestions` text,
	`total_errors` integer NOT NULL,
	`critical_errors` integer NOT NULL,
	`high_errors` integer NOT NULL,
	`medium_errors` integer NOT NULL,
	`low_errors` integer NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0,
	`current_step` text DEFAULT 'Initializing',
	`processing_time` real,
	`model_accuracy` real,
	`error_message` text,
	`ai_suggestions` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `log_files`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `api_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`api_key` text,
	`api_secret` text,
	`endpoint` text,
	`priority` integer DEFAULT 100 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_global` integer DEFAULT true NOT NULL,
	`user_id` integer,
	`rate_limit` integer,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`current_month_usage` integer DEFAULT 0 NOT NULL,
	`last_used` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_credentials_name_unique` ON `api_credentials` (`name`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer,
	`old_values` text,
	`new_values` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `automation_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`error_log_id` integer,
	`decision` text NOT NULL,
	`reason` text,
	`severity` text,
	`ml_confidence` real,
	`threshold` real,
	`passed` integer,
	`ticket_created` integer DEFAULT false,
	`ticket_key` text,
	`error` text,
	`executed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `error_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` integer,
	`store_number` text,
	`kiosk_number` text,
	`line_number` integer NOT NULL,
	`timestamp` integer,
	`severity` text NOT NULL,
	`error_type` text NOT NULL,
	`message` text NOT NULL,
	`full_text` text NOT NULL,
	`pattern` text,
	`resolved` integer DEFAULT false,
	`ai_suggestion` text,
	`ml_prediction` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `log_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `error_patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pattern` text NOT NULL,
	`regex` text NOT NULL,
	`description` text,
	`severity` text NOT NULL,
	`error_type` text NOT NULL,
	`category` text,
	`suggested_fix` text,
	`is_active` integer DEFAULT true,
	`occurrence_count` integer DEFAULT 1,
	`success_rate` real DEFAULT 0.8,
	`avg_resolution_time` text DEFAULT '30 minutes',
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jira_integration_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`is_secret` integer DEFAULT false,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jira_integration_config_key_unique` ON `jira_integration_config` (`key`);--> statement-breakpoint
CREATE TABLE `jira_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_key` text NOT NULL,
	`jira_id` text,
	`error_log_id` integer,
	`automation_id` integer,
	`title` text NOT NULL,
	`description` text,
	`severity` text NOT NULL,
	`jira_severity` text,
	`status` text DEFAULT 'open' NOT NULL,
	`detected_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jira_tickets_ticket_key_unique` ON `jira_tickets` (`ticket_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `jira_tickets_jira_id_unique` ON `jira_tickets` (`jira_id`);--> statement-breakpoint
CREATE TABLE `log_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`uploaded_by` integer,
	`store_number` text,
	`kiosk_number` text,
	`upload_timestamp` integer NOT NULL,
	`analysis_timestamp` integer,
	`errors_detected` text,
	`anomalies` text,
	`predictions` text,
	`suggestions` text,
	`total_errors` integer DEFAULT 0,
	`critical_errors` integer DEFAULT 0,
	`high_errors` integer DEFAULT 0,
	`medium_errors` integer DEFAULT 0,
	`low_errors` integer DEFAULT 0,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`analysis_result` text,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ml_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`description` text,
	`model_type` text NOT NULL,
	`accuracy` real,
	`precision` real,
	`recall` real,
	`f1_score` real,
	`training_data_size` integer,
	`validation_data_size` integer,
	`test_data_size` integer,
	`training_time` integer,
	`trained_at` integer,
	`created_by` integer,
	`hyperparameters` text,
	`training_metrics` text,
	`model_path` text,
	`is_active` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `model_deployments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer,
	`deployment_name` text NOT NULL,
	`environment` text NOT NULL,
	`status` text DEFAULT 'pending',
	`deployed_at` integer NOT NULL,
	`deployed_by` integer,
	FOREIGN KEY (`model_id`) REFERENCES `ml_models`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deployed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `model_training_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer,
	`session_name` text NOT NULL,
	`training_data` text NOT NULL,
	`hyperparameters` text,
	`metrics` text,
	`status` text DEFAULT 'pending',
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`initiated_by` integer,
	FOREIGN KEY (`model_id`) REFERENCES `ml_models`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`initiated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'info',
	`is_read` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`permissions` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `training_modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`difficulty_level` text DEFAULT 'beginner',
	`estimated_duration` integer,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`role_id` integer,
	`assigned_at` integer NOT NULL,
	`assigned_by` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`session_token` text NOT NULL,
	`device_info` text,
	`browser_info` text,
	`ip_address` text,
	`location` text,
	`created_at` integer NOT NULL,
	`last_active` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_session_token_unique` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`dense_mode` integer DEFAULT false,
	`auto_refresh` integer DEFAULT false,
	`refresh_interval` integer DEFAULT 30,
	`theme` text DEFAULT 'light',
	`language` text DEFAULT 'en',
	`timezone` text DEFAULT 'UTC',
	`notification_preferences` text DEFAULT '{"email": true, "push": true, "sms": false}',
	`display_preferences` text DEFAULT '{"itemsPerPage": 10, "defaultView": "grid"}',
	`navigation_preferences` text DEFAULT '{"showTopNav": true, "topNavStyle": "fixed", "topNavColor": "#1f2937", "showSideNav": true, "sideNavStyle": "collapsible", "sideNavPosition": "left", "sideNavColor": "#374151", "enableBreadcrumbs": true}',
	`api_settings` text DEFAULT '{"geminiApiKey": "", "webhookUrl": "", "maxFileSize": "10", "autoAnalysis": true}',
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_training` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`module_id` integer,
	`progress` integer DEFAULT 0,
	`completed` integer DEFAULT false,
	`score` integer,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `training_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`first_name` text,
	`last_name` text,
	`profile_image_url` text,
	`department` text,
	`is_active` integer DEFAULT true,
	`last_login` integer,
	`two_factor_secret` text,
	`two_factor_enabled` integer DEFAULT false,
	`two_factor_backup_codes` text,
	`recovery_email` text,
	`email_verified` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);