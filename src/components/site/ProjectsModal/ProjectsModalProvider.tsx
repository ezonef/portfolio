"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ProjectsModal } from "./ProjectsModal";

type Ctx = { isOpen: boolean; open: () => void; close: () => void };

const ProjectsModalContext = createContext<Ctx | null>(null);

/**
 * Renders the Projects modal once for the whole app and lets any component open it
 * (header "Projects", "See all 06 →" in Selected work, the mobile menu).
 */
export function ProjectsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, open: () => setOpen(true), close: () => setOpen(false) }), [isOpen]);

  return (
    <ProjectsModalContext.Provider value={value}>
      {children}
      <ProjectsModal open={isOpen} onClose={value.close} />
    </ProjectsModalContext.Provider>
  );
}

export function useProjectsModal() {
  const ctx = useContext(ProjectsModalContext);
  if (!ctx) throw new Error("useProjectsModal must be used inside <ProjectsModalProvider>");
  return ctx;
}
