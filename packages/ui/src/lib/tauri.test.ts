import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    reorderRules,
    getDownloadDir,
    resetToDefaults,
    getActivityLogs,
    getActivityStats,
    clearActivityLogs,
    getServiceStatus,
    startService,
    stopService,
    triggerOrganizeNow,
    getStartupEnabled,
    setStartupEnabled,
    reloadConfig,
    openConfigFile,
    openDownloadsFolder,
    getConfigPath,
    getTutorialCompleted,
    setTutorialCompleted,
    getCheckUpdates,
    setCheckUpdates,
    getLastNotifiedVersion,
    setLastNotifiedVersion,
} from './tauri';

// Mock invoke from @tauri-apps/api/core
const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('tauri API wrappers', () => {
    beforeEach(() => {
        mockInvoke.mockReset();
    });

    it('getRules calls invoke("get_rules")', async () => {
        const fakeRules = [{ id: '1', name: 'Images' }];
        mockInvoke.mockResolvedValue(fakeRules);
        const result = await getRules();
        expect(mockInvoke).toHaveBeenCalledWith('get_rules');
        expect(result).toEqual(fakeRules);
    });

    it('createRule calls invoke("create_rule") with rule payload', async () => {
        const ruleInput = { name: 'Videos', extensions: ['mp4'], destination: 'C:\\Videos', create_symlink: false, enabled: true };
        const fakeRule = { id: '2', ...ruleInput, icon: '', icon_color: '' };
        mockInvoke.mockResolvedValue(fakeRule);
        const result = await createRule(ruleInput);
        expect(mockInvoke).toHaveBeenCalledWith('create_rule', ruleInput);
        expect(result).toEqual(fakeRule);
    });

    it('updateRule calls invoke("update_rule") with rule payload', async () => {
        const ruleUpdate = { id: '2', name: 'Videos Updated' };
        const fakeRule = { id: '2', name: 'Videos Updated', extensions: [], destination: '', create_symlink: false, enabled: true, icon: '', icon_color: '' };
        mockInvoke.mockResolvedValue(fakeRule);
        const result = await updateRule(ruleUpdate);
        expect(mockInvoke).toHaveBeenCalledWith('update_rule', ruleUpdate);
        expect(result).toEqual(fakeRule);
    });

    it('deleteRule calls invoke("delete_rule") with ruleName', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await deleteRule('Videos');
        expect(mockInvoke).toHaveBeenCalledWith('delete_rule', { ruleName: 'Videos' });
    });

    it('toggleRule calls invoke("toggle_rule") with ruleName and enabled', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await toggleRule('Images', false);
        expect(mockInvoke).toHaveBeenCalledWith('toggle_rule', { ruleName: 'Images', enabled: false });
    });

    it('reorderRules calls invoke("reorder_rules") with ruleNames', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await reorderRules(['rule1', 'rule2']);
        expect(mockInvoke).toHaveBeenCalledWith('reorder_rules', { ruleNames: ['rule1', 'rule2'] });
    });

    it('getDownloadDir calls invoke("get_download_dir")', async () => {
        mockInvoke.mockResolvedValue('C:\\Downloads');
        const result = await getDownloadDir();
        expect(mockInvoke).toHaveBeenCalledWith('get_download_dir');
        expect(result).toBe('C:\\Downloads');
    });

    it('resetToDefaults calls invoke("reset_to_defaults")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await resetToDefaults();
        expect(mockInvoke).toHaveBeenCalledWith('reset_to_defaults');
    });

    it('getActivityLogs calls invoke("get_activity_logs") with limit and offset', async () => {
        const fakeResponse = { logs: [], total: 0, has_more: false };
        mockInvoke.mockResolvedValue(fakeResponse);
        const result = await getActivityLogs(10, 20);
        expect(mockInvoke).toHaveBeenCalledWith('get_activity_logs', { limit: 10, offset: 20 });
        expect(result).toEqual(fakeResponse);
    });

    it('getActivityLogs works without arguments', async () => {
        const fakeResponse = { logs: [], total: 0, has_more: false };
        mockInvoke.mockResolvedValue(fakeResponse);
        await getActivityLogs();
        expect(mockInvoke).toHaveBeenCalledWith('get_activity_logs', { limit: undefined, offset: undefined });
    });

    it('getActivityStats calls invoke("get_activity_stats")', async () => {
        const fakeStats = { total_files_moved: 5, files_moved_today: 1, files_moved_this_week: 3 };
        mockInvoke.mockResolvedValue(fakeStats);
        const result = await getActivityStats();
        expect(mockInvoke).toHaveBeenCalledWith('get_activity_stats');
        expect(result).toEqual(fakeStats);
    });

    it('clearActivityLogs calls invoke("clear_activity_logs")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await clearActivityLogs();
        expect(mockInvoke).toHaveBeenCalledWith('clear_activity_logs');
    });

    it('getServiceStatus calls invoke("get_service_status")', async () => {
        mockInvoke.mockResolvedValue({ running: true, uptime_seconds: 120 });
        const result = await getServiceStatus();
        expect(mockInvoke).toHaveBeenCalledWith('get_service_status');
        expect(result).toEqual({ running: true, uptime_seconds: 120 });
    });

    it('startService calls invoke("start_service")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await startService();
        expect(mockInvoke).toHaveBeenCalledWith('start_service');
    });

    it('stopService calls invoke("stop_service")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await stopService();
        expect(mockInvoke).toHaveBeenCalledWith('stop_service');
    });

    it('triggerOrganizeNow calls invoke("trigger_organize_now")', async () => {
        mockInvoke.mockResolvedValue(5);
        const result = await triggerOrganizeNow();
        expect(mockInvoke).toHaveBeenCalledWith('trigger_organize_now');
        expect(result).toBe(5);
    });

    it('getStartupEnabled calls invoke("get_startup_enabled")', async () => {
        mockInvoke.mockResolvedValue(true);
        const result = await getStartupEnabled();
        expect(mockInvoke).toHaveBeenCalledWith('get_startup_enabled');
        expect(result).toBe(true);
    });

    it('setStartupEnabled calls invoke("set_startup_enabled") with enabled', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await setStartupEnabled(true);
        expect(mockInvoke).toHaveBeenCalledWith('set_startup_enabled', { enabled: true });
    });

    it('reloadConfig calls invoke("reload_config")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await reloadConfig();
        expect(mockInvoke).toHaveBeenCalledWith('reload_config');
    });

    it('openConfigFile calls invoke("open_config_file")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await openConfigFile();
        expect(mockInvoke).toHaveBeenCalledWith('open_config_file');
    });

    it('openDownloadsFolder calls invoke("open_downloads_folder")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await openDownloadsFolder();
        expect(mockInvoke).toHaveBeenCalledWith('open_downloads_folder');
    });

    it('getConfigPath calls invoke("get_config_path")', async () => {
        mockInvoke.mockResolvedValue('C:\\config.toml');
        const result = await getConfigPath();
        expect(result).toBe('C:\\config.toml');
    });

    it('getTutorialCompleted calls invoke("get_tutorial_completed")', async () => {
        mockInvoke.mockResolvedValue(false);
        const result = await getTutorialCompleted();
        expect(result).toBe(false);
    });

    it('setTutorialCompleted calls invoke("set_tutorial_completed")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await setTutorialCompleted(true);
        expect(mockInvoke).toHaveBeenCalledWith('set_tutorial_completed', { completed: true });
    });

    it('getCheckUpdates calls invoke("get_check_updates")', async () => {
        mockInvoke.mockResolvedValue(true);
        const result = await getCheckUpdates();
        expect(result).toBe(true);
    });

    it('setCheckUpdates calls invoke("set_check_updates")', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await setCheckUpdates(false);
        expect(mockInvoke).toHaveBeenCalledWith('set_check_updates', { enabled: false });
    });

    it('getLastNotifiedVersion calls invoke("get_last_notified_version")', async () => {
        mockInvoke.mockResolvedValue('1.2.0');
        const result = await getLastNotifiedVersion();
        expect(result).toBe('1.2.0');
    });

    it('setLastNotifiedVersion calls invoke("set_last_notified_version") with version', async () => {
        mockInvoke.mockResolvedValue(undefined);
        await setLastNotifiedVersion('1.3.0');
        expect(mockInvoke).toHaveBeenCalledWith('set_last_notified_version', { version: '1.3.0' });
    });
});
