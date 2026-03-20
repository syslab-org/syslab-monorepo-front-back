// apps/frontend/src/components/flow/store/cidrBlocksIp.js
import { create } from "zustand";

export const useCanvasLabStore = create((set) => ({
  masterCidrBlock: null,
  cidrBlockVPC: null,
  prefixLength: null,
  labName: null,
  vlanName: null,
  labRegion: "us-east-1",
  vlanRegion: "us-east-1",
  setMasterCidrBlock: (masterCidrBlock) =>
    set({ masterCidrBlock, cidrBlockVPC: masterCidrBlock }),
  setCidrBlockVPC: (cidrBlockVPC) =>
    set({ cidrBlockVPC, masterCidrBlock: cidrBlockVPC }),
  setPrefixLength: (prefixLength) => set({ prefixLength }),
  setLabName: (labName) => set({ labName, vlanName: labName }),
  setVlanName: (vlanName) => set({ vlanName, labName: vlanName }),
  setLabRegion: (labRegion) => set({ labRegion, vlanRegion: labRegion }),
  setVlanRegion: (vlanRegion) => set({ vlanRegion, labRegion: vlanRegion }),
}));

export const useCidrBlockVPCStore = useCanvasLabStore;

export default useCanvasLabStore;
