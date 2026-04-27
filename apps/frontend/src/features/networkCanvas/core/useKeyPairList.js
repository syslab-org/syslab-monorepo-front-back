import { useEffect, useState } from "react";

import { api } from "@/infrastructure/http/api";

export function useKeyPairList() {
  const [keyPairList, setKeyPairList] = useState([]);

  useEffect(() => {
    const fetchKeyPairList = async () => {
      try {
        const response = await api.listKeyPairs({ provider: "aws" });
        setKeyPairList(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error("Error fetching key pair list:", error);
      }
    };

    fetchKeyPairList();
  }, []);

  return keyPairList;
}
