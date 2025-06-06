"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupManifestIpcHandlers = setupManifestIpcHandlers;
exports.setupSystemDetectionIpcHandlers = setupSystemDetectionIpcHandlers;
const electron_1 = require("electron");
const error_logging_1 = require("../src/shared/error-logging");
const system_detector_js_1 = require("../src/shared/system-detector.js");
const manifest_loader_main_1 = require("./manifest-loader-main");
const manifestLoader = new manifest_loader_main_1.MainProcessManifestLoader();
let systemDetector = null;
/**
 * Get or create system detector instance
 */
function getSystemDetector() {
    if (!systemDetector) {
        systemDetector = new system_detector_js_1.SystemDetector();
    }
    return systemDetector;
}
/**
 * Setup IPC handlers for manifest loading operations
 */
function setupManifestIpcHandlers() {
    // Basic manifest loading with enhanced error logging
    electron_1.ipcMain.handle('manifest:load', async (event, source) => {
        try {
            const result = await manifestLoader.loadManifestFromFile(source);
            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                    metadata: result.metadata
                };
            }
            else {
                // Convert LoadError to HatStartError and log
                const hatStartError = {
                    code: result.error?.code || 'UNKNOWN_ERROR',
                    technicalMessage: result.error?.message || 'Unknown error',
                    userMessage: 'Failed to load manifest. Please check the file path and try again.',
                    severity: 'error',
                    category: source.startsWith('http') ? 'network' : 'filesystem',
                    timestamp: new Date().toISOString(),
                    recoveryStrategies: ['retry', 'fallback'],
                    context: {
                        component: 'ipc-handlers',
                        operation: 'manifest:load',
                        resource: source
                    }
                };
                await error_logging_1.defaultErrorLogger.logError(hatStartError);
                return {
                    success: false,
                    error: {
                        code: hatStartError.code,
                        message: hatStartError.technicalMessage,
                        severity: hatStartError.severity,
                        category: hatStartError.category,
                        userMessage: hatStartError.userMessage
                    }
                };
            }
        }
        catch (error) {
            // Handle unexpected errors
            const hatStartError = {
                code: 'UNEXPECTED_ERROR',
                technicalMessage: error instanceof Error ? error.message : 'Unknown error occurred',
                userMessage: 'An unexpected error occurred. Please try again.',
                severity: 'error',
                category: 'system',
                timestamp: new Date().toISOString(),
                recoveryStrategies: ['retry'],
                context: {
                    component: 'ipc-handlers',
                    operation: 'manifest:load',
                    resource: source
                }
            };
            await error_logging_1.defaultErrorLogger.logError(hatStartError);
            return {
                success: false,
                error: {
                    code: hatStartError.code,
                    message: hatStartError.technicalMessage,
                    severity: hatStartError.severity,
                    category: hatStartError.category,
                    userMessage: hatStartError.userMessage
                }
            };
        }
    });
    // Legacy support - single file loading
    electron_1.ipcMain.handle('manifest:loadFile', async (event, filePath) => {
        // Reuse the main load handler
        return electron_1.ipcMain.emit('manifest:load', event, filePath);
    });
    // Error monitoring endpoints  
    electron_1.ipcMain.handle('manifest:getErrorMetrics', async () => {
        try {
            const metrics = error_logging_1.defaultErrorLogger.getMetrics();
            return { success: true, metrics };
        }
        catch {
            return {
                success: false,
                error: {
                    code: 'METRICS_ERROR',
                    message: 'Failed to retrieve error metrics',
                    severity: 'warning',
                    category: 'system',
                    userMessage: 'Unable to retrieve error statistics at this time.'
                }
            };
        }
    });
    // Cache management with error handling
    electron_1.ipcMain.handle('manifest:ensureCacheDir', async () => {
        try {
            await manifestLoader.ensureCacheDir();
            return { success: true };
        }
        catch (error) {
            const hatStartError = {
                code: 'CACHE_SETUP_ERROR',
                technicalMessage: error instanceof Error ? error.message : 'Failed to setup cache',
                userMessage: 'Unable to setup cache directory.',
                severity: 'warning',
                category: 'filesystem',
                timestamp: new Date().toISOString(),
                recoveryStrategies: ['retry'],
                context: {
                    component: 'ipc-handlers',
                    operation: 'manifest:ensureCacheDir'
                }
            };
            await error_logging_1.defaultErrorLogger.logError(hatStartError);
            return {
                success: false,
                error: {
                    code: hatStartError.code,
                    message: hatStartError.technicalMessage,
                    severity: hatStartError.severity,
                    category: hatStartError.category,
                    userMessage: hatStartError.userMessage
                }
            };
        }
    });
    electron_1.ipcMain.handle('manifest:clearCache', async () => {
        try {
            await manifestLoader.clearCache();
            return { success: true };
        }
        catch (error) {
            const hatStartError = {
                code: 'CACHE_CLEAR_ERROR',
                technicalMessage: error instanceof Error ? error.message : 'Failed to clear cache',
                userMessage: 'Unable to clear cache.',
                severity: 'warning',
                category: 'filesystem',
                timestamp: new Date().toISOString(),
                recoveryStrategies: ['retry'],
                context: {
                    component: 'ipc-handlers',
                    operation: 'manifest:clearCache'
                }
            };
            await error_logging_1.defaultErrorLogger.logError(hatStartError);
            return {
                success: false,
                error: {
                    code: hatStartError.code,
                    message: hatStartError.technicalMessage,
                    severity: hatStartError.severity,
                    category: hatStartError.category,
                    userMessage: hatStartError.userMessage
                }
            };
        }
    });
}
/**
 * Setup IPC handlers for system detection operations
 */
function setupSystemDetectionIpcHandlers() {
    // Run system detection
    electron_1.ipcMain.handle('system-detection:detect', async () => {
        try {
            const detector = getSystemDetector();
            const report = await detector.detectTools();
            return {
                success: true,
                data: report
            };
        }
        catch (error) {
            const hatStartError = {
                code: 'SYSTEM_DETECTION_ERROR',
                technicalMessage: error instanceof Error ? error.message : 'System detection failed',
                userMessage: 'Failed to detect installed tools. Please try again.',
                severity: 'error',
                category: 'system',
                timestamp: new Date().toISOString(),
                recoveryStrategies: ['retry'],
                context: {
                    component: 'ipc-handlers',
                    operation: 'system-detection:detect'
                }
            };
            await error_logging_1.defaultErrorLogger.logError(hatStartError);
            return {
                success: false,
                error: {
                    code: hatStartError.code,
                    message: hatStartError.technicalMessage,
                    severity: hatStartError.severity,
                    category: hatStartError.category,
                    userMessage: hatStartError.userMessage
                }
            };
        }
    });
    // Get system info only
    electron_1.ipcMain.handle('system-detection:info', async () => {
        try {
            const detector = getSystemDetector();
            const systemInfo = await detector.detectSystemInfo();
            return {
                success: true,
                data: systemInfo
            };
        }
        catch (error) {
            const hatStartError = {
                code: 'SYSTEM_INFO_ERROR',
                technicalMessage: error instanceof Error ? error.message : 'System info detection failed',
                userMessage: 'Failed to detect system information.',
                severity: 'warning',
                category: 'system',
                timestamp: new Date().toISOString(),
                recoveryStrategies: ['retry'],
                context: {
                    component: 'ipc-handlers',
                    operation: 'system-detection:info'
                }
            };
            await error_logging_1.defaultErrorLogger.logError(hatStartError);
            return {
                success: false,
                error: {
                    code: hatStartError.code,
                    message: hatStartError.technicalMessage,
                    severity: hatStartError.severity,
                    category: hatStartError.category,
                    userMessage: hatStartError.userMessage
                }
            };
        }
    });
    // Detect specific tool
    electron_1.ipcMain.handle('system-detection:tool', async (event, toolName) => {
        try {
            const detector = getSystemDetector();
            const result = await detector.detectTool(toolName);
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            const hatStartError = {
                code: 'TOOL_DETECTION_ERROR',
                technicalMessage: error instanceof Error ? error.message : 'Tool detection failed',
                userMessage: `Failed to detect ${toolName}. Please try again.`,
                severity: 'warning',
                category: 'system',
                timestamp: new Date().toISOString(),
                recoveryStrategies: ['retry'],
                context: {
                    component: 'ipc-handlers',
                    operation: 'system-detection:tool',
                    resource: toolName
                }
            };
            await error_logging_1.defaultErrorLogger.logError(hatStartError);
            return {
                success: false,
                error: {
                    code: hatStartError.code,
                    message: hatStartError.technicalMessage,
                    severity: hatStartError.severity,
                    category: hatStartError.category,
                    userMessage: hatStartError.userMessage
                }
            };
        }
    });
}
//# sourceMappingURL=ipc-handlers.js.map