declare module "react-native-background-actions" {
  export interface BackgroundTaskOptions {
    taskName: string;
    taskTitle: string;
    taskDesc: string;
    taskIcon: {
      name: string;
      type: string;
      package?: string;
    };
    color?: string;
    linkingURI?: string;
    progressBar?: {
      max: number;
      value: number;
      indeterminate?: boolean;
    };
    parameters?: Record<string, unknown>;
  }

  export interface UpdateNotificationOptions {
    taskTitle?: string;
    taskDesc?: string;
    progressBar?: {
      max: number;
      value: number;
      indeterminate?: boolean;
    };
  }

  export type BackgroundTaskFunction = (
    taskDataArguments?: Record<string, unknown>
  ) => Promise<void>;

  interface BackgroundService {
    start(
      task: BackgroundTaskFunction,
      options: BackgroundTaskOptions
    ): Promise<void>;
    stop(): Promise<void>;
    updateNotification(options: UpdateNotificationOptions): Promise<void>;
    isRunning(): boolean;
    on(event: "expiration", callback: () => void): void;
  }

  const BackgroundService: BackgroundService;
  export default BackgroundService;
}
