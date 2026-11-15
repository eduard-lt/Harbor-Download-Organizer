// Captures the README screenshots from the mocked-backend UI.
//
//   cd packages/ui
//   npx vite --config vite.e2e.config.ts      # terminal 1 (port 5174)
//   node scripts/readme-screenshots.mjs       # terminal 2
//
// Writes stable file names to assets/screenshots/ so they can be refreshed
// after UI changes. The data below is sample data, not real usage.
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../../assets/screenshots');
const BASE = process.env.HARBOR_UI_URL ?? 'http://localhost:5174';
const VIEWPORT = { width: 1100, height: 720 };

const DL = 'C:\\Users\\you\\Downloads';
const rule = (id, name, extensions, icon, icon_color, extra = {}) => ({
  id, name, extensions, icon, icon_color,
  destination: `${DL}\\${extra.folder ?? name}`,
  create_symlink: false, enabled: true,
  has_pattern: !!extra.pattern,
  has_size_constraint: !!(extra.min_size_bytes || extra.max_size_bytes),
  ...extra,
});

const rules = [
  rule('r1', 'Invoices', ['pdf'], 'description', 'red', { pattern: '(?i)invoice|receipt', folder: 'Documents\\Invoices' }),
  rule('r2', 'Large videos', ['mp4', 'mkv', 'mov'], 'movie', 'indigo', { min_size_bytes: 500 * 1024 * 1024, folder: 'Videos\\Large' }),
  rule('r3', 'Images', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'], 'image', 'blue'),
  rule('r4', 'Videos', ['mp4', 'mkv', 'mov', 'webm'], 'movie', 'indigo'),
  rule('r5', 'Music', ['mp3', 'flac', 'wav', 'm4a'], 'music_note', 'pink'),
  rule('r6', 'Documents', ['pdf', 'docx', 'xlsx', 'pptx', 'txt'], 'description', 'blue'),
  rule('r7', 'Archives', ['zip', 'rar', '7z', 'tar', 'gz'], 'folder_zip', 'amber'),
  rule('r8', 'Installers', ['exe', 'msi', 'dmg', 'pkg'], 'install_desktop', 'purple'),
  rule('r9', 'Subtitles', ['srt', 'vtt'], 'subtitles', 'slate', { enabled: false }),
];

const now = Date.now();
const ago = (min) => new Date(now - min * 60_000).toISOString();
const log = (i, min, filename, ruleName, folder, icon, icon_color, status = 'success') => ({
  id: `log-${i}`, timestamp: ago(min), filename, icon, icon_color,
  source_path: `${DL}\\${filename}`,
  dest_path: status === 'error' ? '' : `${DL}\\${folder}\\${filename}`,
  rule_name: ruleName, status,
});
const logs = [
  log(1, 2, 'invoice-2026-11.pdf', 'Invoices', 'Documents\\Invoices', 'description', 'red'),
  log(2, 9, 'beach-trip-0412.heic', 'Images', 'Images', 'image', 'blue'),
  log(3, 9, 'beach-trip-0413.heic', 'Images', 'Images', 'image', 'blue'),
  log(4, 26, 'quarterly-report.xlsx', 'Documents', 'Documents', 'table_chart', 'green'),
  log(5, 48, 'node-v24.11.0-x64.msi', 'Installers', 'Installers', 'install_desktop', 'purple'),
  log(6, 75, 'project-assets.zip', 'Archives', 'Archives', 'folder_zip', 'amber'),
  log(7, 130, 'interview-recording.mov', 'Large videos', 'Videos\\Large', 'movie', 'indigo'),
  log(8, 190, 'podcast-episode-41.mp3', 'Music', 'Music', 'music_note', 'pink'),
  log(9, 240, 'slides-final.pptx', 'Documents', 'Documents', 'slideshow', 'amber', 'error'),
  log(10, 1500, 'receipt-hardware-store.pdf', 'Invoices', 'Documents\\Invoices', 'description', 'red'),
  log(11, 1560, 'screenshot-2026-11-14.png', 'Images', 'Images', 'image', 'blue'),
];

const state = { rules, logs, running: true, tutorialCompleted: true };

function installMocks(stateJson) {
  const s = JSON.parse(stateJson);
  const handlers = {
    get_rules: () => s.rules.slice(),
    toggle_rule: (a) => { s.rules = s.rules.map((r) => (r.id === a.ruleId ? { ...r, enabled: a.enabled } : r)); },
    reorder_rules: () => {},
    get_service_status: () => (s.running
      ? { running: true, lifecycle_state: 'running', uptime_seconds: 18240, pid: 4242 }
      : { running: false, lifecycle_state: 'stopped', uptime_seconds: 0, pid: 0 }),
    start_service: () => { s.running = true; },
    stop_service: () => { s.running = false; },
    get_startup_enabled: () => true,
    get_tutorial_completed: () => s.tutorialCompleted,
    set_tutorial_completed: (a) => { s.tutorialCompleted = a.completed; },
    get_check_updates: () => false,
    get_last_notified_version: () => null,
    get_download_dir: () => 'C:\\Users\\you\\Downloads',
    get_config_path: () => 'C:\\Users\\you\\AppData\\Local\\Harbor\\harbor.downloads.yaml',
    get_activity_logs: (a) => {
      const q = (a.search ?? '').toLowerCase();
      const list = s.logs.filter((l) => (!a.status || l.status === a.status) && (!q || l.filename.toLowerCase().includes(q)));
      return { logs: list, total: list.length, has_more: false };
    },
    get_activity_stats: () => ({ total_files_moved: 1284, files_moved_today: 9, files_moved_this_week: 63, most_active_rule: 'Images' }),
    preview_organization: () => ({
      moves: [
        { source: 'C:\\Users\\you\\Downloads\\holiday-photos.zip', destination: 'C:\\Users\\you\\Downloads\\Archives\\holiday-photos.zip', rule: 'Archives' },
        { source: 'C:\\Users\\you\\Downloads\\invoice-2026-10.pdf', destination: 'C:\\Users\\you\\Downloads\\Documents\\Invoices\\invoice-2026-10.pdf', rule: 'Invoices' },
        { source: 'C:\\Users\\you\\Downloads\\IMG_2041.jpg', destination: 'C:\\Users\\you\\Downloads\\Images\\IMG_2041.jpg', rule: 'Images' },
        { source: 'C:\\Users\\you\\Downloads\\setup-tool.exe', destination: 'C:\\Users\\you\\Downloads\\Installers\\setup-tool.exe', rule: 'Installers' },
      ],
      errors: [],
    }),
    get_last_batch: () => ({ count: 4, recorded_at: new Date(Date.now() - 2 * 60_000).toISOString().slice(0, 19).replace('T', ' ') }),
  };
  window.__e2eMocks = {
    invoke: new Proxy(handlers, {
      get: (t, k) => t[k] ?? (() => null),
    }),
    listenCallbacks: {},
  };
}

async function shot(browser, theme, name, prepare, { tutorial = true } = {}) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: theme });
  const page = await context.newPage();
  await page.addInitScript(installMocks, JSON.stringify({ ...state, tutorialCompleted: tutorial }));
  await page.addInitScript((t) => {
    localStorage.setItem('harbor-theme', t);
    localStorage.setItem('harbor-reduce-transparency', 'false');
  }, theme);
  await page.goto(BASE + '/');
  await page.evaluate(() => document.fonts.ready);
  await prepare(page);
  await page.waitForTimeout(900); // let tide and glass transitions settle
  const file = path.join(out, `${name}-${theme}.png`);
  await page.screenshot({ path: file });
  console.log('wrote', path.relative(process.cwd(), file));
  await context.close();
}

const nav = (label) => async (page) => {
  if (label) await page.getByRole('link', { name: label, exact: true }).click();
};

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  await shot(browser, theme, 'rules', nav(null));
  await shot(browser, theme, 'activity', nav('Activity'));
  await shot(browser, theme, 'settings', nav('Settings'));
  await shot(browser, theme, 'info', nav('Info & Guide'));
  await shot(browser, theme, 'setup', async (page) => {
    await page.getByRole('dialog', { name: 'Welcome to Harbor' }).waitFor();
  }, { tutorial: false });
}
await browser.close();
