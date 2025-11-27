/**
 * POS Error Data Collector
 *
 * This service collects error data from POS backend logs and converts them
 * into training data format for the suggestion model. Supports multiple data sources:
 * 1. Excel uploads (external training data)
 * 2. POS backend logs (real application errors)
 * 3. Manual definitions (database entries)
 */

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
    POS_ERROR_SCENARIOS,
    EnhancedErrorScenario,
} from "../data/pos-error-scenarios";

interface POSErrorLog {
    timestamp: string;
    errorCode: string;
    errorDescription: string;
    userId: number;
    severity: string;
    context?: Record<string, any>;
    resolved?: boolean;
    resolutionTime?: number;
}

interface SuggestionTrainingData {
    errorDescription: string;
    errorType: string;
    severity: string;
    category: string;
    resolutionSteps: string[];
    keywords: string[];
    context?: string;
    source: "excel" | "gemini" | "manual" | "pos_demo";
    confidence: number;
    verified: boolean;
    systemMetrics?: Record<string, any>;
    businessContext?: Record<string, any>;
    preventionMeasures?: string[];
    errorCode?: string;
}

export class POSErrorDataCollector {
    /**
     * Collect from POS Error Scenarios
     */
    public collectFromPOSScenarios(): SuggestionTrainingData[] {
        console.log(
            `📊 Collecting data from ${POS_ERROR_SCENARIOS.length} POS scenarios...`
        );

        return POS_ERROR_SCENARIOS.map((scenario: EnhancedErrorScenario) =>
            this.convertPOSScenarioToTrainingData(scenario)
        );
    }

    /**
     * Convert POS scenario to training data format
     */
    private convertPOSScenarioToTrainingData(
        scenario: EnhancedErrorScenario
    ): SuggestionTrainingData {
        return {
            errorCode: scenario.errorCode,
            errorDescription: scenario.errorDescription,
            errorType: scenario.errorType,
            severity: scenario.severity,
            category: scenario.category,
            resolutionSteps: scenario.resolutionSteps,
            keywords: scenario.keywords,
            source: "pos_demo",
            confidence: scenario.confidence,
            verified: scenario.verified,
            systemMetrics: scenario.systemMetrics,
            businessContext: scenario.businessContext,
            preventionMeasures: scenario.preventionMeasures,
            context: `POS Error: ${scenario.errorDescription}`,
        };
    }

    /**
     * Collect from Excel file
     */
    public async collectFromExcel(
        filePath: string
    ): Promise<SuggestionTrainingData[]> {
        console.log(`📁 Reading Excel file: ${filePath}`);

        try {
            const fileBuffer = fs.readFileSync(filePath);
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const data: any[] = XLSX.utils.sheet_to_json(worksheet);

            console.log(`📊 Found ${data.length} rows in Excel file`);

            return data.map((row: any) => this.convertExcelRowToTrainingData(row));
        } catch (error) {
            console.error(`❌ Error reading Excel file: ${error}`);
            return [];
        }
    }

    /**
     * Convert Excel row to training data
     */
    private convertExcelRowToTrainingData(row: any): SuggestionTrainingData {
        return {
            errorCode: row.ErrorCode || row.errorCode || "UNKNOWN",
            errorDescription: row.ErrorDescription || row.errorDescription || "",
            errorType: row.ErrorType || row.errorType || "unknown",
            severity: row.Severity || row.severity || "medium",
            category: row.Category || row.category || "general",
            resolutionSteps: this.parseArrayField(
                row.ResolutionSteps || row.resolutionSteps
            ),
            keywords: this.parseArrayField(row.Keywords || row.keywords),
            source: "excel",
            confidence: parseFloat(row.Confidence || row.confidence || "0.5"),
            verified: row.Verified === true || row.verified === "true",
            systemMetrics: row.SystemMetrics
                ? JSON.parse(row.SystemMetrics)
                : undefined,
            businessContext: row.BusinessContext
                ? JSON.parse(row.BusinessContext)
                : undefined,
            preventionMeasures: this.parseArrayField(
                row.PreventionMeasures || row.preventionMeasures
            ),
            context: row.Context || row.context,
        };
    }

    /**
     * Collect from manual database entries
     */
    public collectFromManualDefinitions(
        definitions: any[]
    ): SuggestionTrainingData[] {
        console.log(
            `📊 Collecting ${definitions.length} manual error definitions...`
        );

        return definitions.map((def: any) =>
            this.convertManualDefinitionToTrainingData(def)
        );
    }

    /**
     * Convert manual definition to training data
     */
    private convertManualDefinitionToTrainingData(
        definition: any
    ): SuggestionTrainingData {
        return {
            errorCode: definition.errorCode || "MANUAL_ERROR",
            errorDescription: definition.description || "",
            errorType: definition.errorType || "manual",
            severity: definition.severity || "medium",
            category: definition.category || "general",
            resolutionSteps: definition.resolutionSteps || [],
            keywords: definition.keywords || [],
            source: "manual",
            confidence: definition.confidence || 0.8,
            verified: definition.verified || true,
            systemMetrics: definition.systemMetrics,
            businessContext: definition.businessContext,
            preventionMeasures: definition.preventionMeasures,
            context: definition.context,
        };
    }

    /**
     * Collect from multiple sources and merge
     */
    public async collectFromMultipleSources(options: {
        excelFiles?: string[];
        usePOSScenarios?: boolean;
        manualDefinitions?: any[];
    }): Promise<{
        trainingData: SuggestionTrainingData[];
        stats: {
            totalSamples: number;
            sourceBreakdown: Record<string, number>;
            categoryBreakdown: Record<string, number>;
            severityBreakdown: Record<string, number>;
        };
    }> {
        const allTrainingData: SuggestionTrainingData[] = [];
        const sourceCount: Record<string, number> = {};

        // Collect from POS Scenarios
        if (options.usePOSScenarios) {
            console.log("🔄 Loading POS error scenarios...");
            const posData = this.collectFromPOSScenarios();
            allTrainingData.push(...posData);
            sourceCount["pos_demo"] = posData.length;
            console.log(`✅ Loaded ${posData.length} POS scenarios`);
        }

        // Collect from Excel files
        if (options.excelFiles && options.excelFiles.length > 0) {
            console.log(`🔄 Loading ${options.excelFiles.length} Excel files...`);
            for (const excelFile of options.excelFiles) {
                const excelData = await this.collectFromExcel(excelFile);
                allTrainingData.push(...excelData);
                sourceCount["excel"] = (sourceCount["excel"] || 0) + excelData.length;
            }
            console.log(
                `✅ Loaded ${sourceCount["excel"]} samples from Excel files`
            );
        }

        // Collect from manual definitions
        if (
            options.manualDefinitions &&
            options.manualDefinitions.length > 0
        ) {
            console.log(
                `🔄 Loading ${options.manualDefinitions.length} manual definitions...`
            );
            const manualData = this.collectFromManualDefinitions(
                options.manualDefinitions
            );
            allTrainingData.push(...manualData);
            sourceCount["manual"] = manualData.length;
            console.log(`✅ Loaded ${sourceCount["manual"]} manual definitions`);
        }

        // Calculate breakdown statistics
        const categoryBreakdown: Record<string, number> = {};
        const severityBreakdown: Record<string, number> = {};

        allTrainingData.forEach((item) => {
            categoryBreakdown[item.category] =
                (categoryBreakdown[item.category] || 0) + 1;
            severityBreakdown[item.severity] =
                (severityBreakdown[item.severity] || 0) + 1;
        });

        console.log(`\n📊 Data Collection Summary:`);
        console.log(`   Total samples: ${allTrainingData.length}`);
        console.log(
            `   Source breakdown: ${JSON.stringify(sourceCount, null, 2)}`
        );
        console.log(
            `   Category breakdown: ${JSON.stringify(categoryBreakdown, null, 2)}`
        );
        console.log(
            `   Severity breakdown: ${JSON.stringify(severityBreakdown, null, 2)}`
        );

        return {
            trainingData: allTrainingData,
            stats: {
                totalSamples: allTrainingData.length,
                sourceBreakdown: sourceCount,
                categoryBreakdown,
                severityBreakdown,
            },
        };
    }

    /**
     * Extract POS backend error logs
     */
    public extractPOSBackendLogs(logFilePath: string): POSErrorLog[] {
        console.log(`📂 Extracting POS backend logs from: ${logFilePath}`);

        try {
            if (!fs.existsSync(logFilePath)) {
                console.warn(`⚠️ Log file not found: ${logFilePath}`);
                return [];
            }

            const logContent = fs.readFileSync(logFilePath, "utf-8");
            const logLines = logContent.split("\n");

            const errorLogs: POSErrorLog[] = [];

            logLines.forEach((line: string, index: number) => {
                if (line.includes("ERROR") || line.includes("error")) {
                    try {
                        // Try to parse JSON logs
                        const logEntry = JSON.parse(line);
                        errorLogs.push({
                            timestamp: logEntry.timestamp || new Date().toISOString(),
                            errorCode: logEntry.code || "UNKNOWN",
                            errorDescription: logEntry.message || "",
                            userId: logEntry.userId || 0,
                            severity: logEntry.level || "error",
                            context: logEntry.context || undefined,
                            resolved: logEntry.resolved || false,
                            resolutionTime: logEntry.resolutionTime || undefined,
                        });
                    } catch (e) {
                        // If JSON parsing fails, treat as plain text log
                        errorLogs.push({
                            timestamp: new Date().toISOString(),
                            errorCode: `LOG_LINE_${index}`,
                            errorDescription: line,
                            userId: 0,
                            severity: "unknown",
                        });
                    }
                }
            });

            console.log(
                `✅ Extracted ${errorLogs.length} error logs from backend`
            );
            return errorLogs;
        } catch (error) {
            console.error(`❌ Error extracting POS backend logs: ${error}`);
            return [];
        }
    }

    /**
     * Parse array field from Excel (comma-separated string or JSON)
     */
    private parseArrayField(field: any): string[] {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === "string") {
            try {
                // Try JSON parse first
                return JSON.parse(field);
            } catch {
                // Fall back to comma-separated
                return field.split(",").map((s: string) => s.trim());
            }
        }
        return [];
    }

    /**
     * Validate training data quality
     */
    public validateTrainingData(data: SuggestionTrainingData[]): {
        isValid: boolean;
        issues: string[];
        stats: {
            total: number;
            valid: number;
            missing: Record<string, number>;
        };
    } {
        console.log(
            `🔍 Validating ${data.length} training samples...`
        );

        const issues: string[] = [];
        const missing: Record<string, number> = {
            noErrorCode: 0,
            noDescription: 0,
            noCategory: 0,
            noResolutionSteps: 0,
            lowConfidence: 0,
        };

        let validCount = 0;

        data.forEach((item, index) => {
            let isValid = true;

            if (!item.errorCode || item.errorCode === "UNKNOWN") {
                missing.noErrorCode++;
                isValid = false;
            }

            if (!item.errorDescription || item.errorDescription.length < 5) {
                missing.noDescription++;
                isValid = false;
            }

            if (!item.category) {
                missing.noCategory++;
                isValid = false;
            }

            if (!item.resolutionSteps || item.resolutionSteps.length === 0) {
                missing.noResolutionSteps++;
                isValid = false;
            }

            if (item.confidence < 0.5) {
                missing.lowConfidence++;
                isValid = false;
            }

            if (isValid) {
                validCount++;
            }
        });

        const isOverallValid = validCount / data.length > 0.9; // 90% valid threshold

        console.log(`\n✅ Validation Results:`);
        console.log(`   Total: ${data.length}`);
        console.log(`   Valid: ${validCount} (${((validCount / data.length) * 100).toFixed(1)}%)`);
        console.log(`   Missing/Issues: ${JSON.stringify(missing, null, 2)}`);

        if (!isOverallValid) {
            issues.push(
                `Data quality below threshold: only ${validCount}/${data.length} samples are complete`
            );
        }

        return {
            isValid: isOverallValid,
            issues,
            stats: {
                total: data.length,
                valid: validCount,
                missing,
            },
        };
    }
}

export const posErrorCollector = new POSErrorDataCollector();
