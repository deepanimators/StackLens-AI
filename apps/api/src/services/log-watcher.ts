/**
 * Log Watcher Service
 * Monitors external log files (like demo-pos-app logs) and detects errors in real-time
 * Integrates with LogParser for error pattern detection
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import * as chokidar from "chokidar";
import { LogParser, type ParsedError } from "./log-parser";

export interface WatcherStatus {
    isWatching: boolean;
    watchedFiles: string[];
    totalErrors: number;
    lastUpdate?: string;
    fileStats: Record<
        string,
        {
            path: string;
            lastLineCount: number;
            errorCount: number;
        }
    >;
}

export class LogWatcherService extends EventEmitter {
    private watcher: chokidar.FSWatcher | null = null;
    private watchedFiles: Map<string, number> = new Map(); // filename -> line count
    private totalErrors: number = 0;
    private logParser: LogParser;
    private isWatching: boolean = false;
    private fileStats: Map<
        string,
        {
            path: string;
            lastLineCount: number;
            errorCount: number;
        }
    > = new Map();

    constructor() {
        super();
        const now = new Date();
        this.logParser = new LogParser([
            {
                id: 1,
                pattern: "missing_price",
                regex: "Pricing error|MISSING_PRICE|no pricing information",
                severity: "CRITICAL",
                errorType: "MISSING_PRICE_ERROR",
                description: "Product pricing information is missing",
                isActive: true,
                createdAt: now,
                category: "ecommerce",
                suggestedFix: "Update product pricing information",
                occurrenceCount: 0,
                successRate: 0.95,
                avgResolutionTime: "15 minutes",
            },
            {
                id: 2,
                pattern: "product_not_found",
                regex: "Product not found|product.*not found",
                severity: "ERROR",
                errorType: "PRODUCT_NOT_FOUND",
                description: "Referenced product could not be found",
                isActive: true,
                createdAt: now,
                category: "ecommerce",
                suggestedFix: "Verify product ID exists in inventory",
                occurrenceCount: 0,
                successRate: 0.9,
                avgResolutionTime: "10 minutes",
            },
        ]);
    }

    /**
     * Start watching log files
     */
    async start(filePaths: string[]): Promise<void> {
        if (this.isWatching) {
            console.warn("[LogWatcherService] Already watching files");
            return;
        }

        try {
            // 🔥 FIX: Convert directories to file paths
            // If paths are directories, watch for .log files in them
            const actualFilePaths: string[] = [];

            for (const filePath of filePaths) {
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    if (stats.isDirectory()) {
                        // Watch all .log files in this directory
                        actualFilePaths.push(path.join(filePath, "*.log"));
                    } else {
                        actualFilePaths.push(filePath);
                    }
                }
            }

            // Initialize line counts for each file
            for (const filePath of actualFilePaths) {
                // Skip glob patterns, only count actual files
                if (fs.existsSync(filePath) && !filePath.includes("*")) {
                    const lineCount = fs.readFileSync(filePath, "utf-8").split("\n").length;
                    this.watchedFiles.set(filePath, lineCount);
                    this.fileStats.set(filePath, {
                        path: filePath,
                        lastLineCount: lineCount,
                        errorCount: 0,
                    });
                }
            }

            // Set up file watcher with debouncing
            this.watcher = chokidar.watch(actualFilePaths, {
                persistent: true,
                awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 },
            });

            this.watcher
                .on("change", (filePath: string) => this.handleFileChange(filePath))
                .on("error", (error) => {
                    console.error("[LogWatcherService] Watcher error:", error);
                    this.emit("error", error);
                });

            this.isWatching = true;
            console.log(`[LogWatcherService] Started watching ${filePaths.length} file(s)`);
            this.emit("started");
        } catch (error) {
            console.error("[LogWatcherService] Failed to start watcher:", error);
            throw error;
        }
    }

    /**
     * Handle file change - read new lines and detect errors
     */
    private async handleFileChange(filePath: string): Promise<void> {
        try {
            if (!fs.existsSync(filePath)) {
                return;
            }

            const content = fs.readFileSync(filePath, "utf-8");
            const lines = content.split("\n");
            const lastLineCount = this.watchedFiles.get(filePath) || 0;
            const newLines = lines.slice(lastLineCount);

            if (newLines.length === 0) {
                return;
            }

            // Update line count
            this.watchedFiles.set(filePath, lines.length);

            const stats = this.fileStats.get(filePath);
            if (stats) {
                stats.lastLineCount = lines.length;
            }

            // Parse new lines for errors
            const errors: ParsedError[] = [];

            for (const line of newLines) {
                if (!line.trim()) continue;

                try {
                    // Parse single line using parseLogFile on the line
                    const parsed = this.logParser.parseLogFile(line, filePath);
                    if (parsed && parsed.length > 0) {
                        for (const error of parsed) {
                            errors.push(error);
                            this.totalErrors++;

                            if (stats) {
                                stats.errorCount++;
                            }

                            // Emit individual error
                            this.emit("error-detected", {
                                file: filePath,
                                error,
                                timestamp: new Date().toISOString(),
                            });

                            console.log(
                                `[LogWatcherService] Error detected [${error.severity}]: ${error.message}`
                            );
                        }
                    }
                } catch (parseError) {
                    // Skip unparseable lines
                }
            }

            // Emit batch of errors if any were found
            if (errors.length > 0) {
                this.emit("change", {
                    file: filePath,
                    errors,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error(`[LogWatcherService] Error processing file ${filePath}:`, error);
            this.emit("error", error);
        }
    }

    /**
     * Stop watching files
     */
    async stop(): Promise<void> {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
            this.isWatching = false;
            console.log("[LogWatcherService] Stopped watching files");
            this.emit("stopped");
        }
    }

    /**
     * Add file to watch list
     */
    addFile(filePath: string): void {
        if (!this.watcher) {
            console.warn("[LogWatcherService] Watcher not active, cannot add file");
            return;
        }

        if (fs.existsSync(filePath)) {
            this.watcher.add(filePath);
            const lineCount = fs.readFileSync(filePath, "utf-8").split("\n").length;
            this.watchedFiles.set(filePath, lineCount);
            this.fileStats.set(filePath, {
                path: filePath,
                lastLineCount: lineCount,
                errorCount: 0,
            });
            console.log(`[LogWatcherService] Added file: ${filePath}`);
        }
    }

    /**
     * Remove file from watch list
     */
    removeFile(filePath: string): void {
        if (this.watcher) {
            this.watcher.unwatch(filePath);
            this.watchedFiles.delete(filePath);
            this.fileStats.delete(filePath);
            console.log(`[LogWatcherService] Removed file: ${filePath}`);
        }
    }

    /**
     * Get current watcher status
     */
    getStatus(): WatcherStatus {
        return {
            isWatching: this.isWatching,
            watchedFiles: Array.from(this.watchedFiles.keys()),
            totalErrors: this.totalErrors,
            lastUpdate: new Date().toISOString(),
            fileStats: Object.fromEntries(this.fileStats),
        };
    }

    /**
     * Reset error count
     */
    resetErrorCount(): void {
        this.totalErrors = 0;
        this.fileStats.forEach((stats) => {
            stats.errorCount = 0;
        });
    }
}

// Export singleton
export const logWatcher = new LogWatcherService();
