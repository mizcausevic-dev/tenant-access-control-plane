"use client";

import { create } from "zustand";

type SurfaceMode = "overview" | "graphql" | "deploy" | "anatomy";

type ControlPlaneState = {
  selectedRequestId: string | null;
  surfaceMode: SurfaceMode;
  setSelectedRequestId: (requestId: string) => void;
  setSurfaceMode: (surfaceMode: SurfaceMode) => void;
};

export const useControlPlaneStore = create<ControlPlaneState>((set) => ({
  selectedRequestId: null,
  surfaceMode: "overview",
  setSelectedRequestId: (selectedRequestId) => set({ selectedRequestId }),
  setSurfaceMode: (surfaceMode) => set({ surfaceMode }),
}));
