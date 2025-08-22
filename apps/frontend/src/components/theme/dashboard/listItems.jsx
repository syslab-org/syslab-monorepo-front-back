import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { CloudQueue } from '@mui/icons-material';
import { ViewStreamOutlined } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '../../../constants';

export const MainListItems = () => {
  const { user } = useAuth()
  return (

    <React.Fragment>
      <ListItemButton variant='whiteStyle'>
        <ListItemIcon variant='whiteStyle'>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItemButton>
      <ListItemButton variant='whiteStyle' component="a" href="/admin/vpcs">
        <ListItemIcon variant='whiteStyle'>
          <CloudQueue />
        </ListItemIcon>
        <ListItemText primary="Virtual Private Cloud" />
      </ListItemButton>
      <ListItemButton variant='whiteStyle'>
        <ListItemIcon variant='whiteStyle'>
          <PeopleIcon />
        </ListItemIcon>
        <ListItemText primary="Customers" />
      </ListItemButton>
      <ListItemButton variant='whiteStyle'>
        <ListItemIcon variant='whiteStyle'>
          <BarChartIcon />
        </ListItemIcon>
        <ListItemText primary="Reports" />
      </ListItemButton>
      <ListItemButton variant='whiteStyle'>
        <ListItemIcon variant='whiteStyle'>
          <LayersIcon />
        </ListItemIcon>
        <ListItemText primary="Integrations" />
      </ListItemButton>
    </React.Fragment>
  )
}
  ;

export const SecondaryListItems = () => {
  const { user } = useAuth()
  // console.log("RoleUSer: ", user.role);

  return (
    <React.Fragment >
      <ListSubheader  component="div" inset sx={{backgroundColor:'#233044',color:'#ffffff'}}>
        Settings
      </ListSubheader>


      {(user.role === USER_ROL_SUPER_ADMIN) && (
        <ListItemButton variant='whiteStyle'  component="a" href="/admin/settings/amilist">
          <ListItemIcon variant='whiteStyle'>
            <ViewStreamOutlined />
          </ListItemIcon>
          <ListItemText primary="AMI List" />
        </ListItemButton>)}

      {(user.role === USER_ROL_SUPER_ADMIN || user.role === USER_ROL_TEACHER) && (
        <ListItemButton variant='whiteStyle' component="a" href="/admin/settings/usersmanagement">
          <ListItemIcon variant='whiteStyle'  >
            <AssignmentIcon />
          </ListItemIcon>
          <ListItemText primary="User Management" />
        </ListItemButton>
      )}

      {(user.role === USER_ROL_STUDENT) && (
        <ListItemButton variant='whiteStyle' component="a" href="/admin/settings/general">
          <ListItemIcon variant='whiteStyle'>
            <SettingsSuggestIcon  />
          </ListItemIcon>
          <ListItemText primary="General Settings" />
        </ListItemButton>

      )}

    </React.Fragment>)
};