import { TYPE_COMPUTER_NODE, TYPE_PRINTER_NODE, TYPE_SERVER_NODE } from "../utils/constants";
import ComputerIcon from '@mui/icons-material/Computer';
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshop';
import StorageIcon from '@mui/icons-material/Storage';

export const getIconByInstanceType = (type) => {
    switch (type) {
        case TYPE_COMPUTER_NODE:
            return <ComputerIcon style={{ fontSize: 50, color: '#3f51b5' }} />;
        case TYPE_PRINTER_NODE:
            return <LocalPrintshopIcon style={{ fontSize: 50, color: '#3f51b5' }} />;
        case TYPE_SERVER_NODE:
            return <StorageIcon style={{ fontSize: 50, color: '#3f51b5' }} />;
        default:
            return <ComputerIcon style={{ fontSize: 100, color: '#3f51b5' }} />;
    }
};