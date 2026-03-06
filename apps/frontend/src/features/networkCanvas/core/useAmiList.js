import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/infrastructure/firebase/firebaseConfig";
import { DB_AMI_LIST } from "@/shared/constants";

/**
 * Hook encargado de cargar el catálogo de AMIs desde Firestore.
 * Se extrajo desde MainFlow para mantener el componente del canvas limpio.
 */
export function useAmiList() {
  const [amiList, setAmiList] = useState([]);

  useEffect(() => {
    const fetchAmiList = async () => {
      try {
        const amiListCollection = collection(db, DB_AMI_LIST);
        const amiListSnapshot = await getDocs(amiListCollection);

        const amiListResponse = amiListSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setAmiList(amiListResponse);
      } catch (error) {
        console.error("Error fetching AMI list:", error);
      }
    };

    fetchAmiList();
  }, []);

  return amiList;
}
