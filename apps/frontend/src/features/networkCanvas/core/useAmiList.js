import { useEffect, useState } from "react";

import { api } from "@/infrastructure/http/api";

export function useAmiList() {
  const [amiList, setAmiList] = useState([]);

  useEffect(() => {
    const fetchAmiList = async () => {
      try {
        const response = await api.listAmis({ provider: "aws" });
        setAmiList(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error("Error fetching AMI list:", error);
      }
    };

    fetchAmiList();
  }, []);

  return amiList;
}
