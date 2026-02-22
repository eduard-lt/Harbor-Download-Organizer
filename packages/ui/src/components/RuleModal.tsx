import { useState, useEffect } from 'react';
import type { Rule } from '../lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';

interface RuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: Omit<Rule, 'id' | 'icon' | 'icon_color'>) => Promise<void>;
    initialData?: Rule | null;
}

export function RuleModal({ isOpen, onClose, onSave, initialData }: RuleModalProps) {
    const [name, setName] = useState('');
    const [extensions, setExtensions] = useState('');
    const [destination, setDestination] = useState('');
    const [pattern, setPattern] = useState('');
    const [createSymlink, setCreateSymlink] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setExtensions(initialData.extensions.join(', '));
            setDestination(initialData.destination);
            setPattern(initialData.pattern || '');
            setCreateSymlink(initialData.create_symlink);
        } else {
            resetForm();
        }
    }, [initialData, isOpen]);

    const resetForm = () => {
        setName('');
        setExtensions('');
        setDestination('');
        setPattern('');
        setCreateSymlink(false);
        setError(null);
    };

    const handleBrowse = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                defaultPath: destination || undefined,
            });

            if (selected) {
                setDestination(selected as string);
            }
        } catch (err) {
            console.error('Failed to open dialog:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const extList = extensions
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            await onSave({
                name,
                extensions: extList,
                destination,
                pattern: pattern || undefined,
                create_symlink: createSymlink,
                enabled: initialData ? initialData.enabled : true,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {initialData ? 'Edit Rule' : 'New Rule'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Rule Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white"
                            placeholder="e.g. Images"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            File Extensions
                        </label>
                        <input
                            type="text"
                            value={extensions}
                            onChange={(e) => setExtensions(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white"
                            placeholder="e.g. jpg, png, gif"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Comma separated list of extensions (without dots).
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Destination Folder
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white font-mono text-sm"
                                placeholder="C:\Users\Name\Pictures"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleBrowse}
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="Browse Folder"
                            >
                                <span className="material-icons-round">folder_open</span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Absolute path to move files to. Supports %USERPROFILE%.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Regex Pattern (Optional)
                        </label>
                        <input
                            type="text"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white font-mono text-sm"
                            placeholder="e.g. ^IMG_\d+"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="symlink"
                            checked={createSymlink}
                            onChange={(e) => setCreateSymlink(e.target.checked)}
                            className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                        />
                        <label
                            htmlFor="symlink"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            Create hidden symlink in original location?
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save Rule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
