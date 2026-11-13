import { useRef, useState, type KeyboardEvent } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { ArrowDownToLine, Code2, Coffee, Download, FileQuestion, FileSearch, FolderInput, ListFilter } from 'lucide-react';
import { useRules } from '../hooks/useRules';
import { matchFile } from '../lib/matchRule';
import { fileIcon } from '../lib/icons';
import { shortPath } from '../lib/format';
import { Header } from '../components/Header';
import { useUpdateContext } from '../context/UpdateContext';
import packageJson from '../../package.json';

const REPO_URL = 'https://github.com/eduard-lt/Harbor-Download-Organizer';
const SUPPORT_URL = 'https://ko-fi.com/eduardolteanu';
const tabs = [{ id: 'guide', label: 'User Guide' }, { id: 'about', label: 'About' }] as const;
type Tab = typeof tabs[number]['id'];

const samples = [
  { name: 'holiday-photo.jpg', mb: 4 },
  { name: 'invoice-march.pdf', mb: 1 },
  { name: 'setup-2.4.exe', mb: 90 },
  { name: 'lecture-recording.mp4', mb: 850 },
  { name: 'dataset.zip.crdownload', mb: 300 },
];

function RuleTester() {
  const { rules, loading } = useRules();
  const [name, setName] = useState(samples[0].name);
  const [mb, setMb] = useState(String(samples[0].mb));
  const size = Math.max(0, Number(mb) || 0) * 1024 * 1024;
  const result = name.trim() ? matchFile(rules, name, size) : null;
  const Icon = result?.kind === 'match' ? fileIcon(result.rule.icon) : FileQuestion;

  return (
    <section className="tester" aria-labelledby="tester-title">
      <div className="tester-head">
        <FileSearch size={16} aria-hidden="true" />
        <h2 id="tester-title">Try a file name</h2>
        <span className="cell-muted">Uses your current rules. Nothing moves.</span>
      </div>
      <div className="tester-inputs">
        <label className="field" style={{ flex: 1 }}>
          <span className="field-label">File name</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} spellCheck={false} />
        </label>
        <label className="field" style={{ width: 120 }}>
          <span className="field-label">Size (MB)</span>
          <input className="input num" type="number" min={0} value={mb} onChange={e => setMb(e.target.value)} />
        </label>
      </div>
      <div className="tester-samples" role="group" aria-label="Example files">
        {samples.map(s => (
          <button key={s.name} type="button" className="chip" aria-pressed={name === s.name}
            onClick={() => { setName(s.name); setMb(String(s.mb)); }}>{s.name}</button>
        ))}
      </div>
      <div className="tester-result" role="status" data-kind={result?.kind ?? 'empty'}>
        <Icon size={20} aria-hidden="true" />
        {loading && <p>Loading your rules…</p>}
        {!loading && !result && <p>Type a file name to see where it would go.</p>}
        {!loading && result?.kind === 'partial' && (
          <p><strong>Still downloading.</strong> Harbor waits until the download finishes, then sorts the finished file.</p>
        )}
        {!loading && result?.kind === 'none' && (
          <p><strong>Stays in your watched folder.</strong> No rule that is turned on matches this file.</p>
        )}
        {!loading && result?.kind === 'match' && (
          <p>
            <strong>Moves to <code>{shortPath(result.rule.destination, 2)}</code></strong>
            <span>The <em>{result.rule.name}</em> rule catches it because {result.reason}.</span>
          </p>
        )}
      </div>
    </section>
  );
}

function Guide() {
  return (
    <div className="guide">
      <div className="prose">
        <p className="guide-intro">Harbor does one job: it keeps your Downloads folder from piling up. You decide where each kind of file belongs, and Harbor moves new files there the moment they finish downloading.</p>

        <RuleTester />

        <section>
          <h2>What happens to a new file</h2>
          <ol className="flow" aria-label="What happens to a new file">
            <li className="flow-step">
              <div className="marker"><Download size={16} aria-hidden="true" /></div>
              <h3>It arrives</h3>
              <p>You save a file as usual. Harbor waits until the download has finished.</p>
            </li>
            <li className="flow-step">
              <div className="marker"><ListFilter size={16} aria-hidden="true" /></div>
              <h3>A rule claims it</h3>
              <p>Harbor checks your rules and picks the first one that fits.</p>
            </li>
            <li className="flow-step">
              <div className="marker"><FolderInput size={16} aria-hidden="true" /></div>
              <h3>It’s put away</h3>
              <p>The file moves to that rule’s folder. A file with the same name is never replaced; Harbor keeps both.</p>
            </li>
          </ol>
        </section>

        <section>
          <h2>When two rules could match</h2>
          <p>Specific rules win. A rule with a filename pattern or a size limit is checked before a plain extension rule, so an “Invoices” rule for <code>invoice.*\.pdf</code> catches invoices before a general “Documents” rule sees them. After that, the higher rule on the Rules page wins. Drag a rule by its handle, or use the arrows by its number, to change the order.</p>
        </section>

        <section>
          <h2>You’re always in control</h2>
          <p><strong>Preview moves</strong> shows what would happen without touching anything. <strong>Undo last batch</strong> puts the last set of files back, as long as they haven’t changed. Changing the watched folder, importing rules, or undoing a batch pauses monitoring, so you can check things before Harbor carries on.</p>
        </section>
      </div>
      <aside className="guide-side" aria-label="Rule fields">
        <section>
          <h2>What a rule can match</h2>
          <dl className="terms">
            <dt>Extensions</dt><dd>File types, such as <code>jpg, png</code>. Leave empty to match every type.</dd>
            <dt>Filename pattern</dt><dd>A regular expression for the file name, such as <code>^invoice</code>. Good for precise rules.</dd>
            <dt>Size</dt><dd>A minimum or maximum size in MB, for example to send videos over 500 MB elsewhere.</dd>
            <dt>Destination</dt><dd>Any folder on your computer. Harbor creates it if it doesn’t exist yet.</dd>
            <dt>Shortcut</dt><dd>On Windows, Harbor can leave a hidden symlink where the file was.</dd>
          </dl>
        </section>
      </aside>
    </div>
  );
}

function About() {
  const { updateState } = useUpdateContext();
  const { available, version, url } = updateState;
  return (
    <div className="about">
      <img src="/harbor.svg" alt="" />
      <h2>Harbor</h2>
      <p className="cell-muted">Version {packageJson.version}</p>
      <p style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
        A free, open-source download organizer for Windows and macOS. No account, no tracking of your files, MIT licensed.
      </p>
      {available && url && (
        <div className="notice" style={{ alignSelf: 'stretch', alignItems: 'center' }}>
          <ArrowDownToLine size={16} aria-hidden="true" />
          <span className="grow">Version {version} is ready to download.</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void open(url)}>Download</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="button" className="btn" onClick={() => void open(REPO_URL)}><Code2 size={14} aria-hidden="true" />Source on GitHub</button>
        <button type="button" className="btn" onClick={() => void open(SUPPORT_URL)}><Coffee size={14} aria-hidden="true" />Buy me a coffee</button>
      </div>
    </div>
  );
}

export function InfoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('guide');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = activeTab === 'guide' ? 'about' : 'guide';
    setActiveTab(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="page">
      <Header title="Info & Guide">
        <div className="seg" role="tablist" aria-label="Info sections" onKeyDown={onKeyDown}>
          {tabs.map(tab => (
            <button key={tab.id} ref={el => { refs.current[tab.id] = el; }} type="button" role="tab" id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </Header>
      <div className="page-body" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
        {activeTab === 'guide' ? <Guide /> : <About />}
      </div>
    </div>
  );
}
