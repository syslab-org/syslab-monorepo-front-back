import { TYPE_COMPUTER_NODE, TYPE_PRINTER_NODE, TYPE_ROUTER_NODE, TYPE_SERVER_NODE, TYPE_SUBNETWORK_NODE } from "../utils/constants";

const getNodeTitle = ({ type }) => {
    switch (type) {
        case TYPE_COMPUTER_NODE:
            return 'Computer'
        case TYPE_PRINTER_NODE:
            return 'Printer'
        case TYPE_SERVER_NODE:
            return 'Server'
        case TYPE_SUBNETWORK_NODE:
            return 'SubNetwork'
        case TYPE_ROUTER_NODE:
            return 'Router'
        default:
            return 'Instance'
    }
}

export default getNodeTitle 