import { EventEmitter } from 'events';

// Types
export interface ErrorEvent {
    id: string;
    timestamp: Date;
    errorType: string;
    message: string;
    stackTrace?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
    tags?: string[];
    userId?: string;
    sessionId?: string;
}

export interface ErrorPattern {
    id: string;
    pattern: string;
    frequency: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    firstSeen: Date;
    lastSeen: Date;
    affectedUsers: number;
    examples: string[];
    category: string;
}

export interface ErrorPrediction {
    id: string;
    predictedErrorType: string;
    probability: number;
    timeframe: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    triggerConditions: string[];
    preventiveActions: string[];
    confidence: number;
}

export interface RootCauseAnalysis {
    errorId: string;
    causes: Array<{
        cause: string;
        probability: number;
        evidence: string[];
        category: 'technical' | 'user' | 'system' | 'data';
    }>;
    recommendations: string[];
    confidence: number;
}

export interface AnalysisResult {
    patterns: ErrorPattern[];
    predictions: ErrorPrediction[];
    rootCauses: RootCauseAnalysis[];
    confidence: number;
    processingTime: number;
}

export interface ErrorIntelligenceStats {
    totalErrorsProcessed: number;
    patternsDetected: number;
    predictionsGenerated: number;
    highRiskAlertsGenerated: number;
    averageConfidence: number;
    processingTimeAverage: number;
    lastAnalysis?: Date;
}

// Main service class
export class ErrorIntelligenceService extends EventEmitter {
    private errors: Map<string, ErrorEvent> = new Map();
    private patterns: Map<string, ErrorPattern> = new Map();
    private predictions: Map<string, ErrorPrediction> = new Map();
    private rootCauses: Map<string, RootCauseAnalysis> = new Map();
    private stats: ErrorIntelligenceStats;

    constructor() {
        super();
        this.stats = {
            totalErrorsProcessed: 0,
            patternsDetected: 0,
            predictionsGenerated: 0,
            highRiskAlertsGenerated: 0,
            averageConfidence: 0,
            processingTimeAverage: 0
        };

        this.initializeMockData();
    }

    /**
     * Analyze a single error event
     */
    async analyzeError(error: ErrorEvent): Promise<AnalysisResult> {
        const startTime = Date.now();

        try {
            // Store the error
            this.errors.set(error.id, error);
            this.stats.totalErrorsProcessed++;

            // Detect patterns
            const patterns = await this.detectPatterns([error]);
            patterns.forEach(pattern => this.patterns.set(pattern.id, pattern));

            // Generate predictions
            const predictions = await this.generatePredictions(error);
            predictions.forEach(prediction => this.predictions.set(prediction.id, prediction));

            // Perform root cause analysis
            const rootCauseAnalysis = await this.performRootCauseAnalysis(error);
            this.rootCauses.set(error.id, rootCauseAnalysis);

            const processingTime = Date.now() - startTime;
            const confidence = this.calculateOverallConfidence([error]);

            // Update stats
            this.updateStats(processingTime, confidence);

            // Emit events
            this.emit('analysis-complete', { error, patterns, predictions, rootCauseAnalysis });

            const result: AnalysisResult = {
                patterns,
                predictions,
                rootCauses: [rootCauseAnalysis],
                confidence,
                processingTime
            };

            return result;
        } catch (error) {
            console.error('Error in analyzeError:', error);
            throw error;
        }
    }

    /**
     * Analyze multiple errors in batch
     */
    async analyzeBulkErrors(errors: ErrorEvent[]): Promise<AnalysisResult> {
        const startTime = Date.now();

        try {
            // Store errors
            errors.forEach(error => {
                this.errors.set(error.id, error);
                this.stats.totalErrorsProcessed++;
            });

            // Detect patterns across all errors
            const patterns = await this.detectPatterns(errors);
            patterns.forEach(pattern => this.patterns.set(pattern.id, pattern));

            // Generate predictions
            const allPredictions: ErrorPrediction[] = [];
            for (const error of errors) {
                const predictions = await this.generatePredictions(error);
                allPredictions.push(...predictions);
            }
            allPredictions.forEach(prediction => this.predictions.set(prediction.id, prediction));

            // Perform root cause analysis for each error
            const allRootCauses: RootCauseAnalysis[] = [];
            for (const error of errors) {
                const rootCause = await this.performRootCauseAnalysis(error);
                this.rootCauses.set(error.id, rootCause);
                allRootCauses.push(rootCause);
            }

            const processingTime = Date.now() - startTime;
            const confidence = this.calculateOverallConfidence(errors);

            // Update stats
            this.updateStats(processingTime, confidence);

            const result: AnalysisResult = {
                patterns,
                predictions: allPredictions,
                rootCauses: allRootCauses,
                confidence,
                processingTime
            };

            return result;
        } catch (error) {
            console.error('Error in analyzeBulkErrors:', error);
            throw error;
        }
    }

    /**
     * Get detected patterns with filtering options
     */
    async getPatterns(options: {
        timeRange?: { start: Date; end: Date };
        severity?: string[];
        errorTypes?: string[];
        userId?: string;
        limit?: number;
    } = {}): Promise<ErrorPattern[]> {
        let patterns = Array.from(this.patterns.values());

        // Apply filters
        if (options.timeRange) {
            patterns = patterns.filter(pattern =>
                pattern.lastSeen >= options.timeRange!.start &&
                pattern.lastSeen <= options.timeRange!.end
            );
        }

        if (options.severity?.length) {
            patterns = patterns.filter(pattern =>
                options.severity!.includes(pattern.severity)
            );
        }

        // Sort by confidence and frequency
        patterns.sort((a, b) => (b.confidence + b.frequency) - (a.confidence + a.frequency));

        // Apply limit
        if (options.limit) {
            patterns = patterns.slice(0, options.limit);
        }

        return patterns;
    }

    /**
     * Get predictions with filtering options
     */
    async getPredictions(options: {
        timeRange?: { start: Date; end: Date };
        severity?: string[];
        errorTypes?: string[];
        limit?: number;
    } = {}): Promise<ErrorPrediction[]> {
        let predictions = Array.from(this.predictions.values());

        // Apply filters
        if (options.errorTypes?.length) {
            predictions = predictions.filter(prediction =>
                options.errorTypes!.includes(prediction.predictedErrorType)
            );
        }

        // Sort by probability and risk level
        predictions.sort((a, b) => {
            const aScore = a.probability + this.getRiskScore(a.riskLevel);
            const bScore = b.probability + this.getRiskScore(b.riskLevel);
            return bScore - aScore;
        });

        // Apply limit
        if (options.limit) {
            predictions = predictions.slice(0, options.limit);
        }

        return predictions;
    }

    /**
     * Get root cause analysis for a specific error
     */
    async analyzeRootCause(errorId: string): Promise<RootCauseAnalysis> {
        const existingAnalysis = this.rootCauses.get(errorId);
        if (existingAnalysis) {
            return existingAnalysis;
        }

        const error = this.errors.get(errorId);
        if (!error) {
            throw new Error(`Error with ID ${errorId} not found`);
        }

        return this.performRootCauseAnalysis(error);
    }

    /**
     * Find similar errors
     */
    async findSimilarErrors(errorId: string, options: {
        limit?: number;
        threshold?: number;
    } = {}): Promise<Array<{ error: ErrorEvent; similarity: number }>> {
        const targetError = this.errors.get(errorId);
        if (!targetError) {
            throw new Error(`Error with ID ${errorId} not found`);
        }

        const { limit = 10, threshold = 0.7 } = options;
        const similarities: Array<{ error: ErrorEvent; similarity: number }> = [];

        for (const [id, error] of Array.from(this.errors.entries())) {
            if (id === errorId) continue;

            const similarity = this.calculateSimilarity(targetError, error);
            if (similarity >= threshold) {
                similarities.push({ error, similarity });
            }
        }

        // Sort by similarity (descending)
        similarities.sort((a, b) => b.similarity - a.similarity);

        return similarities.slice(0, limit);
    }

    /**
     * Get system statistics
     */
    async getStatistics(): Promise<ErrorIntelligenceStats> {
        return { ...this.stats };
    }

    /**
     * Train ML models with current data
     */
    async trainModel(force: boolean = false): Promise<{ success: boolean; message: string }> {
        // Simulate model training
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: `Model training completed with ${this.errors.size} error samples`
                });
            }, 2000);
        });
    }

    /**
     * Clear all data
     */
    async clearAllData(): Promise<void> {
        this.errors.clear();
        this.patterns.clear();
        this.predictions.clear();
        this.rootCauses.clear();
        this.stats = {
            totalErrorsProcessed: 0,
            patternsDetected: 0,
            predictionsGenerated: 0,
            highRiskAlertsGenerated: 0,
            averageConfidence: 0,
            processingTimeAverage: 0
        };
    }

    /**
     * Get system health
     */
    async getSystemHealth(): Promise<{
        status: 'healthy' | 'warning' | 'error';
        services: Record<string, boolean>;
        uptime: number;
    }> {
        return {
            status: 'healthy',
            services: {
                'pattern-detection': true,
                'prediction-engine': true,
                'root-cause-analyzer': true,
                'similarity-engine': true
            },
            uptime: process.uptime()
        };
    }

    // Private methods
    private async detectPatterns(errors: ErrorEvent[]): Promise<ErrorPattern[]> {
        const patterns: ErrorPattern[] = [];

        // Group errors by type and message similarity
        const errorGroups = this.groupSimilarErrors(errors);

        for (const [groupKey, groupErrors] of Array.from(errorGroups.entries())) {
            if (groupErrors.length >= 2) { // Pattern threshold
                const pattern: ErrorPattern = {
                    id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    pattern: this.extractPattern(groupErrors),
                    frequency: groupErrors.length,
                    severity: this.calculateGroupSeverity(groupErrors),
                    confidence: Math.min(95, 60 + (groupErrors.length * 5)),
                    firstSeen: new Date(Math.min(...groupErrors.map((e: ErrorEvent) => e.timestamp.getTime()))),
                    lastSeen: new Date(Math.max(...groupErrors.map((e: ErrorEvent) => e.timestamp.getTime()))),
                    affectedUsers: new Set(groupErrors.map((e: ErrorEvent) => e.userId).filter(Boolean)).size,
                    examples: groupErrors.slice(0, 3).map((e: ErrorEvent) => e.message),
                    category: this.categorizePattern(groupErrors)
                };

                patterns.push(pattern);
                this.stats.patternsDetected++;
            }
        }

        return patterns;
    }

    private async generatePredictions(error: ErrorEvent): Promise<ErrorPrediction[]> {
        const predictions: ErrorPrediction[] = [];

        // Analyze similar historical errors to predict future occurrences
        const similarErrors = Array.from(this.errors.values())
            .filter(e => this.calculateSimilarity(error, e) > 0.6);

        if (similarErrors.length >= 3) {
            const prediction: ErrorPrediction = {
                id: `prediction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                predictedErrorType: error.errorType,
                probability: Math.min(95, 40 + (similarErrors.length * 8)),
                timeframe: this.calculatePredictionTimeframe(similarErrors),
                riskLevel: this.calculateRiskLevel(error, similarErrors),
                triggerConditions: this.identifyTriggerConditions(similarErrors),
                preventiveActions: this.generatePreventiveActions(error),
                confidence: Math.min(90, 50 + (similarErrors.length * 6))
            };

            predictions.push(prediction);
            this.stats.predictionsGenerated++;
        }

        return predictions;
    }

    private async performRootCauseAnalysis(error: ErrorEvent): Promise<RootCauseAnalysis> {
        const causes = [];

        // Analyze stack trace
        if (error.stackTrace) {
            causes.push({
                cause: 'Code execution path analysis',
                probability: 85,
                evidence: [error.stackTrace.split('\n')[0]],
                category: 'technical' as const
            });
        }

        // Analyze error type
        if (error.errorType) {
            causes.push({
                cause: `${error.errorType} specific issue`,
                probability: 75,
                evidence: [`Error type: ${error.errorType}`],
                category: 'system' as const
            });
        }

        // Analyze context
        if (error.context) {
            causes.push({
                cause: 'Environmental factors',
                probability: 60,
                evidence: Object.keys(error.context).map(key => `${key}: ${error.context![key]}`),
                category: 'system' as const
            });
        }

        return {
            errorId: error.id,
            causes: causes.sort((a, b) => b.probability - a.probability),
            recommendations: this.generateRecommendations(error),
            confidence: causes.length > 0 ? Math.max(...causes.map(c => c.probability)) : 50
        };
    }

    private groupSimilarErrors(errors: ErrorEvent[]): Map<string, ErrorEvent[]> {
        const groups = new Map<string, ErrorEvent[]>();

        for (const error of errors) {
            // Create a grouping key based on error type and message similarity
            const groupKey = `${error.errorType}-${this.normalizeMessage(error.message)}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(error);
        }

        return groups;
    }

    private calculateSimilarity(error1: ErrorEvent, error2: ErrorEvent): number {
        let similarity = 0;

        // Error type match
        if (error1.errorType === error2.errorType) {
            similarity += 0.4;
        }

        // Message similarity using simple string comparison
        const messageSimilarity = this.calculateStringSimilarity(error1.message, error2.message);
        similarity += messageSimilarity * 0.4;

        // Context similarity
        if (error1.context && error2.context) {
            const contextSimilarity = this.calculateContextSimilarity(error1.context, error2.context);
            similarity += contextSimilarity * 0.2;
        }

        return Math.min(1, similarity);
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    private calculateContextSimilarity(context1: Record<string, any>, context2: Record<string, any>): number {
        const keys1 = Object.keys(context1);
        const keys2 = Object.keys(context2);
        const allKeys = new Set([...keys1, ...keys2]);

        let matches = 0;
        for (const key of Array.from(allKeys)) {
            if (context1[key] === context2[key]) {
                matches++;
            }
        }

        return matches / allKeys.size;
    }

    private extractPattern(errors: ErrorEvent[]): string {
        // Extract common pattern from error messages
        const messages = errors.map(e => e.message);
        return this.findCommonSubstring(messages) || `${errors[0].errorType} pattern`;
    }

    private findCommonSubstring(strings: string[]): string {
        if (strings.length === 0) return '';
        if (strings.length === 1) return strings[0];

        let common = strings[0];
        for (let i = 1; i < strings.length; i++) {
            common = this.longestCommonSubstring(common, strings[i]);
        }

        return common.trim() || `Pattern with ${strings.length} occurrences`;
    }

    private longestCommonSubstring(str1: string, str2: string): string {
        let longest = '';
        for (let i = 0; i < str1.length; i++) {
            for (let j = 0; j < str2.length; j++) {
                let k = 0;
                while (str1[i + k] === str2[j + k] && str1[i + k] && str2[j + k]) {
                    k++;
                }
                if (k > longest.length) {
                    longest = str1.substring(i, i + k);
                }
            }
        }
        return longest;
    }

    private calculateGroupSeverity(errors: ErrorEvent[]): 'low' | 'medium' | 'high' | 'critical' {
        const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
        const avgScore = errors.reduce((sum, e) => sum + severityScores[e.severity], 0) / errors.length;

        if (avgScore >= 3.5) return 'critical';
        if (avgScore >= 2.5) return 'high';
        if (avgScore >= 1.5) return 'medium';
        return 'low';
    }

    private categorizePattern(errors: ErrorEvent[]): string {
        const errorTypes = new Set(errors.map(e => e.errorType));
        if (errorTypes.size === 1) {
            return Array.from(errorTypes)[0];
        }
        return 'mixed';
    }

    private calculatePredictionTimeframe(errors: ErrorEvent[]): string {
        const intervals = [];
        errors.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (let i = 1; i < errors.length; i++) {
            const interval = errors[i].timestamp.getTime() - errors[i - 1].timestamp.getTime();
            intervals.push(interval);
        }

        if (intervals.length === 0) return '1-2 hours';

        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const hours = avgInterval / (1000 * 60 * 60);

        if (hours < 1) return 'within 1 hour';
        if (hours < 24) return `${Math.round(hours)} hours`;
        return `${Math.round(hours / 24)} days`;
    }

    private calculateRiskLevel(error: ErrorEvent, similarErrors: ErrorEvent[]): 'low' | 'medium' | 'high' | 'critical' {
        const severity = error.severity;
        const frequency = similarErrors.length;

        if (severity === 'critical' || frequency > 10) return 'critical';
        if (severity === 'high' || frequency > 5) return 'high';
        if (severity === 'medium' || frequency > 2) return 'medium';
        return 'low';
    }

    private identifyTriggerConditions(errors: ErrorEvent[]): string[] {
        const conditions = new Set<string>();

        // Analyze common contexts
        const contexts = errors.map(e => e.context).filter(Boolean);
        if (contexts.length > 0) {
            const commonKeys = this.findCommonKeys(contexts as Record<string, any>[]);
            commonKeys.forEach(key => conditions.add(`${key} related operations`));
        }

        // Analyze timing patterns
        const timestamps = errors.map(e => e.timestamp);
        if (this.hasTimePattern(timestamps)) {
            conditions.add('Time-based pattern detected');
        }

        return Array.from(conditions).slice(0, 3);
    }

    private generatePreventiveActions(error: ErrorEvent): string[] {
        const actions = [];

        if (error.errorType.includes('timeout')) {
            actions.push('Increase timeout values');
            actions.push('Implement retry mechanisms');
        }

        if (error.errorType.includes('memory')) {
            actions.push('Monitor memory usage');
            actions.push('Implement memory cleanup');
        }

        if (error.errorType.includes('auth')) {
            actions.push('Verify authentication tokens');
            actions.push('Implement token refresh logic');
        }

        actions.push('Add comprehensive error handling');
        actions.push('Implement monitoring alerts');

        return actions.slice(0, 3);
    }

    private generateRecommendations(error: ErrorEvent): string[] {
        const recommendations = [];

        if (error.stackTrace) {
            recommendations.push('Review the stack trace for the exact failure point');
        }

        if (error.context) {
            recommendations.push('Analyze the error context for environmental factors');
        }

        recommendations.push('Check system resources and dependencies');
        recommendations.push('Review recent code changes');
        recommendations.push('Implement additional logging for better debugging');

        return recommendations;
    }

    private findCommonKeys(contexts: Record<string, any>[]): string[] {
        const keyCounts = new Map<string, number>();

        contexts.forEach(context => {
            Object.keys(context).forEach(key => {
                keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
            });
        });

        return Array.from(keyCounts.entries())
            .filter(([_, count]) => count >= Math.ceil(contexts.length / 2))
            .map(([key]) => key);
    }

    private hasTimePattern(timestamps: Date[]): boolean {
        // Simple check for regular intervals
        if (timestamps.length < 3) return false;

        timestamps.sort((a, b) => a.getTime() - b.getTime());
        const intervals = [];

        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i].getTime() - timestamps[i - 1].getTime());
        }

        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

        return Math.sqrt(variance) < avgInterval * 0.3; // Low variance indicates pattern
    }

    private normalizeMessage(message: string): string {
        return message.toLowerCase()
            .replace(/\d+/g, 'NUMBER')
            .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
            .substring(0, 50);
    }

    private calculateOverallConfidence(errors: ErrorEvent[]): number {
        // Base confidence on number of errors and their characteristics
        const baseConfidence = Math.min(90, 30 + (errors.length * 5));

        // Adjust based on error diversity
        const uniqueTypes = new Set(errors.map(e => e.errorType));
        const diversityFactor = uniqueTypes.size / errors.length;

        return Math.round(baseConfidence * (1 - diversityFactor * 0.3));
    }

    private updateStats(processingTime: number, confidence: number): void {
        this.stats.lastAnalysis = new Date();
        this.stats.averageConfidence = (this.stats.averageConfidence + confidence) / 2;
        this.stats.processingTimeAverage = (this.stats.processingTimeAverage + processingTime) / 2;
    }

    private getRiskScore(riskLevel: string): number {
        switch (riskLevel) {
            case 'critical': return 40;
            case 'high': return 30;
            case 'medium': return 20;
            case 'low': return 10;
            default: return 0;
        }
    }

    private initializeMockData(): void {
        // Initialize with some sample data for testing
        const sampleErrors: ErrorEvent[] = [
            {
                id: 'error-1',
                timestamp: new Date(Date.now() - 3600000),
                errorType: 'timeout',
                message: 'Request timeout after 30 seconds',
                severity: 'medium',
                context: { endpoint: '/api/data', timeout: 30000 },
                tags: ['api', 'timeout']
            },
            {
                id: 'error-2',
                timestamp: new Date(Date.now() - 1800000),
                errorType: 'auth_error',
                message: 'Invalid authentication token',
                severity: 'high',
                context: { endpoint: '/api/secure', userId: 'user123' },
                tags: ['auth', 'security']
            }
        ];

        // Process sample errors
        sampleErrors.forEach(error => {
            this.errors.set(error.id, error);
            this.stats.totalErrorsProcessed++;
        });
    }
}