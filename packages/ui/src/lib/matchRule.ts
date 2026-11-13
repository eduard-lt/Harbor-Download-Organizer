import type { Rule } from './tauri';

export type MatchResult =
  | { kind: 'partial' }
  | { kind: 'none' }
  | { kind: 'match'; rule: Rule; reason: string };

const PARTIAL = ['.crdownload', '.part', '.tmp', '.download', '.opdownload'];

/**
 * Mirrors crates/core/src/downloads.rs for the guide's tester: partial downloads
 * are skipped; rules with a pattern or size limit outrank plain extension rules;
 * order breaks ties. Regex syntax differs slightly between Rust and JavaScript,
 * so exotic patterns are approximate.
 */
export function matchFile(rules: Rule[], fileName: string, sizeBytes: number): MatchResult {
  const name = fileName.trim();
  const lower = name.toLowerCase();
  if (PARTIAL.some(suffix => lower.endsWith(suffix))) return { kind: 'partial' };
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  const total = rules.length;
  const ranked = rules
    .map((rule, index) => {
      const modifiers = (rule.pattern ? 1 : 0) + (rule.min_size_bytes != null || rule.max_size_bytes != null ? 1 : 0);
      return { rule, priority: total - index + modifiers * total };
    })
    .sort((a, b) => b.priority - a.priority);

  for (const { rule } of ranked) {
    if (!rule.enabled) continue;
    if (rule.extensions.length > 0 && !rule.extensions.some(e => e.toLowerCase() === ext)) continue;
    if (rule.pattern) {
      let re: RegExp;
      try { re = new RegExp(rule.pattern); } catch { continue; }
      if (!re.test(name)) continue;
    }
    if (rule.min_size_bytes != null && sizeBytes < rule.min_size_bytes) continue;
    if (rule.max_size_bytes != null && sizeBytes > rule.max_size_bytes) continue;
    const reasons: string[] = [];
    if (rule.pattern) reasons.push(`its name matches the pattern ${rule.pattern}`);
    if (rule.extensions.length > 0) reasons.push(`it is a .${ext} file`);
    if (rule.min_size_bytes != null || rule.max_size_bytes != null) reasons.push('its size is within the limit');
    return { kind: 'match', rule, reason: reasons.length ? reasons.join(' and ') : 'this rule takes any file' };
  }
  return { kind: 'none' };
}
