import { describe, it, expect } from 'vitest';
import { formatPath } from './format';
import { batchLabel } from './format';

describe('formatPath', () => {
    it('returns empty parent and original path for a path with no separator', () => {
        const result = formatPath('filename.txt');
        expect(result).toEqual({ parent: '', leaf: 'filename.txt' });
    });

    it('splits a Windows path correctly', () => {
        const result = formatPath('C:\\Users\\Eduard\\Documents\\file.txt');
        expect(result).toEqual({ parent: 'C:\\Users\\Eduard\\Documents', leaf: 'file.txt' });
    });

    it('splits a Unix path correctly', () => {
        const result = formatPath('/home/user/documents/file.txt');
        expect(result).toEqual({ parent: '/home/user/documents', leaf: 'file.txt' });
    });

    it('handles a single-level Unix path', () => {
        const result = formatPath('/file.txt');
        expect(result).toEqual({ parent: '', leaf: 'file.txt' });
    });

    it('handles a single-level Windows path (e.g. C:\\file.txt)', () => {
        const result = formatPath('C:\\file.txt');
        expect(result).toEqual({ parent: 'C:', leaf: 'file.txt' });
    });

    it('returns empty parent and leaf as empty string for empty string', () => {
        const result = formatPath('');
        expect(result).toEqual({ parent: '', leaf: '' });
    });

    it('handles deeply nested Windows paths', () => {
        const result = formatPath('C:\\a\\b\\c\\d\\e.pdf');
        expect(result).toEqual({ parent: 'C:\\a\\b\\c\\d', leaf: 'e.pdf' });
    });

    it('handles deeply nested Unix paths', () => {
        const result = formatPath('/a/b/c/d/e.pdf');
        expect(result).toEqual({ parent: '/a/b/c/d', leaf: 'e.pdf' });
    });

    it('prefers backslash separator if both separators appear', () => {
        // Windows path takes priority since includes('\\') is checked first
        const result = formatPath('C:\\a/b\\c.txt');
        expect(result).toEqual({ parent: 'C:\\a/b', leaf: 'c.txt' });
    });
});

describe('batchLabel', () => {
    const now = new Date(2024, 0, 2, 18, 0);
    it('names today and yesterday in words', () => {
        expect(batchLabel(3, '2024-01-02 14:32:00', now)).toBe('3 files, today at 14:32');
        expect(batchLabel(1, '2024-01-01 09:05:00', now)).toBe('1 file, yesterday at 09:05');
    });
    it('falls back to a date, or to the count alone without a time', () => {
        expect(batchLabel(2, '2023-12-28 08:00:00', now)).toBe('2 files, Thu, Dec 28, 2023 at 08:00');
        expect(batchLabel(4, null, now)).toBe('4 files');
    });
});
