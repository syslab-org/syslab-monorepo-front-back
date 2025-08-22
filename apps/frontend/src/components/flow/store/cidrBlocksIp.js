import { create } from "zustand";

const useCidrBlockVPCStore = create((set) => ({
    cidrBlockVPC: null,
    prefixLength: null,
    setCidrBlockVPC: (cidrBlockVPC) => {
        set({ cidrBlockVPC });
    },
    setPrefixLength: (prefixLength) => {
        set({ prefixLength });
    }
}))

export default useCidrBlockVPCStore