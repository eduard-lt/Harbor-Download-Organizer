import { useState, useEffect } from 'react';
import type { Rule } from '../lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';

export interface RuleFormData {
    name: string;
    extensions: string[];
    destination: string;
    pattern?: string | null;
    min_size_bytes?: number | null;
    max_size_bytes?: number | null;
    create_symlink: boolean;
    enabled: boolean;
}

interface RuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: RuleFormData) => Promise<void>;
    initialData?: Rule | null;
}

export function RuleModal({ isOpen, onClose, onSave, initialData }: RuleModalProps) {
    const [name, setName] = useState('');
    const [extensions, setExtensions] = useState('');
    const [destination, setDestination] = useState('');
    const [pattern, setPattern] = useState('');
    const [minSizeBytes, setMinSizeBytes] = useState('');
    const [maxSizeBytes, setMaxSizeBytes] = useState('');
    const [clearPattern, setClearPattern] = useState(false);
    const [clearMinSize, setClearMinSize] = useState(false);
    const [clearMaxSize, setClearMaxSize] = useState(false);
    const [createSymlink, setCreateSymlink] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ min_size_bytes?: string; max_size_bytes?: string }>({});

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setExtensions(initialData.extensions.join(', '));
            setDestination(initialData.destination);
            setPattern(initialData.pattern || '');
            setMinSizeBytes(initialData.min_size_bytes != null ? String(initialData.min_size_bytes) : '');
            setMaxSizeBytes(initialData.max_size_bytes != null ? String(initialData.max_size_bytes) : '');
            setClearPattern(false);
            setClearMinSize(false);
            setClearMaxSize(false);
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
        setMinSizeBytes('');
        setMaxSizeBytes('');
        setClearPattern(false);
        setClearMinSize(false);
        setClearMaxSize(false);
        setCreateSymlink(false);
        setError(null);
        setFieldErrors({});
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
        setFieldErrors({});

        try {
            const extList = extensions
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            const parsedMin = minSizeBytes.trim() === '' ? undefined : Number(minSizeBytes);
            const parsedMax = maxSizeBytes.trim() === '' ? undefined : Number(maxSizeBytes);

            const nextFieldErrors: { min_size_bytes?: string; max_size_bytes?: string } = {};
            if (!clearMinSize && parsedMin != null && Number.isNaN(parsedMin)) {
                nextFieldErrors.min_size_bytes = 'Minimum size must be a valid number.';
            }
            if (!clearMaxSize && parsedMax != null && Number.isNaN(parsedMax)) {
                nextFieldErrors.max_size_bytes = 'Maximum size must be a valid number.';
            }
            if (!clearMinSize && !clearMaxSize && parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
                nextFieldErrors.min_size_bytes = 'Minimum size must be less than or equal to maximum size.';
                nextFieldErrors.max_size_bytes = 'Minimum size must be less than or equal to maximum size.';
            }

            if (Object.keys(nextFieldErrors).length > 0) {
                setFieldErrors(nextFieldErrors);
                setLoading(false);
                return;
            }

            await onSave({
                name,
                extensions: extList,
                destination,
                pattern: clearPattern ? null : (pattern || undefined),
                min_size_bytes: clearMinSize ? null : parsedMin,
                max_size_bytes: clearMaxSize ? null : parsedMax,
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
                            disabled={clearPattern}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white font-mono text-sm"
                            placeholder="e.g. ^IMG_\d+"
                        />
                        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={clearPattern}
                                onChange={(e) => setClearPattern(e.target.checked)}
                            />
                            Clear pattern
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Minimum Size (bytes)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={minSizeBytes}
                                onChange={(e) => setMinSizeBytes(e.target.value)}
                                disabled={clearMinSize}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white font-mono text-sm"
                                placeholder="e.g. 1048576"
                            />
                            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={clearMinSize}
                                    onChange={(e) => setClearMinSize(e.target.checked)}
                                />
                                Clear minimum size
                            </label>
                            {fieldErrors.min_size_bytes && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.min_size_bytes}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Maximum Size (bytes)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={maxSizeBytes}
                                onChange={(e) => setMaxSizeBytes(e.target.value)}
                                disabled={clearMaxSize}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white font-mono text-sm"
                                placeholder="e.g. 1073741824"
                            />
                            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={clearMaxSize}
                                    onChange={(e) => setClearMaxSize(e.target.checked)}
                                />
                                Clear maximum size
                            </label>
                            {fieldErrors.max_size_bytes && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.max_size_bytes}</p>
                            )}
                        </div>
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
