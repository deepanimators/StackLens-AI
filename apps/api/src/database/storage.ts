import {
  users,
  logFiles,
  errorLogs,
  analysisHistory,
  mlModels,
  errorPatterns,
  userSettings,
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
  type UserSettings,
  type InsertUserSettings,
} from "@shared/sqlite-schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Log file management
  getLogFile(id: number): Promise<LogFile | undefined>;
  getLogFilesByUser(userId: number): Promise<LogFile[]>;
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
  getErrorsBySeverity(severity: string): Promise<ErrorLog[]>;
  getResolvedErrorsWithSuggestions(): Promise<ErrorLog[]>;
  countSimilarMessages(message: string): Promise<number>;

  // Analysis history
  getAnalysisHistory(id: number): Promise<AnalysisHistory | undefined>;
  getAnalysisHistoryByUser(userId: number): Promise<AnalysisHistory[]>;
  createAnalysisHistory(
    analysis: InsertAnalysisHistory
  ): Promise<AnalysisHistory>;
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

  // User settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(
    userId: number,
    settings: Partial<InsertUserSettings>
  ): Promise<UserSettings | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private logFiles: Map<number, LogFile>;
  private errorLogs: Map<number, ErrorLog>;
  private analysisHistory: Map<number, AnalysisHistory>;
  private mlModels: Map<number, MlModel>;
  private errorPatterns: Map<number, ErrorPattern>;
  private userSettingsMap: Map<number, UserSettings>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.logFiles = new Map();
    this.errorLogs = new Map();
    this.analysisHistory = new Map();
    this.mlModels = new Map();
    this.errorPatterns = new Map();
    this.userSettingsMap = new Map();
    this.currentId = 1;
    this.initializeDefaultData();
  }
  async getResolvedErrorsWithSuggestions(): Promise<ErrorLog[]> {
    return Array.from(this.errorLogs.values()).filter(
      (error) => error.resolved && error.aiSuggestion
    );
  }

  async countSimilarMessages(message: string): Promise<number> {
    const normalizedMessage = message.toLowerCase().trim();
    return Array.from(this.errorLogs.values()).filter((error) => {
      const errorMessage = error.message?.toLowerCase().trim() || '';
      // Simple similarity check - could be enhanced with fuzzy matching
      return errorMessage.includes(normalizedMessage) || 
             normalizedMessage.includes(errorMessage) ||
             this.calculateSimilarity(errorMessage, normalizedMessage) > 0.8;
    }).length;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  private initializeDefaultData() {
    // Create default admin user
    const adminUser: User = {
      id: this.currentId++,
      username: "admin",
      email: "admin@stacklens.ai",
      password: "admin123", // In production, this should be hashed
      role: "admin",
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      department: null,
      isActive: true,
      lastLogin: null,
      emailVerified: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      recoveryEmail: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Initialize default error patterns
    const defaultPatterns: ErrorPattern[] = [
      {
        id: this.currentId++,
        pattern: "OutOfMemoryError",
        errorType: "Memory",
        severity: "critical",
        description: "Java heap space exhausted",
        regex: "OutOfMemoryError.*heap space",
        isActive: true,
        createdAt: new Date(),
        category: null,
        suggestedFix: null,
        occurrenceCount: null,
        successRate: null,
        avgResolutionTime: null,
      },
      {
        id: this.currentId++,
        pattern: "SQLException",
        errorType: "Database",
        severity: "high",
        description: "Database connection or query error",
        regex: "SQLException|Connection.*timeout",
        isActive: true,
        createdAt: new Date(),
        category: null,
        suggestedFix: null,
        occurrenceCount: null,
        successRate: null,
        avgResolutionTime: null,
      },
      {
        id: this.currentId++,
        pattern: "NullPointerException",
        errorType: "Runtime",
        severity: "medium",
        description: "Null reference access",
        regex: "NullPointerException",
        isActive: true,
        createdAt: new Date(),
        category: null,
        suggestedFix: null,
        occurrenceCount: null,
        successRate: null,
        avgResolutionTime: null,
      },
      {
        id: this.currentId++,
        pattern: "FileNotFoundException",
        errorType: "IO",
        severity: "medium",
        description: "File or resource not found",
        regex: "FileNotFoundException|No such file",
        isActive: true,
        createdAt: new Date(),
        category: null,
        suggestedFix: null,
        occurrenceCount: null,
        successRate: null,
        avgResolutionTime: null,
      },
    ];

    defaultPatterns.forEach((pattern) => {
      this.errorPatterns.set(pattern.id, pattern);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role ?? "user",
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      department: insertUser.department ?? null,
      isActive: insertUser.isActive ?? true,
      lastLogin: insertUser.lastLogin ?? null,
      emailVerified: insertUser.emailVerified ?? false,
      twoFactorEnabled: insertUser.twoFactorEnabled ?? false,
      twoFactorSecret: insertUser.twoFactorSecret ?? null,
      twoFactorBackupCodes: insertUser.twoFactorBackupCodes ?? null,
      recoveryEmail: insertUser.recoveryEmail ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: number,
    userData: Partial<InsertUser>
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Log file methods
  async getLogFile(id: number): Promise<LogFile | undefined> {
    return this.logFiles.get(id);
  }

  async getLogFilesByUser(userId: number): Promise<LogFile[]> {
    return Array.from(this.logFiles.values()).filter(
      (file) => file.uploadedBy === userId
    );
  }

  async createLogFile(insertFile: InsertLogFile): Promise<LogFile> {
    const id = this.currentId++;
    const file: LogFile = {
      ...insertFile,
      id,
      uploadTimestamp: new Date(),
      uploadedBy: insertFile.uploadedBy ?? null,
      analysisTimestamp: insertFile.analysisTimestamp ?? null,
      analysisResult: insertFile.analysisResult ?? null,
      errorsDetected: insertFile.errorsDetected ?? 0,
      anomalies: insertFile.anomalies ?? null,
    };
    this.logFiles.set(id, file);
    return file;
  }

  async updateLogFile(
    id: number,
    fileData: Partial<InsertLogFile>
  ): Promise<LogFile | undefined> {
    const file = this.logFiles.get(id);
    if (!file) return undefined;

    const updatedFile: LogFile = { ...file, ...fileData };
    this.logFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deleteLogFile(id: number): Promise<boolean> {
    return this.logFiles.delete(id);
  }

  // Error log methods
  async getErrorLog(id: number): Promise<ErrorLog | undefined> {
    return this.errorLogs.get(id);
  }

  async getErrorLogsByFile(fileId: number): Promise<ErrorLog[]> {
    return Array.from(this.errorLogs.values()).filter(
      (error) => error.fileId === fileId
    );
  }

  async getErrorLogsByFileWithPagination(
    fileId: number,
    page: number,
    limit: number
  ): Promise<{ errors: ErrorLog[]; total: number }> {
    const allErrors = Array.from(this.errorLogs.values()).filter(
      (error) => error.fileId === fileId
    );
    const start = (page - 1) * limit;
    const end = start + limit;
    const errors = allErrors.slice(start, end);
    return { errors, total: allErrors.length };
  }

  async createErrorLog(insertError: InsertErrorLog): Promise<ErrorLog> {
    const id = this.currentId++;
    const error: ErrorLog = {
      ...insertError,
      id,
      timestamp: insertError.timestamp ?? null,
      fileId: insertError.fileId ?? null,
      pattern: insertError.pattern ?? null,
      resolved: insertError.resolved ?? null,
      aiSuggestion: insertError.aiSuggestion ?? null,
      mlPrediction: insertError.mlPrediction ?? null,
      createdAt: new Date(),
    };
    this.errorLogs.set(id, error);
    return error;
  }

  async updateErrorLog(
    id: number,
    errorData: Partial<InsertErrorLog>
  ): Promise<ErrorLog | undefined> {
    const error = this.errorLogs.get(id);
    if (!error) return undefined;

    const updatedError: ErrorLog = { ...error, ...errorData };
    this.errorLogs.set(id, updatedError);
    return updatedError;
  }

  async deleteErrorLog(id: number): Promise<boolean> {
    return this.errorLogs.delete(id);
  }

  async getAllErrors(): Promise<ErrorLog[]> {
    return Array.from(this.errorLogs.values());
  }

  async getErrorsByUser(userId: number): Promise<ErrorLog[]> {
    const userFiles = Array.from(this.logFiles.values()).filter(
      (file) => file.uploadedBy === userId
    );
    const fileIds = userFiles.map((file) => file.id);
    return Array.from(this.errorLogs.values()).filter((error) =>
      fileIds.includes(error.fileId!)
    );
  }

  async getErrorsBySeverity(severity: string): Promise<ErrorLog[]> {
    return Array.from(this.errorLogs.values()).filter(
      (error) => error.severity === severity
    );
  }

  // Analysis history methods
  async getAnalysisHistory(id: number): Promise<AnalysisHistory | undefined> {
    return this.analysisHistory.get(id);
  }

  async getAnalysisHistoryByUser(userId: number): Promise<AnalysisHistory[]> {
    return Array.from(this.analysisHistory.values()).filter(
      (analysis) => analysis.userId === userId
    );
  }

  async createAnalysisHistory(
    insertAnalysis: InsertAnalysisHistory
  ): Promise<AnalysisHistory> {
    const id = this.currentId++;
    const analysis: AnalysisHistory = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
      errorsDetected: insertAnalysis.errorsDetected ?? 0,
      anomalies: insertAnalysis.anomalies ?? null,
      predictions: insertAnalysis.predictions ?? null,
      aiSuggestions: insertAnalysis.aiSuggestions ?? null,
      suggestions: insertAnalysis.suggestions ?? null,
    };
    this.analysisHistory.set(id, analysis);
    return analysis;
  }

  async deleteAnalysisHistory(id: number): Promise<boolean> {
    return this.analysisHistory.delete(id);
  }

  // ML model methods
  async getMlModel(id: number): Promise<MlModel | undefined> {
    return this.mlModels.get(id);
  }

  async getActiveMlModel(): Promise<MlModel | undefined> {
    return Array.from(this.mlModels.values()).find((model) => model.isActive);
  }

  async getAllMlModels(): Promise<MlModel[]> {
    return Array.from(this.mlModels.values());
  }

  async createMlModel(insertModel: InsertMlModel): Promise<MlModel> {
    const id = this.currentId++;
    const model: MlModel = {
      id,
      name: insertModel.name,
      version: insertModel.version,
      modelType: insertModel.modelType,
      isActive: insertModel.isActive ?? null,
      createdAt: insertModel.createdAt ?? new Date(),
      updatedAt: insertModel.updatedAt ?? new Date(),
      description: insertModel.description ?? null,
      accuracy: insertModel.accuracy ?? null,
      precision: insertModel.precision ?? null,
      recall: insertModel.recall ?? null,
      f1Score: insertModel.f1Score ?? null,
      trainingDataSize: insertModel.trainingDataSize ?? null,
      hyperparameters: insertModel.hyperparameters ?? null,
      modelSize: insertModel.modelSize ?? null,
      inferenceTime: insertModel.inferenceTime ?? null,
      modelPath: insertModel.modelPath ?? null,
      trainedAt: new Date(),
    };
    this.mlModels.set(id, model);
    return model;
  }

  async updateMlModel(
    id: number,
    modelData: Partial<InsertMlModel>
  ): Promise<MlModel | undefined> {
    const model = this.mlModels.get(id);
    if (!model) return undefined;

    const updatedModel: MlModel = { ...model, ...modelData };
    this.mlModels.set(id, updatedModel);
    return updatedModel;
  }

  async deleteMlModel(id: number): Promise<boolean> {
    return this.mlModels.delete(id);
  }

  // Error pattern methods
  async getErrorPattern(id: number): Promise<ErrorPattern | undefined> {
    return this.errorPatterns.get(id);
  }

  async getActiveErrorPatterns(): Promise<ErrorPattern[]> {
    return Array.from(this.errorPatterns.values()).filter(
      (pattern) => pattern.isActive
    );
  }

  async createErrorPattern(
    insertPattern: InsertErrorPattern
  ): Promise<ErrorPattern> {
    const id = this.currentId++;
    const pattern: ErrorPattern = {
      ...insertPattern,
      id,
      createdAt: new Date(),
    };
    this.errorPatterns.set(id, pattern);
    return pattern;
  }

  async updateErrorPattern(
    id: number,
    patternData: Partial<InsertErrorPattern>
  ): Promise<ErrorPattern | undefined> {
    const pattern = this.errorPatterns.get(id);
    if (!pattern) return undefined;

    const updatedPattern: ErrorPattern = { ...pattern, ...patternData };
    this.errorPatterns.set(id, updatedPattern);
    return updatedPattern;
  }

  async deleteErrorPattern(id: number): Promise<boolean> {
    return this.errorPatterns.delete(id);
  }

  // User settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return this.userSettingsMap.get(userId);
  }

  async createUserSettings(insertSettings: InsertUserSettings): Promise<UserSettings> {
    const id = this.currentId++;
    const settings: UserSettings = {
      ...insertSettings,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (insertSettings.userId) {
      this.userSettingsMap.set(insertSettings.userId, settings);
    }
    return settings;
  }

  async updateUserSettings(
    userId: number,
    settingsData: Partial<InsertUserSettings>
  ): Promise<UserSettings | undefined> {
    const settings = this.userSettingsMap.get(userId);
    if (!settings) return undefined;

    const updatedSettings: UserSettings = {
      ...settings,
      ...settingsData,
      updatedAt: new Date(),
    };
    this.userSettingsMap.set(userId, updatedSettings);
    return updatedSettings;
  }
}

export { storage } from "./database-storage";
