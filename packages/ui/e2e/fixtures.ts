/**
 * E2E test helpers — configure mock Tauri data and provide common page actions.
 */
import { test as base, expect, type Page } from '@playwright/test';

// Re-export for convenience
export { expect };

// -- Types matching the real app's data structures --

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

export interface ServiceStatus {
    running: boolean;
    lifecycle_state?: string;
    uptime_seconds?: number;
    pid: number;
    degraded_reason?: string | null;
}

export interface MockConfig {
    rules: Rule[];
    serviceStatus: ServiceStatus;
    startupEnabled: boolean;
    tutorialCompleted: boolean;
    checkUpdates: boolean;
}

const defaultMocks: MockConfig = {
    rules: [
        {
            id: 'rule-1',
            name: 'Images',
            extensions: ['jpg', 'png', 'gif'],
            destination: '/Users/test/Pictures',
            create_symlink: false,
            enabled: true,
            icon: 'photo',
            icon_color: 'indigo',
        },
        {
            id: 'rule-2',
            name: 'Documents',
            extensions: ['pdf', 'docx'],
            destination: '/Users/test/Documents',
            create_symlink: false,
            enabled: true,
            icon: 'description',
            icon_color: 'blue',
        },
    ],
    serviceStatus: {
        running: false,
        lifecycle_state: 'stopped',
        uptime_seconds: 0,
        pid: 0,
    },
    startupEnabled: false,
    tutorialCompleted: true,
    checkUpdates: true,
};

/**
 * Set mocks on the page before navigation. Must be called before page.goto().
 *
 * Uses `addInitScript` with a self-contained JSON-serializable state. All mock
 * handler logic runs inside the browser context, so mutable state works correctly.
 */
export async function setupMocks(page: Page, overrides?: Partial<MockConfig>): Promise<void> {
    const mocks = { ...defaultMocks, ...overrides };
    const stateJson = JSON.stringify({
        rules: mocks.rules.map(r => ({ ...r })),
        serviceStatus: { ...mocks.serviceStatus },
        startupEnabled: mocks.startupEnabled,
        tutorialCompleted: mocks.tutorialCompleted,
        checkUpdates: mocks.checkUpdates,
    });

    // Self-contained script — all handler logic runs in the browser via eval'd string.
    // Using toString() on the factory function avoids closure serialization issues.
    const initFn = new Function('__stateJson', `
        var state = JSON.parse(__stateJson);
        window.__e2eMocks = {
            state: state,
            invoke: {
                get_rules: function () { return state.rules.slice(); },
                create_rule: function (args) {
                    var rule = args.rule;
                    var newRule = {
                        id: "rule-" + Date.now(),
                        name: rule.name,
                        extensions: rule.extensions || [],
                        pattern: rule.pattern || null,
                        min_size_bytes: rule.min_size_bytes || null,
                        max_size_bytes: rule.max_size_bytes || null,
                        destination: rule.destination,
                        create_symlink: rule.create_symlink || false,
                        enabled: true,
                        icon: "folder",
                        icon_color: "slate",
                        has_pattern: !!rule.pattern,
                        has_size_constraint: !!(rule.min_size_bytes || rule.max_size_bytes),
                    };
                    state.rules.push(newRule);
                    return newRule;
                },
                update_rule: function (args) {
                    var rule = args.rule;
                    var found = null;
                    state.rules = state.rules.map(function (r) {
                        if (r.id === rule.id) {
                            found = Object.assign({}, r, rule);
                            return found;
                        }
                        return r;
                    });
                    return found || state.rules.find(function (r) { return r.id === rule.id; });
                },
                delete_rule: function (args) {
                    state.rules = state.rules.filter(function (r) { return r.id !== args.ruleId; });
                },
                toggle_rule: function (args) {
                    state.rules = state.rules.map(function (r) {
                        if (r.id === args.ruleId) return Object.assign({}, r, { enabled: args.enabled });
                        return r;
                    });
                },
                reorder_rules: function (args) {
                    var ids = args.ruleIds;
                    var map = {};
                    state.rules.forEach(function (r) { map[r.id] = r; });
                    var reordered = ids.map(function (id) { return map[id]; }).filter(Boolean);
                    reordered.forEach(function (r) {
                        if (ids.indexOf(r.id) === -1) reordered.push(r);
                    });
                    state.rules = reordered;
                },
                get_service_status: function () { return Object.assign({}, state.serviceStatus); },
                start_service: function () {
                    state.serviceStatus = Object.assign({}, state.serviceStatus, { running: true, lifecycle_state: "running", pid: 1234 });
                },
                stop_service: function () {
                    state.serviceStatus = Object.assign({}, state.serviceStatus, { running: false, lifecycle_state: "stopped", pid: 0 });
                },
                get_startup_enabled: function () { return state.startupEnabled; },
                set_startup_enabled: function (args) { state.startupEnabled = args.enabled; },
                get_tutorial_completed: function () { return state.tutorialCompleted; },
                set_tutorial_completed: function (args) { state.tutorialCompleted = args.completed; },
                get_check_updates: function () { return state.checkUpdates; },
                set_check_updates: function (args) { state.checkUpdates = args.enabled; },
                get_last_notified_version: function () { return null; },
                set_last_notified_version: function () {},
                notify_update_available: function () {},
                dismiss_update_available: function () {},
                get_download_dir: function () { return "/Users/test/Downloads"; },
                get_activity_logs: function () { return { logs: [{
                    id: "log-1", timestamp: new Date().toISOString(), filename: "photo.jpg",
                    icon: "photo", icon_color: "indigo",
                    source_path: "/Users/test/Downloads/photo.jpg",
                    dest_path: "/Users/test/Pictures/photo.jpg",
                    rule_name: "Images", status: "moved",
                }], total: 1, has_more: false }; },
                get_activity_stats: function () { return { total_files_moved: 1, files_moved_today: 1, files_moved_this_week: 1, most_active_rule: "Images" }; },
                clear_activity_logs: function () {},
                trigger_organize_now: function () { return { status: "success", message: "0 files moved.", moved_count: 0, moved: 0, total_failures: 0, errors: [], failure_groups: [] }; },
                retry_service_restart: function () {},
                reload_config: function () {},
                open_config_file: function () {},
                open_downloads_folder: function () {},
                get_config_path: function () { return "/Users/test/.harbor/config.yaml"; },
                reset_to_defaults: function () {},
            },
            listenCallbacks: {},
        };
    `);

    await page.addInitScript(initFn, stateJson);
}

// -- Common page actions --

export async function navigateTo(page: Page, label: string): Promise<void> {
    await page.getByRole('link', { name: label }).click();
}

export async function expectHeading(page: Page, heading: string): Promise<void> {
    await page.getByRole('heading', { name: heading }).waitFor({ state: 'visible' });
}

// Re-export test with our helpers
export { base as test };
