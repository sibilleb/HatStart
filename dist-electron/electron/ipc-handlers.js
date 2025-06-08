"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupManifestIpcHandlers = setupManifestIpcHandlers;
exports.setupSystemDetectionIpcHandlers = setupSystemDetectionIpcHandlers;
exports.setupFileOperationsIpcHandlers = setupFileOperationsIpcHandlers;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
                data: {
                    ...systemInfo,
                    homeDirectory: electron_1.app.getPath('home')
                }
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
/**
 * Setup IPC handlers for file operations
 */
function setupFileOperationsIpcHandlers() {
    // Ensure a directory exists
    const ensureDirectoryExists = (dirPath) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    };
    // Get app data directory
    const getAppDataPath = () => {
        return electron_1.app.getPath('userData');
    };
    // Resolve full path for a file
    const resolveFilePath = (fileName, directory) => {
        const appDataPath = getAppDataPath();
        const basePath = directory
            ? path.join(appDataPath, directory)
            : appDataPath;
        ensureDirectoryExists(basePath);
        return path.join(basePath, fileName);
    };
    // Save data to a file
    electron_1.ipcMain.handle('file:save', async (event, options) => {
        try {
            const { fileName, data, directory } = options;
            const filePath = resolveFilePath(fileName, directory);
            fs.writeFileSync(filePath, data, 'utf8');
            return true;
        }
        catch (error) {
            console.error('Failed to save file:', error);
            return false;
        }
    });
    // Load data from a file
    electron_1.ipcMain.handle('file:load', async (event, options) => {
        try {
            const { fileName, directory } = options;
            const filePath = resolveFilePath(fileName, directory);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            return fs.readFileSync(filePath, 'utf8');
        }
        catch (error) {
            console.error('Failed to load file:', error);
            return null;
        }
    });
    // Check if a file exists
    electron_1.ipcMain.handle('file:exists', async (event, options) => {
        try {
            const { fileName, directory } = options;
            const filePath = resolveFilePath(fileName, directory);
            return fs.existsSync(filePath);
        }
        catch (error) {
            console.error('Failed to check if file exists:', error);
            return false;
        }
    });
    // Delete a file
    electron_1.ipcMain.handle('file:delete', async (event, options) => {
        try {
            const { fileName, directory } = options;
            const filePath = resolveFilePath(fileName, directory);
            if (!fs.existsSync(filePath)) {
                return false;
            }
            fs.unlinkSync(filePath);
            return true;
        }
        catch (error) {
            console.error('Failed to delete file:', error);
            return false;
        }
    });
    // List files in a directory
    electron_1.ipcMain.handle('file:list', async (event, options) => {
        try {
            const { directory, extension } = options;
            const dirPath = resolveFilePath('', directory);
            if (!fs.existsSync(dirPath)) {
                return [];
            }
            const files = fs.readdirSync(dirPath);
            if (extension) {
                return files.filter((file) => file.endsWith(extension));
            }
            return files;
        }
        catch (error) {
            console.error('Failed to list files:', error);
            return [];
        }
    });
    // Create workspace with files
    electron_1.ipcMain.handle('workspace:create', async (event, options) => {
        try {
            const { path: workspacePath, files } = options;
            // Create workspace directory
            if (!fs.existsSync(workspacePath)) {
                fs.mkdirSync(workspacePath, { recursive: true });
            }
            // Create each file
            for (const file of files) {
                const filePath = path.join(workspacePath, file.path);
                const fileDir = path.dirname(filePath);
                // Ensure directory exists
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                // Write file content
                fs.writeFileSync(filePath, file.content, 'utf8');
            }
            return { success: true };
        }
        catch (error) {
            console.error('Failed to create workspace:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    // Version Management APIs - Minimal implementation for MVP
    // Start with just Mise support as recommended in feature-complexity-review.md
    // Get list of supported version managers
    electron_1.ipcMain.handle('version-manager:list', async () => {
        try {
            // For MVP, only support Mise
            return {
                success: true,
                managers: [{
                        type: 'mise',
                        name: 'Mise',
                        description: 'Universal version manager',
                        isInstalled: false, // Will be checked dynamically
                        supportedTools: ['node', 'python', 'ruby', 'go', 'rust']
                    }]
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    // Check if a version manager is installed
    electron_1.ipcMain.handle('version-manager:check-installed', async (event, managerType) => {
        try {
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
            const execAsync = promisify(exec);
            // For MVP, only check Mise
            if (managerType !== 'mise') {
                return { success: false, error: 'Only Mise is supported in MVP' };
            }
            try {
                await execAsync('mise --version');
                return { success: true, isInstalled: true };
            }
            catch {
                return { success: true, isInstalled: false };
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    // Get installed versions for a tool
    electron_1.ipcMain.handle('version-manager:list-versions', async (event, tool) => {
        try {
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
            const execAsync = promisify(exec);
            // Check if mise is installed first
            try {
                await execAsync('mise --version');
            }
            catch {
                return { success: false, error: 'Mise is not installed' };
            }
            // Get installed versions
            const { stdout } = await execAsync(`mise list ${tool}`);
            const versions = stdout.trim().split('\n').filter(Boolean);
            return { success: true, versions };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    // Get current active version for a tool
    electron_1.ipcMain.handle('version-manager:current-version', async (event, tool) => {
        try {
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
            const execAsync = promisify(exec);
            const { stdout } = await execAsync(`mise current ${tool}`);
            const version = stdout.trim();
            return { success: true, version };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
}
//# sourceMappingURL=ipc-handlers.js.map