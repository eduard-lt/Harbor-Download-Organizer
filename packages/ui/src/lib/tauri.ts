import { invoke } from '@tauri-apps/api/core';

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
    uptime_seconds?: number;
}

// --- API Functions ---

// Rules
export const getRules = async (): Promise<Rule[]> => {
    return await invoke('get_rules');
};

export const createRule = async (rule: Omit<Rule, 'id' | 'icon' | 'icon_color'>): Promise<Rule> => {
    return await invoke('create_rule', { ...rule });
};

export const updateRule = async (rule: Partial<Rule> & { id: string }): Promise<Rule> => {
    return await invoke('update_rule', { ...rule });
};

export const deleteRule = async (ruleName: string): Promise<void> => {
    return await invoke('delete_rule', { ruleName });
};

export const toggleRule = async (ruleName: string, enabled: boolean): Promise<void> => {
    return await invoke('toggle_rule', { ruleName, enabled });
};

export const reorderRules = async (ruleNames: string[]): Promise<void> => {
    return await invoke('reorder_rules', { ruleNames });
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

export const triggerOrganizeNow = async (): Promise<number> => {
    return await invoke('trigger_organize_now');
};

export const getStartupEnabled = async (): Promise<boolean> => {
    return await invoke('get_startup_enabled');
};

export const setStartupEnabled = async (enabled: boolean): Promise<void> => {
    return await invoke('set_startup_enabled', { enabled });
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
