// File: src/components/EnhancedAppBar.js
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Bell as Notifications,
  UserCircle as AccountCircle,
  Search
} from 'lucide-react';

const EnhancedAppBar = ({ onDrawerToggle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [notificationsCount] = useState(3); // Mock data

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - 280px)` },
        ml: { md: `280px` },
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon size={24} />
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            fontWeight: 600,
            color: theme.palette.primary.main
          }}
        >
          ERM System
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* Action Icons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton color="inherit" size="large">
            <Search size={22} />
          </IconButton>

          <IconButton color="inherit" size="large">
            <Badge badgeContent={notificationsCount} color="error">
              <Notifications size={24} />
            </Badge>
          </IconButton>

          <IconButton color="inherit" size="large">
            <AccountCircle size={24} />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default EnhancedAppBar;