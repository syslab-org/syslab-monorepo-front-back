import {
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_SERVER_NODE,
} from "./constants";
import ComputerIcon from "@mui/icons-material/Computer";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import StorageIcon from "@mui/icons-material/Storage";
import React from "react";

export const getIconByInstanceType = (type) => {
  const baseProps = { style: { fontSize: 50, color: "#3f51b5" } };

  switch (type) {
    case TYPE_COMPUTER_NODE:
      return React.createElement(ComputerIcon, baseProps);
    case TYPE_PRINTER_NODE:
      return React.createElement(LocalPrintshopIcon, baseProps);
    case TYPE_SERVER_NODE:
      return React.createElement(StorageIcon, baseProps);
    default:
      return React.createElement(ComputerIcon, {
        style: { fontSize: 100, color: "#3f51b5" },
      });
  }
};
