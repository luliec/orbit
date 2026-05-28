'use client'

import { create } from 'zustand'

type RequestTab = 'brief' | 'copies' | 'assets' | 'history' | 'approvals'

interface UIStore {
  sidebarOpen: boolean
  activeRequestTab: RequestTab
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveRequestTab: (tab: RequestTab) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  activeRequestTab: 'brief',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveRequestTab: (tab) => set({ activeRequestTab: tab }),
}))
