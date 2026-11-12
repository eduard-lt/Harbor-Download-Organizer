import { useRef, useState, type KeyboardEvent } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { ArrowDownToLine, Code2, Coffee, Download, FolderInput, ListFilter } from 'lucide-react';
import { Header } from '../components/Header';
import { useUpdateContext } from '../context/UpdateContext';
import packageJson from '../../package.json';

const REPO_URL = 'https://github.com/eduard-lt/Harbor-Download-Organizer';
const SUPPORT_URL = 'https://ko-fi.com/eduardolteanu';
const tabs = [{ id: 'guide', label: 'User Guide' }, { id: 'about', label: 'About' }] as const;
type Tab = typeof tabs[number]['id'];

function Guide() {
  return (
    <div className="guide">
    <div className="prose">
      <section>
        <h2>How Harbor works</h2>
        <p>Harbor watches one folder, normally <strong>Downloads</strong>. When a new file finishes downloading, Harbor checks your rules and moves the file to the folder the first matching rule names.</p>
        <ol className="flow" aria-label="What happens to a new file">
          <li className="flow-step">
            <div className="marker"><Download size={16} aria-hidden="true" /></div>
            <h3>A file arrives</h3>
            <p>You save a file to the watched folder as usual. Partial downloads are skipped until they finish.</p>
          </li>
          <li className="flow-step">
            <div className="marker"><ListFilter size={16} aria-hidden="true" /></div>
            <h3>A rule matches</h3>
            <p>Harbor compares the file with your rules and picks the first one that fits.</p>
          </li>
          <li className="flow-step">
            <div className="marker"><FolderInput size={16} aria-hidden="true" /></div>
            <h3>The file moves</h3>
            <p>It goes to the rule’s destination. An existing file there is never overwritten.</p>
          </li>
        </ol>
      </section>

      <section>
        <h2>Which rule wins</h2>
        <p>Rules with a filename pattern or a size limit are checked first, because they are more specific. Among the rest, the order on the Rules page decides: the higher rule wins. Drag a rule by its handle, or use the arrows beside its number, to change the order.</p>
      </section>

      <section>
        <h2>Staying in control</h2>
        <p><strong>Preview moves</strong> shows what would happen without moving anything. <strong>Undo last batch</strong> puts the last set of moved files back, as long as they haven’t changed. Changing the watched folder, importing rules, or undoing a batch pauses monitoring until you turn it back on.</p>
      </section>
    </div>
    <aside className="guide-side" aria-label="Rule fields">
      <section>
        <h2>What a rule can match</h2>
        <dl className="terms">
          <dt>Extensions</dt><dd>File types, such as <code>jpg, png</code>. Leave empty to match every type.</dd>
          <dt>Filename pattern</dt><dd>A regular expression for the file name, such as <code>^invoice</code>. For precise rules.</dd>
          <dt>Size</dt><dd>A minimum or maximum size in bytes, for example to send large videos elsewhere.</dd>
          <dt>Destination</dt><dd>Any folder on your computer. Harbor creates it if it doesn’t exist.</dd>
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
