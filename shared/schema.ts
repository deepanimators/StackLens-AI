import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // user, admin, super_admin
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  department: text("department"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastLogin: integer("last_login", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

export const logFiles = sqliteTable("log_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  storeNumber: text("store_number"), // NEW: Store identifier
  kioskNumber: text("kiosk_number"), // NEW: Kiosk identifier
  uploadTimestamp: integer("upload_timestamp", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  analysisTimestamp: integer("analysis_timestamp", { mode: "timestamp" }),
  errorsDetected: text("errors_detected"),
  anomalies: text("anomalies"),
  predictions: text("predictions"),
  suggestions: text("suggestions"),
  totalErrors: integer("total_errors").default(0),
  criticalErrors: integer("critical_errors").default(0),
  highErrors: integer("high_errors").default(0),
  mediumErrors: integer("medium_errors").default(0),
  lowErrors: integer("low_errors").default(0),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  analysisResult: text("analysis_result"),
});

export const errorLogs = sqliteTable("error_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileId: integer("file_id").references(() => logFiles.id),
  lineNumber: integer("line_number").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }),
  severity: text("severity").notNull(),
  errorType: text("error_type").notNull(),
  message: text("message").notNull(),
  fullText: text("full_text").notNull(),
  pattern: text("pattern"),
  resolved: integer("resolved", { mode: "boolean" }).default(false),
  aiSuggestion: text("ai_suggestion", { mode: "json" }),
  mlPrediction: text("ml_prediction", { mode: "json" }),
  mlConfidence: real("ml_confidence").default(0.0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

export const analysisHistory = sqliteTable("analysis_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileId: integer("file_id").references(() => logFiles.id),
  userId: integer("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadTimestamp: integer("upload_timestamp").notNull(),
  analysisTimestamp: integer("analysis_timestamp").notNull(),
  errorsDetected: text("errors_detected"),
  anomalies: text("anomalies"),
  predictions: text("predictions"),
  suggestions: text("suggestions"),
  totalErrors: integer("total_errors").notNull(),
  criticalErrors: integer("critical_errors").notNull(),
  highErrors: integer("high_errors").notNull(),
  mediumErrors: integer("medium_errors").notNull(),
  lowErrors: integer("low_errors").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  aiSuggestions: text("ai_suggestions"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`strftime('%s', 'now') * 1000`),
  processingTime: real("processing_time").default(0),
  modelAccuracy: real("model_accuracy").default(0),
  progress: integer("progress").default(0),
  currentStep: text("current_step").default("Pending analysis"),
});

export const mlModels = sqliteTable("ml_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  version: text("version").notNull(),
  accuracy: real("accuracy"),
  precision: real("precision"),
  recall: real("recall"),
  f1Score: real("f1_score"),
  cvScore: real("cv_score"),
  trainingLoss: real("training_loss"),
  validationLoss: real("validation_loss"),
  topFeatures: text("top_features", { mode: "json" }),
  modelPath: text("model_path").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  trainedAt: integer("trained_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  trainingData: text("training_data", { mode: "json" }),
  trainingDataSize: integer("training_data_size"),
  validationDataSize: integer("validation_data_size"),
  testDataSize: integer("test_data_size"),
  hyperparameters: text("hyperparameters", { mode: "json" }),
  trainingMetrics: text("training_metrics", { mode: "json" }),
  createdBy: integer("created_by").references(() => users.id),
  trainingTime: integer("training_time"), // in milliseconds
});

export const errorPatterns = sqliteTable("error_patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pattern: text("pattern").notNull(),
  errorType: text("error_type").notNull(),
  severity: text("severity").notNull(),
  description: text("description"),
  regex: text("regex").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`strftime('%s', 'now') * 1000`
  ),
  category: text("category"),
  suggestedFix: text("suggested_fix"),
  occurrenceCount: integer("occurrence_count").default(1),
  successRate: real("success_rate").default(0.8),
  avgResolutionTime: text("avg_resolution_time").default("30 minutes"),
});

// Vector embeddings table for RAG
export const errorEmbeddings = sqliteTable("error_embeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorId: integer("error_id").references(() => errorLogs.id),
  embedding: text("embedding"), // JSON array of numbers
  modelVersion: text("model_version").default("BAAI/bge-base-en-v1.5"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`strftime('%s', 'now') * 1000`
  ),
});

// Success tracking for continuous learning
export const suggestionFeedback = sqliteTable("suggestion_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorId: integer("error_id").references(() => errorLogs.id),
  suggestionId: text("suggestion_id"),
  wasHelpful: integer("was_helpful", { mode: "boolean" }),
  resolutionTime: integer("resolution_time"), // in minutes
  userRating: integer("user_rating"), // 1-5 scale
  feedbackNotes: text("feedback_notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`strftime('%s', 'now') * 1000`
  ),
});

// Pattern success metrics
export const patternMetrics = sqliteTable("pattern_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patternHash: text("pattern_hash").notNull().unique(),
  totalOccurrences: integer("total_occurrences").default(0),
  successfulResolutions: integer("successful_resolutions").default(0),
  avgResolutionTime: integer("avg_resolution_time"), // in minutes
  successRate: real("success_rate").default(0),
  lastUpdated: integer("last_updated", { mode: "timestamp" }).default(
    sql`strftime('%s', 'now') * 1000`
  ),
});

// Admin Role Management
export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions", { mode: "json" }).notNull(), // Array of permission strings
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

export const userRoles = sqliteTable("user_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  roleId: integer("role_id")
    .references(() => roles.id)
    .notNull(),
  assignedBy: integer("assigned_by")
    .references(() => users.id)
    .notNull(),
  assignedAt: integer("assigned_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// User Training System
export const trainingModules = sqliteTable("training_modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(), // Training content/curriculum
  difficulty: text("difficulty").notNull().default("beginner"), // beginner, intermediate, advanced
  estimatedDuration: integer("estimated_duration"), // in minutes
  prerequisites: text("prerequisites", { mode: "json" }), // Array of required module IDs
  tags: text("tags", { mode: "json" }), // Array of tag strings
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

export const userTraining = sqliteTable("user_training", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  moduleId: integer("module_id")
    .references(() => trainingModules.id)
    .notNull(),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, failed
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  progress: real("progress").default(0), // 0-100%
  score: real("score"), // Final score if completed
  attempts: integer("attempts").default(0),
  lastActivity: integer("last_activity", { mode: "timestamp" }),
  notes: text("notes"),
});

// AI Model Training and Management
export const modelTrainingSessions = sqliteTable("model_training_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id").references(() => mlModels.id),
  sessionName: text("session_name"), // Add missing session_name field
  initiatedBy: integer("initiated_by")
    .references(() => users.id)
    .notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  trainingData: text("training_data"), // Add missing training_data field
  trainingDataSize: integer("training_data_size"),
  epochs: integer("epochs"),
  batchSize: integer("batch_size"),
  learningRate: real("learning_rate"),
  hyperparameters: text("hyperparameters"), // Add missing hyperparameters field
  metrics: text("metrics", { mode: "json" }), // Training metrics and results
  logs: text("logs"), // Training logs
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  duration: integer("duration"), // in seconds
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

export const modelDeployments = sqliteTable("model_deployments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .references(() => mlModels.id)
    .notNull(),
  version: text("version").notNull(),
  deployedBy: integer("deployed_by")
    .references(() => users.id)
    .notNull(),
  status: text("status").notNull().default("active"), // active, inactive, deprecated
  endpoint: text("endpoint"),
  configuration: text("configuration", { mode: "json" }),
  healthStatus: text("health_status").default("healthy"), // healthy, warning, error
  lastHealthCheck: integer("last_health_check", { mode: "timestamp" }),
  deployedAt: integer("deployed_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  deactivatedAt: integer("deactivated_at", { mode: "timestamp" }),
});

// Audit Logs
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // create, update, delete, login, logout, etc.
  entityType: text("entity_type").notNull(), // user, model, role, etc.
  entityId: integer("entity_id"),
  oldValues: text("old_values", { mode: "json" }),
  newValues: text("new_values", { mode: "json" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

// System Notifications
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // info, warning, error, success
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data", { mode: "json" }), // Additional notification data
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  readAt: integer("read_at", { mode: "timestamp" }),
});

// Settings table for UI and app settings
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value", { mode: "json" }).notNull(),
  category: text("category").notNull(), // ui, notifications, api, integration
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

// User-specific settings (preferences, theme, language, etc.)
export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  theme: text("theme").default("system"), // light, dark, system
  language: text("language").default("en"), // en, es, fr, hi
  notifications: text("notifications", { mode: "json" }).default("{}"), // Notification preferences
  dashboardLayout: text("dashboard_layout", { mode: "json" }), // Custom dashboard config
  autoRefresh: integer("auto_refresh", { mode: "boolean" }).default(true),
  refreshInterval: integer("refresh_interval").default(30000), // in milliseconds
  emailNotifications: integer("email_notifications", { mode: "boolean" }).default(true),
  pushNotifications: integer("push_notifications", { mode: "boolean" }).default(true),
  timezone: text("timezone").default("UTC"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  timeFormat: text("time_format").default("12h"), // 12h or 24h
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

// Stores table - Physical store locations
export const stores = sqliteTable("stores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storeNumber: text("store_number").notNull().unique(),
  name: text("name").notNull(),
  location: text("location"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("USA"),
  phoneNumber: text("phone_number"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

// Kiosks table - Kiosks within stores
export const kiosks = sqliteTable("kiosks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kioskNumber: text("kiosk_number").notNull().unique(),
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(),
  name: text("name").notNull(),
  location: text("location"), // Location within store (e.g., "Front entrance", "Section A")
  deviceType: text("device_type"), // Type of kiosk device
  ipAddress: text("ip_address"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastCheckIn: integer("last_check_in", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

// AI/ML Training Data from Excel
export const aiTrainingData = sqliteTable("ai_training_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorType: text("error_type").notNull(),
  severity: text("severity").notNull(),
  suggestedSolution: text("suggested_solution").notNull(),
  sourceFile: text("source_file"),
  lineNumber: integer("line_number"),
  contextBefore: text("context_before"),
  contextAfter: text("context_after"),
  confidence: real("confidence").default(0.8),
  source: text("source"), // Excel file source
  isValidated: integer("is_validated", { mode: "boolean" }).default(false),
  validatedBy: text("validated_by"),
  validatedAt: integer("validated_at", { mode: "timestamp" }),
  features: text("features"), // JSON
  originalData: text("original_data"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch() * 1000)`
  ),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLogFileSchema = createInsertSchema(logFiles).omit({
  id: true,
  uploadTimestamp: true,
});

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAnalysisHistorySchema = createInsertSchema(
  analysisHistory
).omit({
  id: true,
  createdAt: true,
});

export const insertMlModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  trainedAt: true,
});

export const insertErrorPatternSchema = createInsertSchema(errorPatterns).omit({
  id: true,
  createdAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertTrainingModuleSchema = createInsertSchema(
  trainingModules
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserTrainingSchema = createInsertSchema(userTraining).omit({
  id: true,
});

export const insertModelTrainingSessionSchema = createInsertSchema(
  modelTrainingSessions
).omit({
  id: true,
  createdAt: true,
});

export const insertModelDeploymentSchema = createInsertSchema(
  modelDeployments
).omit({
  id: true,
  deployedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKioskSchema = createInsertSchema(kiosks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiTrainingDataSchema = createInsertSchema(
  aiTrainingData
).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LogFile = typeof logFiles.$inferSelect;
export type InsertLogFile = z.infer<typeof insertLogFileSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type AnalysisHistory = typeof analysisHistory.$inferSelect;
export type InsertAnalysisHistory = z.infer<typeof insertAnalysisHistorySchema>;
export type MlModel = typeof mlModels.$inferSelect;
export type InsertMlModel = z.infer<typeof insertMlModelSchema>;
export type ErrorPattern = typeof errorPatterns.$inferSelect;
export type InsertErrorPattern = z.infer<typeof insertErrorPatternSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type UserTraining = typeof userTraining.$inferSelect;
export type InsertUserTraining = z.infer<typeof insertUserTrainingSchema>;
export type ModelTrainingSession = typeof modelTrainingSessions.$inferSelect;
export type InsertModelTrainingSession = z.infer<
  typeof insertModelTrainingSessionSchema
>;
export type ModelDeployment = typeof modelDeployments.$inferSelect;
export type InsertModelDeployment = z.infer<typeof insertModelDeploymentSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;
export type UserSetting = typeof userSettings.$inferSelect;
export type InsertUserSetting = z.infer<typeof insertUserSettingsSchema>;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Kiosk = typeof kiosks.$inferSelect;
export type InsertKiosk = z.infer<typeof insertKioskSchema>;
export type AiTrainingData = typeof aiTrainingData.$inferSelect;
export type InsertAiTrainingData = z.infer<typeof insertAiTrainingDataSchema>;

// Enums
export const SeverityEnum = z.enum(["critical", "high", "medium", "low"]);
export const AnalysisStatusEnum = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const UserRoleEnum = z.enum(["super_admin", "admin", "user"]);
export const TrainingStatusEnum = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "failed",
]);
export const DifficultyEnum = z.enum(["beginner", "intermediate", "advanced"]);
export const NotificationTypeEnum = z.enum([
  "info",
  "warning",
  "error",
  "success",
]);
export const ModelStatusEnum = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);
export const DeploymentStatusEnum = z.enum([
  "active",
  "inactive",
  "deprecated",
]);
export const SettingsCategoryEnum = z.enum([
  "ui",
  "notifications",
  "api",
  "integration",
]);
