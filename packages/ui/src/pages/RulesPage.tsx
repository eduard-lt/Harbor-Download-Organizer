import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { useRules } from '../hooks/useRules';
import { RuleModal } from '../components/RuleModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TutorialModal } from '../components/TutorialModal';
import type { Rule } from '../lib/tauri';
import { formatPath } from '../lib/format';

const iconColorClassesLight: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
};

import { getTutorialCompleted, setTutorialCompleted } from '../lib/tauri';

export function RulesPage() {
  const { rules, loading, error, addRule, editRule, removeRule, toggleRule } = useRules();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const checkTutorial = async () => {
      try {
        const completed = await getTutorialCompleted();
        if (!completed) {
          // Small delay to ensure smooth entry animation
          const timer = setTimeout(() => setShowTutorial(true), 500);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error("Failed to check tutorial status:", e);
      }
    };
    checkTutorial();
  }, []);

  const handleCreate = async (ruleData: Omit<Rule, 'id' | 'icon' | 'icon_color'>) => {
    await addRule(ruleData);
  };

  const handleUpdate = async (ruleData: Omit<Rule, 'id' | 'icon' | 'icon_color'>) => {
    if (!editingRule) return;
    await editRule({ ...ruleData, id: editingRule.id });
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: Rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (ruleId: string) => {
    setDeleteTarget(ruleId);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await removeRule(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleCloseTutorial = async () => {
    setShowTutorial(false);
    try {
      await setTutorialCompleted(true);
    } catch (e) {
      console.error("Failed to set tutorial status:", e);
    }
  };

  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.extensions.some(e => e.includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <Header
        title="Rules Management"
        subtitle="Define how Harbor handles your incoming files automatically."
      >
        <div className="relative group">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
            search
          </span>
          <input
            className="bg-slate-100 dark:bg-background-card border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 w-64 focus:ring-primary focus:border-primary transition-all outline-none"
            placeholder="Search rules..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/10 cursor-pointer"
        >
          <span className="material-icons-round text-lg">add</span>
          New Rule
        </button>
      </Header>

      <div className="p-12 max-w-7xl mx-auto w-full overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            icon="checklist"
            iconBgClass="bg-blue-100 dark:bg-blue-900/30"
            iconTextClass="text-blue-600 dark:text-blue-400"
            label="Active Rules"
            value={rules.filter((r) => r.enabled).length}
          />
          <StatCard
            icon="bolt"
            iconBgClass="bg-primary/10"
            iconTextClass="text-primary"
            label="Total Rules"
            value={rules.length}
          />
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Rules Table */}
        <div className="bg-white dark:bg-background-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-12">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading rules...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 w-[15%]">Rule Name</th>
                    <th className="px-6 py-4 w-[30%]">Extensions</th>
                    <th className="px-6 py-4 w-[35%]">Destination</th>
                    <th className="px-6 py-4 w-[10%] text-center">Status</th>
                    <th className="px-6 py-4 w-[10%] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredRules.map((rule) => (
                    <tr
                      key={rule.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group ${!rule.enabled ? 'opacity-50' : ''
                        }`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColorClassesLight[rule.icon_color] || iconColorClassesLight['slate']
                              }`}
                          >
                            <span className="material-icons-round">{rule.icon}</span>
                          </div>
                          <span className="font-bold dark:text-white">{rule.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {rule.extensions.map((ext) => (
                            <span
                              key={ext}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-mono text-xs border border-slate-200 dark:border-slate-700"
                            >
                              {ext}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-mono text-sm text-slate-500 dark:text-slate-400 break-words">
                          {(() => {
                            const { parent, leaf } = formatPath(rule.destination);
                            return (
                              <>
                                {parent && (
                                  <>
                                    {parent}
                                    <br />
                                  </>
                                )}
                                {rule.destination.includes('\\') ? '\\' : '/'}{leaf}
                              </>
                            );
                          })()}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <label className="relative inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={rule.enabled}
                            onChange={() => toggleRule(rule.id, !rule.enabled)}
                          />
                          <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                          >
                            <span className="material-icons-round text-xl">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(rule.id)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors cursor-pointer"
                          >
                            <span className="material-icons-round text-xl">delete_outline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRules.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No rules found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <RuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={editingRule ? handleUpdate : handleCreate}
        initialData={editingRule}
      />

      <TutorialModal
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Rule"
        message="Are you sure you want to delete this rule? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
