import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const logFiles = sqliteTable("log_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadTimestamp: integer("upload_timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  analysisTimestamp: integer("analysis_timestamp", { mode: "timestamp" }),
  errorsDetected: text("errors_detected", { mode: "json" }),
  anomalies: text("anomalies", { mode: "json" }),
  predictions: text("predictions", { mode: "json" }),
  suggestions: text("suggestions", { mode: "json" }),
  totalErrors: integer("total_errors").default(0),
  criticalErrors: integer("critical_errors").default(0),
  highErrors: integer("high_errors").default(0),
  mediumErrors: integer("medium_errors").default(0),
  lowErrors: integer("low_errors").default(0),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  analysisResult: text("analysis_result", { mode: "json" }),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const analysisHistory = sqliteTable("analysis_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileId: integer("file_id").references(() => logFiles.id),
  userId: integer("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadTimestamp: integer("upload_timestamp", { mode: "timestamp" }).notNull(),
  analysisTimestamp: integer("analysis_timestamp", {
    mode: "timestamp",
  }).notNull(),
  errorsDetected: text("errors_detected", { mode: "json" }),
  anomalies: text("anomalies", { mode: "json" }),
  predictions: text("predictions", { mode: "json" }),
  suggestions: text("suggestions", { mode: "json" }),
  totalErrors: integer("total_errors").notNull(),
  criticalErrors: integer("critical_errors").notNull(),
  highErrors: integer("high_errors").notNull(),
  mediumErrors: integer("medium_errors").notNull(),
  lowErrors: integer("low_errors").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").default(0), // Progress percentage (0-100)
  currentStep: text("current_step").default("Initializing"), // Current processing step
  processingTime: real("processing_time"), // Time taken for processing in seconds
  modelAccuracy: real("model_accuracy"), // Accuracy of the model used
  errorMessage: text("error_message"),
  aiSuggestions: text("ai_suggestions", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const mlModels = sqliteTable("ml_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  modelType: text("model_type").notNull(),
  accuracy: real("accuracy"),
  precision: real("precision"),
  recall: real("recall"),
  f1Score: real("f1_score"),
  trainingDataSize: integer("training_data_size"),
  validationDataSize: integer("validation_data_size"),
  testDataSize: integer("test_data_size"),
  trainingTime: integer("training_time"),
  trainedAt: integer("trained_at", { mode: "timestamp" }),
  createdBy: integer("created_by").references(() => users.id),
  hyperparameters: text("hyperparameters", { mode: "json" }),
  trainingMetrics: text("training_metrics", { mode: "json" }),
  modelPath: text("model_path"),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const errorPatterns = sqliteTable("error_patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pattern: text("pattern").notNull(),
  regex: text("regex").notNull(),
  description: text("description"),
  severity: text("severity").notNull(),
  errorType: text("error_type").notNull(),
  category: text("category"),
  suggestedFix: text("suggested_fix"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions", { mode: "json" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userRoles = sqliteTable("user_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  roleId: integer("role_id").references(() => roles.id),
  assignedAt: integer("assigned_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  assignedBy: integer("assigned_by").references(() => users.id),
});

export const trainingModules = sqliteTable("training_modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  difficultyLevel: text("difficulty_level").default("beginner"),
  estimatedDuration: integer("estimated_duration"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userTraining = sqliteTable("user_training", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  moduleId: integer("module_id").references(() => trainingModules.id),
  progress: integer("progress").default(0),
  completed: integer("completed", { mode: "boolean" }).default(false),
  score: integer("score"),
  startedAt: integer("started_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const modelTrainingSessions = sqliteTable("model_training_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id").references(() => mlModels.id),
  sessionName: text("session_name").notNull(),
  trainingData: text("training_data", { mode: "json" }).notNull(),
  hyperparameters: text("hyperparameters", { mode: "json" }),
  metrics: text("metrics", { mode: "json" }),
  status: text("status").default("pending"),
  startedAt: integer("started_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  initiatedBy: integer("initiated_by").references(() => users.id),
});

export const modelDeployments = sqliteTable("model_deployments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id").references(() => mlModels.id),
  deploymentName: text("deployment_name").notNull(),
  environment: text("environment").notNull(),
  status: text("status").default("pending"),
  deployedAt: integer("deployed_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  deployedBy: integer("deployed_by").references(() => users.id),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: integer("resource_id"),
  oldValues: text("old_values", { mode: "json" }),
  newValues: text("new_values", { mode: "json" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  readAt: integer("read_at", { mode: "timestamp" }),
});

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  denseMode: integer("dense_mode", { mode: "boolean" }).default(false),
  autoRefresh: integer("auto_refresh", { mode: "boolean" }).default(false),
  refreshInterval: integer("refresh_interval").default(30),
  theme: text("theme").default("light"),
  language: text("language").default("en"),
  timezone: text("timezone").default("UTC"),
  notificationPreferences: text("notification_preferences", {
    mode: "json",
  }).default('{"email": true, "push": true, "sms": false}'),
  displayPreferences: text("display_preferences", { mode: "json" }).default(
    '{"itemsPerPage": 10, "defaultView": "grid"}'
  ),
  navigationPreferences: text("navigation_preferences", {
    mode: "json",
  }).default(
    '{"showTopNav": true, "topNavStyle": "fixed", "topNavColor": "#1f2937", "showSideNav": true, "sideNavStyle": "collapsible", "sideNavPosition": "left", "sideNavColor": "#374151", "enableBreadcrumbs": true}'
  ),
  apiSettings: text("api_settings", { mode: "json" }).default(
    '{"geminiApiKey": "", "webhookUrl": "", "maxFileSize": "10", "autoAnalysis": true}'
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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
  validatedAt: integer("validated_at"),
  features: text("features"), // JSON
  originalData: text("original_data"), // JSON
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LogFile = typeof logFiles.$inferSelect;
export type InsertLogFile = typeof logFiles.$inferInsert;
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;
export type AnalysisHistory = typeof analysisHistory.$inferSelect;
export type InsertAnalysisHistory = typeof analysisHistory.$inferInsert;
export type MlModel = typeof mlModels.$inferSelect;
export type InsertMlModel = typeof mlModels.$inferInsert;
export type ErrorPattern = typeof errorPatterns.$inferSelect;
export type InsertErrorPattern = typeof errorPatterns.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertTrainingModule = typeof trainingModules.$inferInsert;
export type UserTraining = typeof userTraining.$inferSelect;
export type InsertUserTraining = typeof userTraining.$inferInsert;
export type ModelTrainingSession = typeof modelTrainingSessions.$inferSelect;
export type InsertModelTrainingSession =
  typeof modelTrainingSessions.$inferInsert;
export type ModelDeployment = typeof modelDeployments.$inferSelect;
export type InsertModelDeployment = typeof modelDeployments.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type AiTrainingData = typeof aiTrainingData.$inferSelect;
export type InsertAiTrainingData = typeof aiTrainingData.$inferInsert;

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertLogFileSchema = createInsertSchema(logFiles);
export const insertErrorLogSchema = createInsertSchema(errorLogs);
export const insertAnalysisHistorySchema = createInsertSchema(analysisHistory);
export const insertMlModelSchema = createInsertSchema(mlModels);
export const insertErrorPatternSchema = createInsertSchema(errorPatterns);
export const insertRoleSchema = createInsertSchema(roles);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const insertTrainingModuleSchema = createInsertSchema(trainingModules);
export const insertUserTrainingSchema = createInsertSchema(userTraining);
export const insertModelTrainingSessionSchema = createInsertSchema(
  modelTrainingSessions
);
export const insertModelDeploymentSchema = createInsertSchema(modelDeployments);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const insertAiTrainingDataSchema = createInsertSchema(aiTrainingData);
