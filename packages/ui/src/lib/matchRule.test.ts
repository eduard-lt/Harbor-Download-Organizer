import { describe, it, expect } from 'vitest';
import { matchFile } from './matchRule';
import type { Rule } from './tauri';

const rule = (o: Partial<Rule>): Rule => ({
    id: o.name ?? 'r', name: 'r', extensions: [], destination: 'C:\\out', create_symlink: false,
    enabled: true, icon: 'folder', icon_color: 'slate', ...o,
});

const rules = [
    rule({ name: 'Documents', extensions: ['pdf', 'docx'] }),
    rule({ name: 'Invoices', extensions: ['pdf'], pattern: 'invoice' }),
    rule({ name: 'Big videos', extensions: ['mp4'], min_size_bytes: 500 * 1024 * 1024 }),
    rule({ name: 'Videos', extensions: ['mp4'] }),
    rule({ name: 'Off', extensions: ['zip'], enabled: false }),
];
const MB = 1024 * 1024;

describe('matchFile', () => {
    it('lets a pattern rule outrank an earlier extension rule', () => {
        const result = matchFile(rules, 'invoice-march.pdf', MB);
        expect(result).toMatchObject({ kind: 'match', rule: { name: 'Invoices' } });
        expect(result.kind === 'match' && result.reason).toContain('pattern invoice');
    });

    it('falls back to the extension rule', () => {
        expect(matchFile(rules, 'notes.PDF', MB)).toMatchObject({ kind: 'match', rule: { name: 'Documents' } });
    });

    it('applies size limits', () => {
        expect(matchFile(rules, 'talk.mp4', 800 * MB)).toMatchObject({ rule: { name: 'Big videos' } });
        expect(matchFile(rules, 'clip.mp4', 10 * MB)).toMatchObject({ rule: { name: 'Videos' } });
    });

    it('skips disabled rules and partial downloads', () => {
        expect(matchFile(rules, 'backup.zip', MB)).toEqual({ kind: 'none' });
        expect(matchFile(rules, 'dataset.zip.crdownload', MB)).toEqual({ kind: 'partial' });
    });

    it('ignores rules whose pattern is invalid', () => {
        expect(matchFile([rule({ name: 'Bad', pattern: '(' })], 'a.txt', 1)).toEqual({ kind: 'none' });
    });
});
