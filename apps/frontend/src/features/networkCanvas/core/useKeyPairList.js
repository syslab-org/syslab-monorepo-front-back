import { useEffect, useState } from "react";

import { api } from "@/infrastructure/http/api";
import { CLOUD_AWS_VALUE } from "@/shared/constants";

export function useKeyPairList(provider = CLOUD_AWS_VALUE) {
  const [keyPairList, setKeyPairList] = useState([]);

  useEffect(() => {
    const fetchKeyPairList = async () => {
      try {
        const response = await api.listKeyPairs({ provider });
        setKeyPairList(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error("Error fetching key pair list:", error);
      }
    };

    fetchKeyPairList();
  }, [provider]);

  return keyPairList;
}
