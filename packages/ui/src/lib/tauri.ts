import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// --- Types ---

export interface Rule {
    id: string;
    name: string;
    extensions: string[];
    pattern?: string;
    min_size_bytes?: number;
    max_size_bytes?: number;
    destination: string;
    create_symlink: boolean;
    enabled: boolean;
    icon: string;
    icon_color: string;
}

export interface ActivityLog {
    id: string;
    timestamp: string;
    filename: string;
    icon: string;
    icon_color: string;
    source_path: string;
    dest_path: string;
    rule_name: string;
    status: string;
    symlink_info?: string;
}

export interface ActivityStats {
    total_files_moved: number;
    files_moved_today: number;
    files_moved_this_week: number;
    most_active_rule?: string;
}

export interface ActivityLogsResponse {
    logs: ActivityLog[];
    total: number;
    has_more: boolean;
}

export interface ServiceStatus {
    running: boolean;
    lifecycle_state?: 'stopped' | 'running' | 'restarting' | 'degraded' | string;
    uptime_seconds?: number;
    stop_join_pending?: boolean;
    degraded?: boolean;
    degraded_reason?: string | null;
}

export interface ServiceStatusEvent {
    status: ServiceStatus;
}

export interface StartupStatusEvent {
    enabled: boolean;
    phase: 'intent' | 'reconciled' | string;
}

export interface AppErrorDetails {
    field?: string;
    operation?: string;
    resource?: string;
    source_path?: string;
    destination_path?: string;
    reason?: string;
    remediation_hint?: string;
}

export interface AppErrorDto {
    code: string;
    message: string;
    details: AppErrorDetails;
    legacy_error: string;
}

export interface OrganizeFailureGroup {
    code: string;
    message: string;
    count: number;
    failures: AppErrorDto[];
    legacy_errors: string[];
}

export interface OrganizeNowResponse {
    status: 'success' | 'partial_failure' | 'failed' | string;
    message: string;
    moved_count: number;
    // legacy compatibility field from backend
    moved: number;
    total_failures: number;
    // legacy compatibility field from backend
    errors: string[];
    failure_groups: OrganizeFailureGroup[];
}

export interface UpdateRuleRequest {
    id: string;
    name?: string;
    extensions?: string[] | null;
    destination?: string;
    pattern?: string | null;
    min_size_bytes?: number | null;
    max_size_bytes?: number | null;
    create_symlink?: boolean;
    enabled?: boolean;
}

export interface RuleValidationErrorPayload {
    code: 'validation_error';
    message: string;
    fields?: string[];
}

export class RuleValidationError extends Error {
    code: 'validation_error';
    fields: string[];

    constructor(message: string, fields: string[] = []) {
        super(message);
        this.name = 'RuleValidationError';
        this.code = 'validation_error';
        this.fields = fields;
    }
}

// --- API Functions ---

// Rules
export const getRules = async (): Promise<Rule[]> => {
    return await invoke('get_rules');
};

export const createRule = async (rule: Omit<Rule, 'id' | 'icon' | 'icon_color'>): Promise<Rule> => {
    return await invoke('create_rule', { rule });
};

function tryParseValidationError(error: unknown): RuleValidationError | null {
    const message = error instanceof Error ? error.message : String(error);
    try {
        const parsed = JSON.parse(message) as RuleValidationErrorPayload;
        if (parsed.code === 'validation_error') {
            return new RuleValidationError(parsed.message, parsed.fields ?? []);
        }
    } catch {
        // non-json error payload
    }
    return null;
}

export const updateRule = async (rule: UpdateRuleRequest): Promise<Rule> => {
    try {
        return await invoke('update_rule', { rule });
    } catch (error) {
        const validationError = tryParseValidationError(error);
        if (validationError) {
            throw validationError;
        }
        throw error;
    }
};

export const deleteRule = async (ruleId: string): Promise<void> => {
    return await invoke('delete_rule', { ruleId });
};

export const toggleRule = async (ruleId: string, enabled: boolean): Promise<void> => {
    return await invoke('toggle_rule', { ruleId, enabled });
};

export const reorderRules = async (ruleIds: string[]): Promise<void> => {
    return await invoke('reorder_rules', { ruleIds });
};

export const getDownloadDir = async (): Promise<string> => {
    return await invoke('get_download_dir');
};

export async function resetToDefaults(): Promise<void> {
    return invoke('reset_to_defaults');
}

// Activity
export const getActivityLogs = async (limit?: number, offset?: number): Promise<ActivityLogsResponse> => {
    return await invoke('get_activity_logs', { limit, offset });
};

export const getActivityStats = async (): Promise<ActivityStats> => {
    return await invoke('get_activity_stats');
};

export const clearActivityLogs = async (): Promise<void> => {
    return await invoke('clear_activity_logs');
};

// Settings
export const getServiceStatus = async (): Promise<ServiceStatus> => {
    return await invoke('get_service_status');
};

export const startService = async (): Promise<void> => {
    return await invoke('start_service');
};

export const stopService = async (): Promise<void> => {
    return await invoke('stop_service');
};

export const triggerOrganizeNow = async (): Promise<OrganizeNowResponse> => {
    return await invoke('trigger_organize_now');
};

export const retryServiceRestart = async (): Promise<void> => {
    return await invoke('retry_service_restart');
};

export const getStartupEnabled = async (): Promise<boolean> => {
    return await invoke('get_startup_enabled');
};

export const setStartupEnabled = async (enabled: boolean): Promise<void> => {
    return await invoke('set_startup_enabled', { enabled });
};

export const subscribeServiceStatus = async (
    onStatus: (status: ServiceStatus) => void
): Promise<UnlistenFn> => {
    return await listen<ServiceStatusEvent>('harbor://service-status', (event) => {
        onStatus(event.payload.status);
    });
};

export const subscribeStartupStatus = async (
    onStatus: (event: StartupStatusEvent) => void
): Promise<UnlistenFn> => {
    return await listen<StartupStatusEvent>('harbor://startup-status', (event) => {
        onStatus(event.payload);
    });
};

export const reloadConfig = async (): Promise<void> => {
    return await invoke('reload_config');
};

export const openConfigFile = async (): Promise<void> => {
    return await invoke('open_config_file');
};

export const openDownloadsFolder = async (): Promise<void> => {
    return await invoke('open_downloads_folder');
};

export const getConfigPath = async (): Promise<string> => {
    return await invoke('get_config_path');
};

export const getTutorialCompleted = async (): Promise<boolean> => {
    return await invoke('get_tutorial_completed');
};

export const setTutorialCompleted = async (completed: boolean): Promise<void> => {
    return await invoke('set_tutorial_completed', { completed });
};

export const getCheckUpdates = async (): Promise<boolean> => {
    return await invoke('get_check_updates');
};

export const setCheckUpdates = async (enabled: boolean): Promise<void> => {
    return await invoke('set_check_updates', { enabled });
};

export const getLastNotifiedVersion = async (): Promise<string | null> => {
    return await invoke('get_last_notified_version');
};

export const setLastNotifiedVersion = async (version: string): Promise<void> => {
    return await invoke('set_last_notified_version', { version });
};
