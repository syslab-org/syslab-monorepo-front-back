import { create } from 'zustand'

const useClickedNodeIdStore = create((set) => ({
  clickedNodeId: null,
  setClickedNodeId: (clickedNodeId) => {
    set({ clickedNodeId });
  },
}))

export default useClickedNodeIdStore