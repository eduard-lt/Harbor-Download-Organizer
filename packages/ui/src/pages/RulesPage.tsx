import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, GripVertical, ChevronUp, ChevronDown, Pencil, Trash2, Folder, CircleAlert, ListFilter, Undo2,
} from 'lucide-react';
import { Header } from '../components/Header';
import { useRules } from '../hooks/useRules';
import { RuleModal, type RuleFormData } from '../components/RuleModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TutorialModal } from '../components/TutorialModal';
import { Switch } from '../components/Switch';
import type { Rule, UpdateRuleRequest } from '../lib/tauri';
import { getTutorialCompleted, setTutorialCompleted } from '../lib/tauri';
import { batchLabel, shortPath } from '../lib/format';
import { fileIcon } from '../lib/icons';
import { useSettings } from '../hooks/useSettings';
import { useFileActions } from '../context/FileActionsContext';

function matchSummary(rule: Rule) {
  const exts = rule.extensions.join(', ');
  if (rule.pattern) {
    return <>{exts && <span>{exts} · </span>}<code>{rule.pattern}</code></>;
  }
  return exts || 'Any file type';
}

function WatchedFolderStrip() {
  const { downloadDir } = useSettings();
  const { busy, organizing, chooseFolder, previewMoves, organizeNow } = useFileActions();
  return (
    <div className="strip" role="region" aria-label="Watched folder">
      <Folder size={16} aria-hidden="true" />
      <span className="strip-label">Watching</span>
      <code className="strip-path allow-select" title={downloadDir}>{downloadDir || 'No folder set'}</code>
      <button type="button" className="link-btn" disabled={busy} onClick={chooseFolder}>Change</button>
      <span className="grow" />
      <div className="strip-actions">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={previewMoves}>Preview moves</button>
        <button type="button" className="btn btn-sm" disabled={busy || organizing} onClick={organizeNow}>
          {organizing ? 'Organizing…' : 'Organize now'}
        </button>
      </div>
    </div>
  );
}

export function RulesPage() {
  const { rules, loading, error, fetchRules, addRule, editRule, removeRule, toggleRule, reorderRules } = useRules();
  const { busy, requestUndo, lastBatch } = useFileActions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const dragStateRef = useRef<{ startIndex: number; targetIndex: number | null; pointerId: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const checkTutorial = async () => {
      try {
        const completed = await getTutorialCompleted();
        if (cancelled) return;
        if (!completed) timer = setTimeout(() => setShowTutorial(true), 600);
      } catch (e) {
        // If the backend isn't ready yet, show the tutorial rather than silently skipping it.
        console.error('Failed to check tutorial status, showing tutorial:', e);
        if (!cancelled) timer = setTimeout(() => setShowTutorial(true), 800);
      }
    };
    checkTutorial();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  const handleCreate = async (ruleData: RuleFormData) => {
    await addRule({
      ...ruleData,
      pattern: ruleData.pattern ?? undefined,
      min_size_bytes: ruleData.min_size_bytes ?? undefined,
      max_size_bytes: ruleData.max_size_bytes ?? undefined,
    });
  };

  const handleUpdate = async (ruleData: RuleFormData) => {
    if (!editingRule) return;
    const payload: UpdateRuleRequest = { ...ruleData, id: editingRule.id };
    await editRule(payload);
  };

  const openCreateModal = () => { setEditingRule(null); setIsModalOpen(true); };
  const openEditModal = (rule: Rule) => { setEditingRule(rule); setIsModalOpen(true); };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await removeRule(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleCloseTutorial = async () => {
    setShowTutorial(false);
    // The guided setup can switch rules on or off; show what it left.
    void fetchRules();
    try { await setTutorialCompleted(true); }
    catch (e) { console.error('Failed to set tutorial status:', e); }
  };

  // Pointer-based drag, more reliable than HTML5 DnD on table rows.
  const handleDragPointerDown = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStateRef.current = { startIndex: index, targetIndex: null, pointerId: e.pointerId };
    setDraggingIndex(index);

    const handlePointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const tr = el?.closest('tr');
      if (!tr || !tr.closest('tbody')) return;
      const rowIndex = rulesRef.current.findIndex(rule => rule.id === tr.dataset.ruleId);
      if (rowIndex >= 0 && dragStateRef.current) {
        dragStateRef.current.targetIndex = rowIndex;
        setHoveredIndex(rowIndex);
      }
    };

    const handlePointerUp = async () => {
      const state = dragStateRef.current;
      if (!state) return;
      const { startIndex, targetIndex } = state;
      if (targetIndex !== null && startIndex !== targetIndex) {
        const reordered = [...rulesRef.current];
        const [moved] = reordered.splice(startIndex, 1);
        reordered.splice(targetIndex, 0, moved);
        try { await reorderRules(reordered.map(r => r.id)); }
        catch (err) { console.error('Failed to reorder rules:', err); }
      }
      setDraggingIndex(null);
      setHoveredIndex(null);
      dragStateRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
  };

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= rules.length) return;
    const reordered = [...rules];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try { await reorderRules(reordered.map(r => r.id)); }
    catch (err) { console.error('Failed to reorder rules:', err); }
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(query) || r.extensions.some(e => e.toLowerCase().includes(query)));
  const enabledCount = rules.filter(r => r.enabled).length;
  const countText = loading ? '' : rules.length === 0 ? 'No rules'
    : `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}, ${enabledCount} enabled`;

  return (
    <div className="page">
      <Header title="Rules" subtitle={countText}>
        <label className="search">
          <Search size={14} aria-hidden="true" />
          <input type="search" aria-label="Search rules" placeholder="Search rules" value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={14} strokeWidth={2.4} aria-hidden="true" />New rule
        </button>
      </Header>

      <WatchedFolderStrip />

      <div className="page-body" style={{ paddingTop: 10 }}>
        {error && (
          <div role="alert" className="notice" data-tone="danger" style={{ marginBottom: 10 }}>
            <CircleAlert size={16} aria-hidden="true" /><span className="grow">Couldn’t load or save rules: {error}</span>
          </div>
        )}

        {(loading || rules.length > 0) && (
        <table className="table rules-table" aria-label="Rules" aria-busy={loading}>
          <colgroup>
            <col className="c-order" /><col className="c-name" /><col /><col className="c-dest" /><col className="c-end" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Order</span><span aria-hidden="true" style={{ paddingLeft: 20 }}>#</span></th>
              <th scope="col">Name</th>
              <th scope="col">Matches</th>
              <th scope="col">Moves to</th>
              <th scope="col" style={{ textAlign: 'right', paddingRight: 72 }}>On</th>
            </tr>
          </thead>
          <tbody>
            {loading && [0, 1, 2, 3].map(i => (
              <tr key={i} className="skeleton-row" aria-hidden="true">
                <td /><td><span className="skeleton" style={{ width: '60%' }} /></td>
                <td><span className="skeleton" style={{ width: '75%' }} /></td>
                <td><span className="skeleton" style={{ width: '55%' }} /></td><td />
              </tr>
            ))}
            {!loading && filteredRules.map((rule) => {
              const index = rules.findIndex(r => r.id === rule.id);
              const Icon = fileIcon(rule.icon);
              return (
                <tr key={rule.id} data-rule-id={rule.id}
                  data-off={rule.enabled ? undefined : ''}
                  data-dragging={draggingIndex === index ? '' : undefined}
                  data-drop-target={hoveredIndex === index && draggingIndex !== index ? '' : undefined}>
                  <td>
                    <div className="order-cell">
                      <span className="grip" title="Drag to reorder" aria-hidden="true"
                        onPointerDown={(e) => handleDragPointerDown(e, index)}>
                        <GripVertical size={14} />
                      </span>
                      <span className="idx">{index + 1}</span>
                      <span className="movers">
                        <button type="button" aria-label={`Move ${rule.name} up`} title="Move up"
                          disabled={index === 0 || !!query} onClick={() => void move(index, -1)}>
                          <ChevronUp size={13} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`Move ${rule.name} down`} title="Move down"
                          disabled={index === rules.length - 1 || !!query} onClick={() => void move(index, 1)}>
                          <ChevronDown size={13} aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="name-cell">
                      <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                      <span className="name" title={rule.name}>{rule.name}</span>
                      {rule.has_pattern && <span className="badge" data-tone="accent">Pattern</span>}
                      {rule.has_size_constraint && <span className="badge">Size</span>}
                      {!rule.enabled && <span className="badge">Off</span>}
                    </div>
                  </td>
                  <td className="cell-trunc cell-muted" title={[rule.extensions.join(', '), rule.pattern].filter(Boolean).join(' · ')}>
                    {matchSummary(rule)}
                  </td>
                  <td className="cell-trunc allow-select" title={rule.destination}>
                    <code>{shortPath(rule.destination, 2)}</code>
                  </td>
                  <td className="c-end-cell">
                    <div className="end-cell">
                      <Switch label={`Enable ${rule.name}`} checked={rule.enabled} onChange={(on) => void toggleRule(rule.id, on)} />
                      <button type="button" className="icon-btn" aria-label={`Edit ${rule.name}`} title="Edit" onClick={() => openEditModal(rule)}>
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-btn" data-tone="danger" aria-label={`Delete ${rule.name}`} title="Delete"
                        onClick={() => setDeleteTarget(rule)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
        {loading && <p className="sr-only" role="status">Loading rules…</p>}

        {!loading && rules.length === 0 && (
          <div className="empty">
            <ListFilter size={22} aria-hidden="true" />
            <h2>No rules yet</h2>
            <p>Rules decide where new files go. Start with one for a file type you download often.</p>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={14} strokeWidth={2.4} aria-hidden="true" />New rule
            </button>
          </div>
        )}
        {!loading && rules.length > 0 && filteredRules.length === 0 && (
          <div className="empty">
            <Search size={22} aria-hidden="true" />
            <h2>No rules match “{searchTerm.trim()}”</h2>
            <p>Search looks at rule names and extensions.</p>
            <button type="button" className="btn" onClick={() => setSearchTerm('')}>Clear search</button>
          </div>
        )}
      </div>

      <footer className="page-foot">
        <span className="grow">First matching rule wins. Pattern and size rules are checked first.</span>
        {lastBatch !== undefined && (
          <span className="num" role="status">
            {lastBatch ? `Last batch: ${batchLabel(lastBatch.count, lastBatch.recorded_at)}` : 'Nothing to undo'}
          </span>
        )}
        <button type="button" className="btn btn-sm" disabled={busy || lastBatch === null} onClick={requestUndo}>
          <Undo2 size={13} aria-hidden="true" />Undo last batch
        </button>
      </footer>

      <RuleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onSave={editingRule ? handleUpdate : handleCreate} initialData={editingRule} />
      <TutorialModal isOpen={showTutorial} onClose={handleCloseTutorial} />
      <ConfirmationModal isOpen={!!deleteTarget} title={`Delete “${deleteTarget?.name ?? ''}”?`}
        message="The rule is removed. Files it already moved stay where they are."
        confirmLabel="Delete rule" isDestructive onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
