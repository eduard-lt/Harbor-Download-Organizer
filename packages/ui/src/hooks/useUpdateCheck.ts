import { useUpdateContext } from '../context/UpdateContext';

/**
 * @deprecated Use useUpdateContext instead directly, or keep this as a proxy.
 * Proxying to maintain backward compatibility with existing imports.
 */
export function useUpdateCheck() {
    return useUpdateContext();
}
