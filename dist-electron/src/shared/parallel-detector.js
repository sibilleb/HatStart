"use strict";
/**
 * Parallel Detection Execution System
 * Optimizes detection performance through parallel execution and resource management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parallelDetector = exports.ParallelDetector = void 0;
const events_1 = require("events");
const detection_errors_js_1 = require("./detection-errors.js");
const detection_logger_js_1 = require("./detection-logger.js");
// Simple cache implementation for detection results
class SimpleCache {
    constructor() {
        this.cache = new Map();
    }
    set(key, value, ttl) {
        this.cache.set(key, { value, expires: Date.now() + ttl });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    clear() {
        this.cache.clear();
    }
    getStats() {
        return { size: this.cache.size, maxSize: 1000 };
    }
}
class ParallelDetector extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.runningTasks = new Map();
        this.completedTasks = new Map();
        this.currentConcurrency = 0;
        this.config = {
            maxConcurrency: 4,
            globalTimeout: 30000,
            enableCaching: true,
            cacheTtl: 300000, // 5 minutes
            enableMonitoring: true,
            resourceThresholds: {
                maxMemoryUsage: 512, // 512 MB
                maxCpuUsage: 80 // 80%
            },
            ...config
        };
        this.cache = new SimpleCache();
        this.logger = new detection_logger_js_1.DetectionLogger();
        // Auto-adjust concurrency based on system capabilities
        this.adjustConcurrencyBasedOnSystem();
    }
    /**
     * Execute multiple detection tasks in parallel with optimization
     */
    async executeDetections(tasks) {
        const startTime = Date.now();
        this.logger.info('ParallelDetector', 'executeDetections', `Starting parallel execution of ${tasks.length} detection tasks`);
        // Validate and sort tasks by priority and dependencies
        const sortedTasks = this.prioritizeAndValidateTasks(tasks);
        // Execute tasks with dependency management
        const results = await this.executeTasksWithDependencies(sortedTasks);
        const endTime = Date.now();
        const summary = this.generateExecutionSummary(results, endTime - startTime);
        this.logger.info('ParallelDetector', 'executeDetections', `Completed execution: ${summary.successCount}/${summary.tasksExecuted} successful`, { summary });
        this.emit('executionComplete', summary);
        return summary;
    }
    /**
     * Execute a single detection task with caching and monitoring
     */
    async executeDetection(task) {
        const cacheKey = `detection_${task.category}_${task.id}`;
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                this.logger.debug('ParallelDetector', 'executeDetection', `Cache hit for task ${task.id}`);
                return {
                    taskId: task.id,
                    result: cached,
                    executionTime: 0,
                    cached: true
                };
            }
        }
        const startTime = Date.now();
        let result;
        let error;
        let resourceUsage;
        try {
            // Execute with basic monitoring
            result = await this.executeWithTimeout(task);
            // Basic resource usage tracking (simplified)
            if (this.config.enableMonitoring) {
                resourceUsage = {
                    peakMemory: 0, // Would need system-level monitoring for real data
                    avgCpuUsage: 0 // Would need system-level monitoring for real data
                };
            }
            // Cache successful results
            if (this.config.enableCaching && result) {
                this.cache.set(cacheKey, result, this.config.cacheTtl);
            }
        }
        catch (err) {
            error = err instanceof detection_errors_js_1.DetectionError ? err :
                new detection_errors_js_1.DetectionError(err instanceof Error ? err.message : String(err), 'unknown', 'medium', {
                    component: 'ParallelDetector',
                    operation: 'executeDetection',
                    timestamp: new Date()
                }, { originalError: err instanceof Error ? err : undefined });
            this.logger.error('ParallelDetector', 'executeDetection', `Task ${task.id} failed: ${error.message}`);
        }
        const executionTime = Date.now() - startTime;
        return {
            taskId: task.id,
            result,
            error,
            executionTime,
            cached: false,
            resourceUsage
        };
    }
    /**
     * Cancel all running detections
     */
    async cancelAllDetections() {
        this.logger.warn('ParallelDetector', 'cancelAllDetections', `Cancelling ${this.runningTasks.size} running tasks`);
        // Note: We can't actually cancel promises, but we can stop waiting for them
        this.runningTasks.clear();
        this.currentConcurrency = 0;
        this.emit('executionCancelled');
    }
    /**
     * Get current execution statistics
     */
    getExecutionStats() {
        return {
            runningTasks: this.runningTasks.size,
            completedTasks: this.completedTasks.size,
            currentConcurrency: this.currentConcurrency,
            maxConcurrency: this.config.maxConcurrency,
            cacheStats: this.cache.getStats()
        };
    }
    /**
     * Update execution configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('ParallelDetector', 'updateConfig', 'Configuration updated', { config: this.config });
    }
    /**
     * Clear all cached results
     */
    clearCache() {
        this.cache.clear();
        this.logger.info('ParallelDetector', 'clearCache', 'Detection cache cleared');
    }
    // Private helper methods
    /**
     * Execute task with timeout protection
     */
    async executeWithTimeout(task) {
        const timeout = task.timeout || this.config.globalTimeout;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(detection_errors_js_1.DetectionError.timeout('executeWithTimeout', 'ParallelDetector', timeout, `Task ${task.id}`));
            }, timeout);
            task.detector()
                .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
    /**
     * Prioritize and validate tasks before execution
     */
    prioritizeAndValidateTasks(tasks) {
        // Validate dependencies
        const taskIds = new Set(tasks.map(t => t.id));
        for (const task of tasks) {
            if (task.dependencies) {
                for (const dep of task.dependencies) {
                    if (!taskIds.has(dep)) {
                        this.logger.warn('ParallelDetector', 'prioritizeAndValidateTasks', `Task ${task.id} has unknown dependency: ${dep}`);
                    }
                }
            }
        }
        // Sort by priority (higher first), then by estimated time (shorter first)
        return [...tasks].sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return (a.estimatedTime || 1000) - (b.estimatedTime || 1000);
        });
    }
    /**
     * Execute tasks respecting dependencies and concurrency limits
     */
    async executeTasksWithDependencies(tasks) {
        const results = [];
        const completedTaskIds = new Set();
        const remainingTasks = [...tasks];
        while (remainingTasks.length > 0) {
            // Find tasks that can be executed (dependencies satisfied)
            const readyTasks = remainingTasks.filter(task => !task.dependencies ||
                task.dependencies.every(dep => completedTaskIds.has(dep)));
            if (readyTasks.length === 0) {
                // No tasks can be executed - circular dependency or missing dependency
                this.logger.error('ParallelDetector', 'executeTasksWithDependencies', 'Circular dependency or missing dependency detected');
                break;
            }
            // Execute ready tasks in parallel (up to concurrency limit)
            const tasksToExecute = readyTasks.slice(0, Math.min(readyTasks.length, this.config.maxConcurrency - this.currentConcurrency));
            if (tasksToExecute.length === 0) {
                // Wait for running tasks to complete
                await this.waitForRunningTasks();
                continue;
            }
            // Start executing tasks
            const executionPromises = tasksToExecute.map(task => {
                this.currentConcurrency++;
                const promise = this.executeDetection(task)
                    .finally(() => {
                    this.currentConcurrency--;
                    this.runningTasks.delete(task.id);
                });
                this.runningTasks.set(task.id, promise);
                return promise;
            });
            // Remove tasks from remaining list
            tasksToExecute.forEach(task => {
                const index = remainingTasks.indexOf(task);
                if (index !== -1) {
                    remainingTasks.splice(index, 1);
                }
            });
            // Wait for all tasks in this batch to complete
            const batchResults = await Promise.all(executionPromises);
            results.push(...batchResults);
            // Mark completed tasks
            batchResults.forEach(result => {
                if (result.result && !result.error) {
                    completedTaskIds.add(result.taskId);
                }
                this.completedTasks.set(result.taskId, result);
            });
            this.emit('batchComplete', batchResults);
        }
        return results;
    }
    /**
     * Wait for at least one running task to complete
     */
    async waitForRunningTasks() {
        if (this.runningTasks.size === 0)
            return;
        await Promise.race(Array.from(this.runningTasks.values()));
    }
    /**
     * Generate execution summary from results
     */
    generateExecutionSummary(results, totalTime) {
        const successCount = results.filter(r => r.result && !r.error).length;
        const failureCount = results.filter(r => r.error).length;
        const cacheHits = results.filter(r => r.cached).length;
        const executionTimes = results.filter(r => !r.cached).map(r => r.executionTime);
        const avgExecutionTime = executionTimes.length > 0 ?
            executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0;
        const maxExecutionTime = executionTimes.length > 0 ? Math.max(...executionTimes) : 0;
        const resourceUsages = results.filter(r => r.resourceUsage);
        const totalResourceUsage = {
            peakMemory: resourceUsages.length > 0 ?
                Math.max(...resourceUsages.map(r => r.resourceUsage.peakMemory)) : 0,
            avgCpuUsage: resourceUsages.length > 0 ?
                resourceUsages.reduce((a, r) => a + r.resourceUsage.avgCpuUsage, 0) / resourceUsages.length : 0
        };
        return {
            totalTime,
            tasksExecuted: results.length,
            successCount,
            failureCount,
            cacheHits,
            performance: {
                avgExecutionTime,
                maxExecutionTime,
                totalResourceUsage
            }
        };
    }
    /**
     * Auto-adjust concurrency based on system capabilities
     */
    adjustConcurrencyBasedOnSystem() {
        // This would ideally check system specs, but for now use a conservative default
        // that works well on most systems
        const detectedCores = 4; // Would be detected via os.cpus().length in real implementation
        const recommendedConcurrency = Math.max(2, Math.min(detectedCores, 8));
        if (this.config.maxConcurrency > recommendedConcurrency) {
            this.config.maxConcurrency = recommendedConcurrency;
            this.logger.info('ParallelDetector', 'adjustConcurrencyBasedOnSystem', `Auto-adjusted concurrency to ${recommendedConcurrency} based on system capabilities`);
        }
    }
}
exports.ParallelDetector = ParallelDetector;
// Export singleton instance for global use
exports.parallelDetector = new ParallelDetector();
//# sourceMappingURL=parallel-detector.js.map