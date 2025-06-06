// Shared types for IPC communication

export interface InstallProgress {
  step: string;
  progress: number;
  message: string;
  toolId: string;
}

export interface IpcRequest {
  channel: string;
  data?: unknown;
}

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Re-export manifest types for convenience
export * from './manifest-types';
