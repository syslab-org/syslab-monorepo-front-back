import {
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
} from "@/features/networkCanvas/utils/constants";
import { TYPE_VPC_NODE } from "./constants";

const getNodeTitle = ({ type }) => {
  switch (type) {
    case TYPE_COMPUTER_NODE:
      return "Computer";
    case TYPE_PRINTER_NODE:
      return "Printer";
    case TYPE_SERVER_NODE:
      return "Workload";
    case TYPE_SUBNETWORK_NODE:
      return "Zone Segment";
    case TYPE_ROUTER_NODE:
      return "Connectivity";
    case TYPE_VPC_NODE:
      return "Network Segment";
    default:
      return "Instance";
  }
};

export default getNodeTitle;
