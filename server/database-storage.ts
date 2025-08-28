import {
  users,
  logFiles,
  errorLogs,
  analysisHistory,
  mlModels,
  errorPatterns,
  roles,
  userRoles,
  trainingModules,
  userTraining,
  modelTrainingSessions,
  modelDeployments,
  auditLogs,
  notifications,
  settings as userSettings,
  aiTrainingData,
  type User,
  type InsertUser,
  type LogFile,
  type InsertLogFile,
  type ErrorLog,
  type InsertErrorLog,
  type AnalysisHistory,
  type InsertAnalysisHistory,
  type MlModel,
  type InsertMlModel,
  type ErrorPattern,
  type InsertErrorPattern,
  type Role,
  type InsertRole,
  type UserRole,
  type InsertUserRole,
  type TrainingModule,
  type InsertTrainingModule,
  type UserTraining,
  type InsertUserTraining,
  type ModelTrainingSession,
  type InsertModelTrainingSession,
  type ModelDeployment,
  type InsertModelDeployment,
  type AuditLog,
  type InsertAuditLog,
  type Notification,
  type InsertNotification,
  type InsertSetting,
  type AiTrainingData,
  type InsertAiTrainingData,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Log file management
  getLogFile(id: number): Promise<LogFile | undefined>;
  getLogFilesByUser(userId: number): Promise<LogFile[]>;
  getAllLogFiles(): Promise<LogFile[]>;
  createLogFile(file: InsertLogFile): Promise<LogFile>;
  updateLogFile(
    id: number,
    file: Partial<InsertLogFile>
  ): Promise<LogFile | undefined>;
  deleteLogFile(id: number): Promise<boolean>;

  // Error log management
  getErrorLog(id: number): Promise<ErrorLog | undefined>;
  getErrorLogsByFile(fileId: number): Promise<ErrorLog[]>;
  getErrorLogsByFileWithPagination(
    fileId: number,
    page: number,
    limit: number
  ): Promise<{ errors: ErrorLog[]; total: number }>;
  createErrorLog(error: InsertErrorLog): Promise<ErrorLog>;
  updateErrorLog(
    id: number,
    error: Partial<InsertErrorLog>
  ): Promise<ErrorLog | undefined>;
  deleteErrorLog(id: number): Promise<boolean>;
  getAllErrors(): Promise<ErrorLog[]>;
  getErrorsByUser(userId: number): Promise<ErrorLog[]>;
  getErrorsByFile(fileId: number): Promise<ErrorLog[]>;
  getErrorsBySeverity(severity: string): Promise<ErrorLog[]>;

  // Analysis history
  getAnalysisHistory(id: number): Promise<AnalysisHistory | undefined>;
  getAnalysisHistoryByUser(userId: number): Promise<AnalysisHistory[]>;
  getAnalysisHistoryByFileId(
    fileId: number
  ): Promise<AnalysisHistory | undefined>;
  createAnalysisHistory(
    analysis: InsertAnalysisHistory
  ): Promise<AnalysisHistory>;
  updateAnalysisHistory(
    id: number,
    updates: Partial<InsertAnalysisHistory>
  ): Promise<AnalysisHistory | undefined>;
  deleteAnalysisHistory(id: number): Promise<boolean>;

  // ML models
  getMlModel(id: number): Promise<MlModel | undefined>;
  getActiveMlModel(): Promise<MlModel | undefined>;
  getAllMlModels(): Promise<MlModel[]>;
  createMlModel(model: InsertMlModel): Promise<MlModel>;
  updateMlModel(
    id: number,
    model: Partial<InsertMlModel>
  ): Promise<MlModel | undefined>;
  deleteMlModel(id: number): Promise<boolean>;

  // Error patterns
  getErrorPattern(id: number): Promise<ErrorPattern | undefined>;
  getActiveErrorPatterns(): Promise<ErrorPattern[]>;
  createErrorPattern(pattern: InsertErrorPattern): Promise<ErrorPattern>;
  updateErrorPattern(
    id: number,
    pattern: Partial<InsertErrorPattern>
  ): Promise<ErrorPattern | undefined>;
  deleteErrorPattern(id: number): Promise<boolean>;
  getAllErrorPatterns(): Promise<ErrorPattern[]>;
  saveErrorPattern(pattern: {
    pattern: string;
    regex: string;
    severity: string;
    category: string;
    description: string;
    solution: string;
    errorType?: string; // Optional, will fallback to category
  }): Promise<ErrorPattern>;

  // Admin Role Management
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;

  // User Role Management
  getUserRole(userId: number): Promise<UserRole | undefined>;
  getUserRoles(userId: number): Promise<UserRole[]>;
  assignUserRole(userRole: InsertUserRole): Promise<UserRole>;
  revokeUserRole(id: number): Promise<boolean>;

  // Training Modules
  getTrainingModule(id: number): Promise<TrainingModule | undefined>;
  getAllTrainingModules(): Promise<TrainingModule[]>;
  getTrainingModulesByUser(userId: number): Promise<TrainingModule[]>;
  createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule>;
  updateTrainingModule(
    id: number,
    module: Partial<InsertTrainingModule>
  ): Promise<TrainingModule | undefined>;
  deleteTrainingModule(id: number): Promise<boolean>;

  // User Training
  getUserTraining(
    userId: number,
    moduleId: number
  ): Promise<UserTraining | undefined>;
  getUserTrainingHistory(userId: number): Promise<UserTraining[]>;
  createUserTraining(training: InsertUserTraining): Promise<UserTraining>;
  updateUserTraining(
    id: number,
    training: Partial<InsertUserTraining>
  ): Promise<UserTraining | undefined>;

  // Model Training Sessions
  getModelTrainingSession(
    id: number
  ): Promise<ModelTrainingSession | undefined>;
  getModelTrainingSessions(modelId: number): Promise<ModelTrainingSession[]>;
  createModelTrainingSession(
    session: InsertModelTrainingSession
  ): Promise<ModelTrainingSession>;
  updateModelTrainingSession(
    id: number,
    session: Partial<InsertModelTrainingSession>
  ): Promise<ModelTrainingSession | undefined>;

  // Model Deployments
  getModelDeployment(id: number): Promise<ModelDeployment | undefined>;
  getActiveModelDeployments(): Promise<ModelDeployment[]>;
  createModelDeployment(
    deployment: InsertModelDeployment
  ): Promise<ModelDeployment>;
  updateModelDeployment(
    id: number,
    deployment: Partial<InsertModelDeployment>
  ): Promise<ModelDeployment | undefined>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId?: number, limit?: number): Promise<AuditLog[]>;

  // Notifications
  getNotification(id: number): Promise<Notification | undefined>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;

  // User Settings
  // User Settings
  getUserSettings(
    userId: number
  ): Promise<typeof userSettings.$inferSelect | undefined>;
  upsertUserSettings(
    userId: number,
    settings: Partial<InsertSetting>
  ): Promise<typeof userSettings.$inferSelect>;

  // UI Settings management
  getUISettings(): Promise<any | null>;
  saveUISettings(settings: any): Promise<void>;

  // AI Training Data
  // AI Training Data Management
  createTrainingData(data: {
    errorType: string;
    severity: string;
    suggestedSolution: string;
    sourceFile?: string;
    lineNumber?: number;
    contextBefore?: string;
    contextAfter?: string;
    confidence?: number;
    source?: string;
    isValidated?: boolean;
    validatedBy?: string;
    validatedAt?: number;
    features?: any;
    originalData?: any;
  }): Promise<{ id: number }>;

  getTrainingData(filters?: {
    errorType?: string;
    severity?: string;
    source?: string;
    isValidated?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AiTrainingData[]>;

  getTrainingDataMetrics(): Promise<{
    totalRecords: number;
    validatedRecords: number;
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
    byErrorType: Record<string, number>;
    avgConfidence: number;
  }>;

  updateTrainingDataValidation(
    id: number,
    isValid: boolean,
    validatedBy?: string
  ): Promise<void>;
  deleteTrainingData(id: number): Promise<void>;
  getTrainingDataMetrics(): Promise<{
    totalRecords: number;
    validatedRecords: number;
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
    byErrorType: Record<string, number>;
    avgConfidence: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(
    id: number,
    user: Partial<InsertUser>
  ): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.changes > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  // Log file management
  async getLogFile(id: number): Promise<LogFile | undefined> {
    const result = await db.select().from(logFiles).where(eq(logFiles.id, id));
    return result[0];
  }

  async getLogFilesByUser(userId: number): Promise<LogFile[]> {
    return await db
      .select()
      .from(logFiles)
      .where(eq(logFiles.uploadedBy, userId))
      .orderBy(desc(logFiles.uploadTimestamp));
  }

  async getAllLogFiles(): Promise<LogFile[]> {
    return await db
      .select()
      .from(logFiles)
      .orderBy(desc(logFiles.uploadTimestamp));
  }

  async createLogFile(file: InsertLogFile): Promise<LogFile> {
    const result = await db.insert(logFiles).values(file).returning();
    return result[0];
  }

  async updateLogFile(
    id: number,
    file: Partial<InsertLogFile>
  ): Promise<LogFile | undefined> {
    const result = await db
      .update(logFiles)
      .set(file)
      .where(eq(logFiles.id, id))
      .returning();
    return result[0];
  }

  async deleteLogFile(id: number): Promise<boolean> {
    const result = await db.delete(logFiles).where(eq(logFiles.id, id));
    return result.changes > 0;
  }

  // Error log management
  async getErrorLog(id: number): Promise<ErrorLog | undefined> {
    const result = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.id, id));
    return result[0];
  }

  async getErrorLogsByFile(fileId: number): Promise<ErrorLog[]> {
    return await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.fileId, fileId))
      .orderBy(asc(errorLogs.lineNumber));
  }

  async getErrorLogsByFileWithPagination(
    fileId: number,
    page: number,
    limit: number
  ): Promise<{ errors: ErrorLog[]; total: number }> {
    const offset = (page - 1) * limit;
    const errors = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.fileId, fileId))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(errorLogs.lineNumber));
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(errorLogs)
      .where(eq(errorLogs.fileId, fileId));
    return { errors, total: totalResult[0].count };
  }

  async createErrorLog(error: InsertErrorLog): Promise<ErrorLog> {
    const result = await db.insert(errorLogs).values(error).returning();
    return result[0];
  }

  async updateErrorLog(
    id: number,
    error: Partial<InsertErrorLog>
  ): Promise<ErrorLog | undefined> {
    const result = await db
      .update(errorLogs)
      .set(error)
      .where(eq(errorLogs.id, id))
      .returning();
    return result[0];
  }

  async deleteErrorLog(id: number): Promise<boolean> {
    const result = await db.delete(errorLogs).where(eq(errorLogs.id, id));
    return result.changes > 0;
  }

  async getAllErrors(): Promise<ErrorLog[]> {
    return await db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt));
  }

  async getErrorsByUser(userId: number): Promise<ErrorLog[]> {
    const results = await db
      .select({
        id: errorLogs.id,
        fileId: errorLogs.fileId,
        lineNumber: errorLogs.lineNumber,
        timestamp: errorLogs.timestamp,
        severity: errorLogs.severity,
        errorType: errorLogs.errorType,
        message: errorLogs.message,
        fullText: errorLogs.fullText,
        pattern: errorLogs.pattern,
        resolved: errorLogs.resolved,
        aiSuggestion: errorLogs.aiSuggestion,
        mlPrediction: errorLogs.mlPrediction,
        mlConfidence: errorLogs.mlConfidence,
        createdAt: errorLogs.createdAt,
        filename: logFiles.originalName,
      })
      .from(errorLogs)
      .innerJoin(logFiles, eq(errorLogs.fileId, logFiles.id))
      .where(eq(logFiles.uploadedBy, userId))
      .orderBy(desc(errorLogs.createdAt));

    // Return the enriched error logs with filename
    return results as any;
  }

  async getErrorsByFile(fileId: number): Promise<ErrorLog[]> {
    return await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.fileId, fileId))
      .orderBy(desc(errorLogs.createdAt));
  }

  async getErrorsBySeverity(severity: string): Promise<ErrorLog[]> {
    return await db
      .select({
        id: errorLogs.id,
        fileId: errorLogs.fileId,
        lineNumber: errorLogs.lineNumber,
        timestamp: errorLogs.timestamp,
        severity: errorLogs.severity,
        errorType: errorLogs.errorType,
        message: errorLogs.message,
        fullText: errorLogs.fullText,
        pattern: errorLogs.pattern,
        resolved: errorLogs.resolved,
        aiSuggestion: errorLogs.aiSuggestion,
        mlPrediction: errorLogs.mlPrediction,
        mlConfidence: errorLogs.mlConfidence,
        createdAt: errorLogs.createdAt,
      })
      .from(errorLogs)
      .where(eq(errorLogs.severity, severity))
      .orderBy(desc(errorLogs.createdAt));
  }

  async getResolvedErrorsWithSuggestions(): Promise<ErrorLog[]> {
    // Return recent errors that could have suggestions
    // In a real implementation, this would join with a suggestions table
    // For now, return recent errors as training data for RAG
    return await db
      .select({
        id: errorLogs.id,
        fileId: errorLogs.fileId,
        lineNumber: errorLogs.lineNumber,
        timestamp: errorLogs.timestamp,
        severity: errorLogs.severity,
        errorType: errorLogs.errorType,
        message: errorLogs.message,
        fullText: errorLogs.fullText,
        pattern: errorLogs.pattern,
        resolved: errorLogs.resolved,
        aiSuggestion: errorLogs.aiSuggestion,
        mlPrediction: errorLogs.mlPrediction,
        mlConfidence: errorLogs.mlConfidence,
        createdAt: errorLogs.createdAt,
      })
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(50); // Limit to prevent too many results
  }

  async countSimilarMessages(message: string): Promise<number> {
    // Count errors with similar messages using a simple LIKE query
    // In a real implementation, this might use more sophisticated similarity matching
    const searchPattern = `%${message.substring(0, 50)}%`;
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(errorLogs)
      .where(sql`${errorLogs.message} LIKE ${searchPattern}`);

    return result[0]?.count || 0;
  }

  // Analysis history
  async getAnalysisHistory(id: number): Promise<AnalysisHistory | undefined> {
    const result = await db
      .select()
      .from(analysisHistory)
      .where(eq(analysisHistory.id, id));
    return result[0];
  }

  async getAnalysisHistoryByUser(userId: number): Promise<AnalysisHistory[]> {
    const result = await db
      .select()
      .from(analysisHistory)
      .where(eq(analysisHistory.userId, userId))
      .orderBy(desc(analysisHistory.analysisTimestamp));

    return result;
  }

  async getAnalysisHistoryByFileId(
    fileId: number
  ): Promise<AnalysisHistory | undefined> {
    const result = await db
      .select()
      .from(analysisHistory)
      .where(eq(analysisHistory.fileId, fileId));
    return result[0];
  }

  async createAnalysisHistory(
    analysis: InsertAnalysisHistory
  ): Promise<AnalysisHistory> {
    const result = await db
      .insert(analysisHistory)
      .values(analysis)
      .returning();
    return result[0];
  }

  async updateAnalysisHistory(
    id: number,
    updates: Partial<InsertAnalysisHistory>
  ): Promise<AnalysisHistory | undefined> {
    const result = await db
      .update(analysisHistory)
      .set(updates)
      .where(eq(analysisHistory.id, id))
      .returning();
    return result[0];
  }

  async deleteAnalysisHistory(id: number): Promise<boolean> {
    const result = await db
      .delete(analysisHistory)
      .where(eq(analysisHistory.id, id));
    return result.changes > 0;
  }

  // ML models
  async getMlModel(id: number): Promise<MlModel | undefined> {
    const result = await db.select().from(mlModels).where(eq(mlModels.id, id));
    return result[0];
  }

  async getActiveMlModel(): Promise<MlModel | undefined> {
    const result = await db
      .select()
      .from(mlModels)
      .where(eq(mlModels.isActive, true))
      .orderBy(desc(mlModels.trainedAt));
    return result[0];
  }

  async getAllMlModels(): Promise<MlModel[]> {
    return await db.select().from(mlModels).orderBy(desc(mlModels.trainedAt));
  }

  async createMlModel(model: InsertMlModel): Promise<MlModel> {
    // If this model is being set as active, deactivate all other models first
    if (model.isActive) {
      await db
        .update(mlModels)
        .set({ isActive: false })
        .where(eq(mlModels.isActive, true));
    }

    const result = await db.insert(mlModels).values(model).returning();
    return result[0];
  }

  async updateMlModel(
    id: number,
    model: Partial<InsertMlModel>
  ): Promise<MlModel | undefined> {
    const result = await db
      .update(mlModels)
      .set(model)
      .where(eq(mlModels.id, id))
      .returning();
    return result[0];
  }

  async deleteMlModel(id: number): Promise<boolean> {
    const result = await db.delete(mlModels).where(eq(mlModels.id, id));
    return result.changes > 0;
  }

  // Error patterns
  async getErrorPattern(id: number): Promise<ErrorPattern | undefined> {
    const result = await db
      .select()
      .from(errorPatterns)
      .where(eq(errorPatterns.id, id));
    return result[0];
  }

  async getActiveErrorPatterns(): Promise<ErrorPattern[]> {
    return await db
      .select()
      .from(errorPatterns)
      .where(eq(errorPatterns.isActive, true));
  }

  async createErrorPattern(pattern: InsertErrorPattern): Promise<ErrorPattern> {
    const result = await db.insert(errorPatterns).values(pattern).returning();
    return result[0];
  }

  async updateErrorPattern(
    id: number,
    pattern: Partial<InsertErrorPattern>
  ): Promise<ErrorPattern | undefined> {
    const result = await db
      .update(errorPatterns)
      .set(pattern)
      .where(eq(errorPatterns.id, id))
      .returning();
    return result[0];
  }

  async deleteErrorPattern(id: number): Promise<boolean> {
    const result = await db
      .delete(errorPatterns)
      .where(eq(errorPatterns.id, id));
    return result.changes > 0;
  }

  async getAllErrorPatterns(): Promise<ErrorPattern[]> {
    return await db
      .select()
      .from(errorPatterns)
      .orderBy(asc(errorPatterns.pattern));
  }

  async saveErrorPattern(pattern: {
    pattern: string;
    regex: string;
    severity: string;
    category: string;
    description: string;
    solution: string;
    errorType?: string; // Optional, will fallback to category
  }): Promise<ErrorPattern> {
    const insertPattern: InsertErrorPattern = {
      pattern: pattern.pattern,
      regex: pattern.regex,
      severity: pattern.severity,
      errorType: pattern.errorType || pattern.category || "unknown", // Use errorType, fallback to category, then 'unknown'
      category: pattern.category,
      description: pattern.description,
      suggestedFix: pattern.solution,
      isActive: true,
    };

    const result = await db
      .insert(errorPatterns)
      .values(insertPattern)
      .returning();
    return result[0];
  }

  // Admin Role Management
  async getRole(id: number): Promise<Role | undefined> {
    const result = await db.select().from(roles).where(eq(roles.id, id));
    return result[0];
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const result = await db.select().from(roles).where(eq(roles.name, name));
    return result[0];
  }

  async getAllRoles(): Promise<Role[]> {
    return await db
      .select()
      .from(roles)
      .where(eq(roles.isActive, true))
      .orderBy(asc(roles.name));
  }

  async createRole(role: InsertRole): Promise<Role> {
    const result = await db.insert(roles).values(role).returning();
    return result[0];
  }

  async updateRole(
    id: number,
    role: Partial<InsertRole>
  ): Promise<Role | undefined> {
    const result = await db
      .update(roles)
      .set(role)
      .where(eq(roles.id, id))
      .returning();
    return result[0];
  }

  async deleteRole(id: number): Promise<boolean> {
    const result = await db.delete(roles).where(eq(roles.id, id));
    return result.changes > 0;
  }

  // User Role Management
  async getUserRole(userId: number): Promise<UserRole | undefined> {
    const result = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)));
    return result[0];
  }

  async getUserRoles(userId: number): Promise<UserRole[]> {
    return await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)));
  }

  async assignUserRole(userRole: InsertUserRole): Promise<UserRole> {
    const result = await db.insert(userRoles).values(userRole).returning();
    return result[0];
  }

  async revokeUserRole(id: number): Promise<boolean> {
    const result = await db
      .update(userRoles)
      .set({ isActive: false })
      .where(eq(userRoles.id, id));
    return result.changes > 0;
  }

  // Training Modules
  async getTrainingModule(id: number): Promise<TrainingModule | undefined> {
    const result = await db
      .select()
      .from(trainingModules)
      .where(eq(trainingModules.id, id));
    return result[0];
  }

  async getAllTrainingModules(): Promise<TrainingModule[]> {
    return await db
      .select()
      .from(trainingModules)
      .where(eq(trainingModules.isActive, true))
      .orderBy(asc(trainingModules.title));
  }

  async getTrainingModulesByUser(userId: number): Promise<TrainingModule[]> {
    return await db
      .select({
        id: trainingModules.id,
        title: trainingModules.title,
        description: trainingModules.description,
        content: trainingModules.content,
        difficulty: trainingModules.difficulty,
        estimatedDuration: trainingModules.estimatedDuration,
        prerequisites: trainingModules.prerequisites,
        tags: trainingModules.tags,
        isActive: trainingModules.isActive,
        createdBy: trainingModules.createdBy,
        createdAt: trainingModules.createdAt,
        updatedAt: trainingModules.updatedAt,
      })
      .from(trainingModules)
      .innerJoin(userTraining, eq(trainingModules.id, userTraining.moduleId))
      .where(
        and(eq(userTraining.userId, userId), eq(trainingModules.isActive, true))
      )
      .orderBy(asc(trainingModules.title));
  }

  async createTrainingModule(
    module: InsertTrainingModule
  ): Promise<TrainingModule> {
    const result = await db.insert(trainingModules).values(module).returning();
    return result[0];
  }

  async updateTrainingModule(
    id: number,
    module: Partial<InsertTrainingModule>
  ): Promise<TrainingModule | undefined> {
    const result = await db
      .update(trainingModules)
      .set(module)
      .where(eq(trainingModules.id, id))
      .returning();
    return result[0];
  }

  async deleteTrainingModule(id: number): Promise<boolean> {
    const result = await db
      .delete(trainingModules)
      .where(eq(trainingModules.id, id));
    return result.changes > 0;
  }

  // User Training
  async getUserTraining(
    userId: number,
    moduleId: number
  ): Promise<UserTraining | undefined> {
    const result = await db
      .select()
      .from(userTraining)
      .where(
        and(
          eq(userTraining.userId, userId),
          eq(userTraining.moduleId, moduleId)
        )
      );
    return result[0];
  }

  async getUserTrainingHistory(userId: number): Promise<UserTraining[]> {
    return await db
      .select()
      .from(userTraining)
      .where(eq(userTraining.userId, userId))
      .orderBy(desc(userTraining.lastActivity));
  }

  async createUserTraining(
    training: InsertUserTraining
  ): Promise<UserTraining> {
    const result = await db.insert(userTraining).values(training).returning();
    return result[0];
  }

  async updateUserTraining(
    id: number,
    training: Partial<InsertUserTraining>
  ): Promise<UserTraining | undefined> {
    const result = await db
      .update(userTraining)
      .set(training)
      .where(eq(userTraining.id, id))
      .returning();
    return result[0];
  }

  // Model Training Sessions
  async getModelTrainingSession(
    id: number
  ): Promise<ModelTrainingSession | undefined> {
    const result = await db
      .select()
      .from(modelTrainingSessions)
      .where(eq(modelTrainingSessions.id, id));
    return result[0];
  }

  async getModelTrainingSessions(
    modelId: number
  ): Promise<ModelTrainingSession[]> {
    return await db
      .select()
      .from(modelTrainingSessions)
      .where(eq(modelTrainingSessions.modelId, modelId))
      .orderBy(desc(modelTrainingSessions.createdAt));
  }

  async createModelTrainingSession(
    session: InsertModelTrainingSession
  ): Promise<ModelTrainingSession> {
    const result = await db
      .insert(modelTrainingSessions)
      .values(session)
      .returning();
    return result[0];
  }

  async updateModelTrainingSession(
    id: number,
    session: Partial<InsertModelTrainingSession>
  ): Promise<ModelTrainingSession | undefined> {
    const result = await db
      .update(modelTrainingSessions)
      .set(session)
      .where(eq(modelTrainingSessions.id, id))
      .returning();
    return result[0];
  }

  // Model Deployments
  async getModelDeployment(id: number): Promise<ModelDeployment | undefined> {
    const result = await db
      .select()
      .from(modelDeployments)
      .where(eq(modelDeployments.id, id));
    return result[0];
  }

  async getActiveModelDeployments(): Promise<ModelDeployment[]> {
    return await db
      .select()
      .from(modelDeployments)
      .where(eq(modelDeployments.status, "active"))
      .orderBy(desc(modelDeployments.deployedAt));
  }

  async createModelDeployment(
    deployment: InsertModelDeployment
  ): Promise<ModelDeployment> {
    const result = await db
      .insert(modelDeployments)
      .values(deployment)
      .returning();
    return result[0];
  }

  async updateModelDeployment(
    id: number,
    deployment: Partial<InsertModelDeployment>
  ): Promise<ModelDeployment | undefined> {
    const result = await db
      .update(modelDeployments)
      .set(deployment)
      .where(eq(modelDeployments.id, id))
      .returning();
    return result[0];
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(userId?: number, limit = 100): Promise<AuditLog[]> {
    if (userId) {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .limit(limit)
        .orderBy(desc(auditLogs.timestamp));
    }
    return await db
      .select()
      .from(auditLogs)
      .limit(limit)
      .orderBy(desc(auditLogs.timestamp));
  }

  // Notifications
  async getNotification(id: number): Promise<Notification | undefined> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return result[0];
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      )
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(
    notification: InsertNotification
  ): Promise<Notification> {
    const result = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return result[0];
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
    return result.changes > 0;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id));
    return result.changes > 0;
  }

  // User Settings
  // User Settings
  async getUserSettings(
    userId: number
  ): Promise<typeof userSettings.$inferSelect | undefined> {
    const result = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.id, userId));
    return result[0];
  }

  async upsertUserSettings(
    userId: number,
    settings: Partial<InsertSetting>
  ): Promise<typeof userSettings.$inferSelect> {
    const existing = await this.getUserSettings(userId);

    if (existing) {
      const result = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.id, userId))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(userSettings)
        .values({
          category: settings.category || "general",
          key: settings.key || "settings",
          value: settings.value || null,
          isActive: settings.isActive ?? true,
          description: settings.description || null,
          updatedBy: settings.updatedBy || null,
          updatedAt: new Date(),
        })
        .returning();
      return result[0];
    }
  }

  async deleteUserSettings(userId: number): Promise<boolean> {
    const result = await db
      .delete(userSettings)
      .where(eq(userSettings.id, userId));
    return result.changes > 0;
  }

  // UI Settings management
  async getUISettings(): Promise<any | null> {
    console.log("Getting UI settings from database for user ID 1");

    // Get settings for user ID 1 (assuming single user system for now)
    const userSettingsRecord = await this.getUserSettings(1);

    if (!userSettingsRecord) {
      console.log("No user settings found, returning default values");
      return {
        navigationPreferences: {
          showTopNav: true,
          topNavStyle: "sticky",
          topNavColor: "#1f2937",
          showSideNav: true,
          sideNavStyle: "overlay",
          sideNavPosition: "left",
          sideNavColor: "#374151",
          enableBreadcrumbs: true,
        },
      };
    }

    const navigationPreferences =
      userSettingsRecord.value && typeof userSettingsRecord.value === "string"
        ? JSON.parse(userSettingsRecord.value)
        : {
            showTopNav: true,
            topNavStyle: "sticky",
            topNavColor: "#1f2937",
            showSideNav: true,
            sideNavStyle: "overlay",
            sideNavPosition: "left",
            sideNavColor: "#374151",
            enableBreadcrumbs: true,
          };

    console.log(
      "Returning UI settings from database. Navigation preferences:",
      navigationPreferences
    );

    return {
      navigationPreferences,
    };
  }

  // AI Training Data Management
  async createTrainingData(data: {
    errorType: string;
    severity: string;
    suggestedSolution: string;
    sourceFile?: string;
    lineNumber?: number;
    contextBefore?: string;
    contextAfter?: string;
    confidence?: number;
    source?: string;
    isValidated?: boolean;
    validatedBy?: string;
    validatedAt?: Date | number;
    features?: any;
    originalData?: any;
  }): Promise<{ id: number }> {
    try {
      console.log("createTrainingData called with:", {
        ...data,
        validatedAt: data.validatedAt,
        validatedAtType: typeof data.validatedAt,
        validatedAtConstructor: data.validatedAt?.constructor?.name,
      });

      const insertData = {
        errorType: data.errorType,
        severity: data.severity,
        suggestedSolution: data.suggestedSolution,
        sourceFile: data.sourceFile || null,
        lineNumber: data.lineNumber || null,
        contextBefore: data.contextBefore || null,
        contextAfter: data.contextAfter || null,
        confidence: data.confidence || 0.8,
        source: data.source || null,
        isValidated: data.isValidated || false,
        validatedBy: data.validatedBy || null,
        validatedAt: data.validatedAt
          ? typeof data.validatedAt === "number"
            ? new Date(data.validatedAt)
            : data.validatedAt instanceof Date
            ? data.validatedAt
            : null
          : null,
        features: data.features ? JSON.stringify(data.features) : null,
        originalData: data.originalData
          ? JSON.stringify(data.originalData)
          : null,
      };

      console.log("About to insert:", insertData);

      const [result] = await db
        .insert(aiTrainingData)
        .values(insertData)
        .returning({ id: aiTrainingData.id });

      return result;
    } catch (error) {
      console.error("Database insert error:", error);
      throw error;
    }
  }

  async getTrainingData(filters?: {
    errorType?: string;
    severity?: string;
    source?: string;
    isValidated?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = db.select().from(aiTrainingData);

    if (filters?.errorType) {
      query = query.where(
        eq(aiTrainingData.errorType, filters.errorType)
      ) as any;
    }
    if (filters?.severity) {
      query = query.where(eq(aiTrainingData.severity, filters.severity)) as any;
    }
    if (filters?.source) {
      query = query.where(eq(aiTrainingData.source, filters.source)) as any;
    }
    if (filters?.isValidated !== undefined) {
      query = query.where(
        eq(aiTrainingData.isValidated, filters.isValidated)
      ) as any;
    }

    query = query.orderBy(desc(aiTrainingData.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async getTrainingDataMetrics(): Promise<{
    totalRecords: number;
    validatedRecords: number;
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
    byErrorType: Record<string, number>;
    avgConfidence: number;
  }> {
    const totalRecords = await db
      .select({ count: count() })
      .from(aiTrainingData)
      .then((result) => result[0].count);

    const validatedRecords = await db
      .select({ count: count() })
      .from(aiTrainingData)
      .where(eq(aiTrainingData.isValidated, true))
      .then((result) => result[0].count);

    const avgConfidence = await db
      .select({ avg: sql`AVG(${aiTrainingData.confidence})` })
      .from(aiTrainingData)
      .then((result) => Number(result[0].avg) || 0);

    // Get distributions
    const sourceDistribution = await db
      .select({
        source: aiTrainingData.source,
        count: count(),
      })
      .from(aiTrainingData)
      .groupBy(aiTrainingData.source);

    const severityDistribution = await db
      .select({
        severity: aiTrainingData.severity,
        count: count(),
      })
      .from(aiTrainingData)
      .groupBy(aiTrainingData.severity);

    const errorTypeDistribution = await db
      .select({
        errorType: aiTrainingData.errorType,
        count: count(),
      })
      .from(aiTrainingData)
      .groupBy(aiTrainingData.errorType);

    return {
      totalRecords,
      validatedRecords,
      bySource: sourceDistribution.reduce((acc, item) => {
        acc[item.source || "unknown"] = item.count;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: severityDistribution.reduce((acc, item) => {
        acc[item.severity] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byErrorType: errorTypeDistribution.reduce((acc, item) => {
        acc[item.errorType] = item.count;
        return acc;
      }, {} as Record<string, number>),
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  async updateTrainingDataValidation(
    id: number,
    isValid: boolean,
    validatedBy?: string
  ): Promise<void> {
    await db
      .update(aiTrainingData)
      .set({
        isValidated: isValid,
        validatedBy,
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiTrainingData.id, id));
  }

  async deleteTrainingData(id: number): Promise<void> {
    await db.delete(aiTrainingData).where(eq(aiTrainingData.id, id));
  }

  async saveUISettings(settings: any): Promise<void> {
    console.log("Saving UI settings to database. Settings received:", settings);

    // Save to user_settings table for user ID 1
    const navigationPreferences = JSON.stringify(
      settings.navigationPreferences || settings
    );

    await this.upsertUserSettings(1, {
      category: "ui",
      key: "navigationPreferences",
      value: navigationPreferences,
    });

    console.log(
      "UI Settings saved to database. Navigation preferences:",
      settings.navigationPreferences || settings
    );
  }
}

export const storage = new DatabaseStorage();
