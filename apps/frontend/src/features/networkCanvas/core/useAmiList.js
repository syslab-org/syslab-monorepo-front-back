import { useEffect, useState } from "react";

import { api } from "@/infrastructure/http/api";
import { CLOUD_AWS_VALUE } from "@/shared/constants";

export function useAmiList(provider = CLOUD_AWS_VALUE) {
  const [amiList, setAmiList] = useState([]);

  useEffect(() => {
    const fetchAmiList = async () => {
      try {
        const response = await api.listAmis({ provider });
        setAmiList(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error("Error fetching AMI list:", error);
      }
    };

    fetchAmiList();
  }, [provider]);

  return amiList;
}
