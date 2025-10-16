// apps/frontend/src/components/flow/store/cidrBlocksIp.js
import { create } from "zustand";

const useCidrBlockVPCStore = create((set) => ({
  cidrBlockVPC: null,
  prefixLength: null,
  vlanName: null,
  vlanRegion: "us-east-1",
  setCidrBlockVPC: (cidrBlockVPC) => set({ cidrBlockVPC }),
  setPrefixLength: (prefixLength) => set({ prefixLength }),
  setVlanName: (vlanName) => set({ vlanName }),
  setVlanRegion: (vlanRegion) => set({ vlanRegion }),
}))

export default useCidrBlockVPCStore
