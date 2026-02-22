import { useState, useEffect, useCallback } from 'react';
import type { Rule } from '../lib/tauri';
import { getRules, createRule, updateRule, deleteRule, toggleRule, reorderRules } from '../lib/tauri';

export function useRules() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRules = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getRules();
            setRules(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch rules:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const addRule = async (rule: Omit<Rule, 'id' | 'icon' | 'icon_color'>) => {
        try {
            const newRule = await createRule(rule);
            setRules((prev) => [...prev, newRule]);
            return newRule;
        } catch (err) {
            throw err;
        }
    };

    const editRule = async (rule: Partial<Rule> & { id: string }) => {
        try {
            const updated = await updateRule(rule);
            setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            return updated;
        } catch (err) {
            throw err;
        }
    };

    const removeRule = async (id: string) => {
        try {
            await deleteRule(id);
            setRules((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            throw err;
        }
    };

    const toggle = async (id: string, enabled: boolean) => {
        try {
            await toggleRule(id, enabled);
            setRules((prev) =>
                prev.map((r) => (r.id === id ? { ...r, enabled } : r))
            );
        } catch (err) {
            throw err;
        }
    };

    const reorder = async (newOrderIds: string[]) => {
        // Optimistic update
        const oldRules = [...rules];
        const newRules = newOrderIds
            .map(id => rules.find(r => r.id === id))
            .filter((r): r is Rule => !!r);

        // Append any missing rules (safety)
        rules.forEach(r => {
            if (!newOrderIds.includes(r.id)) {
                newRules.push(r);
            }
        });

        setRules(newRules);

        try {
            await reorderRules(newOrderIds);
        } catch (err) {
            // Revert on error
            console.error("Failed to reorder rules:", err);
            setRules(oldRules);
            throw err;
        }
    };

    return {
        rules,
        loading,
        error,
        fetchRules,
        addRule,
        editRule,
        removeRule,
        toggleRule: toggle,
        reorderRules: reorder,
    };
}
