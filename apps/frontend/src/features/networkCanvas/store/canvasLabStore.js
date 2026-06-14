// apps/frontend/src/components/flow/store/canvasLabStore.js
import { create } from "zustand";

export const useCanvasLabStore = create((set) => ({
  masterCidrBlock: null,
  cidrBlockVPC: null,
  prefixLength: null,
  labName: null,
  labNotes: "",
  vlanName: null,
  labRegion: "us-east-1",
  vlanRegion: "us-east-1",
  targetProvider: "aws",
  resolvedExecutionTarget: null,
  setMasterCidrBlock: (masterCidrBlock) =>
    set({ masterCidrBlock, cidrBlockVPC: masterCidrBlock }),
  setCidrBlockVPC: (cidrBlockVPC) =>
    set({ cidrBlockVPC, masterCidrBlock: cidrBlockVPC }),
  setPrefixLength: (prefixLength) => set({ prefixLength }),
  setLabName: (labName) => set({ labName, vlanName: labName }),
  setLabNotes: (labNotes) => set({ labNotes }),
  setVlanName: (vlanName) => set({ vlanName, labName: vlanName }),
  setLabRegion: (labRegion) => set({ labRegion, vlanRegion: labRegion }),
  setVlanRegion: (vlanRegion) => set({ vlanRegion, labRegion: vlanRegion }),
  setTargetProvider: (targetProvider) => set({ targetProvider }),
  setResolvedExecutionTarget: (resolvedExecutionTarget) => set({ resolvedExecutionTarget }),
}));

export default useCanvasLabStore;
