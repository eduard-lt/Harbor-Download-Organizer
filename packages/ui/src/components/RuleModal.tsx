import { useState, useEffect, useId, useRef } from 'react';
import { ChevronRight, CircleAlert, FolderOpen } from 'lucide-react';
import { Dialog } from './Dialog';
import type { Rule } from '../lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';

const isMac = navigator.platform.toLowerCase().includes('mac');
const destinationPlaceholder = isMac
  ? '~/Downloads/Images'
  : 'C:\\Users\\Name\\Pictures';
const destinationHint = isMac
  ? 'Full path of the folder files move to. You can use $HOME, ~/ and ${VAR}.'
  : 'Full path of the folder files move to. You can use %USERPROFILE%.';

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
    const formId = useId();
    const formRef = useRef<HTMLFormElement>(null);
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
        setError(null);
        setFieldErrors({});
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

    useEffect(() => {
        if (error && formRef.current) formRef.current.scrollTop = 0;
    }, [error]);

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

    const editing = !!initialData;
    const hasAdvanced = !!(initialData?.pattern || initialData?.min_size_bytes != null || initialData?.max_size_bytes != null);
    const sizeError = fieldErrors.min_size_bytes || fieldErrors.max_size_bytes;

    return (
        <Dialog open={isOpen} title={editing ? 'Edit rule' : 'New rule'} onClose={onClose} closeLabel="Close rule editor" wide
            footer={<>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" form={formId} disabled={loading} className="btn btn-primary">
                    {loading ? 'Saving…' : 'Save rule'}
                </button>
            </>}>
            <form id={formId} ref={formRef} onSubmit={handleSubmit} className="dialog-body">
                <div className="stack">
                    {error && (
                        <div role="alert" className="notice" data-tone="danger">
                            <CircleAlert size={16} aria-hidden="true" /><span className="grow">{error}</span>
                        </div>
                    )}

                    <div className="field">
                        <label className="field-label" htmlFor={`${formId}-name`}>Rule name</label>
                        <input type="text" id={`${formId}-name`} className="input" value={name}
                            onChange={(e) => setName(e.target.value)} placeholder="e.g. Images" required />
                    </div>

                    <div className="field">
                        <label className="field-label" htmlFor={`${formId}-extensions`}>File extensions</label>
                        <input type="text" id={`${formId}-extensions`} className="input" value={extensions}
                            aria-describedby={`${formId}-extensions-hint`}
                            onChange={(e) => setExtensions(e.target.value)} placeholder="e.g. jpg, png, gif" />
                        <p className="field-hint" id={`${formId}-extensions-hint`}>Separate with commas, no dots. Leave empty to match every file type.</p>
                    </div>

                    <div className="field">
                        <label className="field-label" htmlFor={`${formId}-destination`}>Destination folder</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" id={`${formId}-destination`} className="input mono" value={destination}
                                aria-describedby={`${formId}-destination-hint`}
                                onChange={(e) => setDestination(e.target.value)} placeholder={destinationPlaceholder} required />
                            <button type="button" onClick={handleBrowse} className="btn" title="Browse for folder">
                                <FolderOpen size={15} aria-hidden="true" />Browse
                            </button>
                        </div>
                        <p className="field-hint" id={`${formId}-destination-hint`}>{destinationHint}</p>
                    </div>

                    <details className="disclosure" open={hasAdvanced || !!sizeError || undefined}>
                        <summary><ChevronRight size={14} aria-hidden="true" />Advanced matching</summary>
                        <div className="disclosure-body">
                            <div className="field">
                                <label className="field-label" htmlFor={`${formId}-pattern`}>Filename pattern</label>
                                <input type="text" id={`${formId}-pattern`} className="input mono" value={pattern}
                                    aria-describedby={`${formId}-pattern-hint`}
                                    onChange={(e) => setPattern(e.target.value)} disabled={clearPattern} placeholder="e.g. ^IMG_\d+" />
                                <p className="field-hint" id={`${formId}-pattern-hint`}>
                                    A regular expression matched against the file name. Rules with a pattern are checked before extension-only rules, so a specific name such as “invoice” wins over a broad “pdf” rule.
                                </p>
                                {editing && (
                                    <label className="check"><input type="checkbox" checked={clearPattern}
                                        onChange={(e) => setClearPattern(e.target.checked)} />Clear pattern</label>
                                )}
                            </div>

                            <div className="size-grid">
                                <div className="field">
                                    <label className="field-label" htmlFor={`${formId}-minSizeBytes`}>Minimum size (bytes)</label>
                                    <input type="number" min={0} id={`${formId}-minSizeBytes`} className="input mono" value={minSizeBytes}
                                        aria-invalid={!!fieldErrors.min_size_bytes || undefined}
                                        onChange={(e) => setMinSizeBytes(e.target.value)} disabled={clearMinSize} placeholder="e.g. 1048576" />
                                    {editing && (
                                        <label className="check"><input type="checkbox" checked={clearMinSize}
                                            onChange={(e) => setClearMinSize(e.target.checked)} />Clear minimum size</label>
                                    )}
                                    {fieldErrors.min_size_bytes && <p className="field-error" role="alert">{fieldErrors.min_size_bytes}</p>}
                                </div>
                                <div className="field">
                                    <label className="field-label" htmlFor={`${formId}-maxSizeBytes`}>Maximum size (bytes)</label>
                                    <input type="number" min={0} id={`${formId}-maxSizeBytes`} className="input mono" value={maxSizeBytes}
                                        aria-invalid={!!fieldErrors.max_size_bytes || undefined}
                                        onChange={(e) => setMaxSizeBytes(e.target.value)} disabled={clearMaxSize} placeholder="e.g. 1073741824" />
                                    {editing && (
                                        <label className="check"><input type="checkbox" checked={clearMaxSize}
                                            onChange={(e) => setClearMaxSize(e.target.checked)} />Clear maximum size</label>
                                    )}
                                    {fieldErrors.max_size_bytes && fieldErrors.max_size_bytes !== fieldErrors.min_size_bytes &&
                                        <p className="field-error" role="alert">{fieldErrors.max_size_bytes}</p>}
                                </div>
                            </div>
                            <p className="field-hint">1 MB is 1048576 bytes. Leave a size empty for no limit.</p>
                        </div>
                    </details>

                    {!isMac && (
                        <label className="check" style={{ color: 'var(--ink)' }}>
                            <input type="checkbox" id="symlink" checked={createSymlink} onChange={(e) => setCreateSymlink(e.target.checked)} />
                            Leave a hidden shortcut (symlink) where the file was
                        </label>
                    )}
                </div>
            </form>
        </Dialog>
    );
}
