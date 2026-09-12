import { create } from "zustand";

interface UiState {
  /** Sidebar collapse state */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** Active project ID for navigation context */
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  /** Pair of scenario IDs selected for pairwise comparison */
  compareScenarioIds: [string | null, string | null];
  toggleCompareScenario: (id: string) => void;
  setCompareScenarios: (a: string | null, b: string | null) => void;
  clearCompare: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  activeProjectId: null,
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),

  compareScenarioIds: [null, null],
  toggleCompareScenario: (id: string) => {
    const [a, b] = get().compareScenarioIds;
    if (a === id) {
      set({ compareScenarioIds: [null, b] });
    } else if (b === id) {
      set({ compareScenarioIds: [a, null] });
    } else if (!a) {
      set({ compareScenarioIds: [id, b] });
    } else if (!b) {
      set({ compareScenarioIds: [a, id] });
    } else {
      // If both full, replace the second one
      set({ compareScenarioIds: [a, id] });
    }
  },
  setCompareScenarios: (a, b) => set({ compareScenarioIds: [a, b] }),
  clearCompare: () => set({ compareScenarioIds: [null, null] }),
}));
