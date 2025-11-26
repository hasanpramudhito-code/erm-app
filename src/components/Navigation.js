// File: src/components/Navigation.js
import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Dashboard,
  Assessment,
  Warning,
  People,
  BarChart,
  Business,
  Settings,
  TrackChanges,
  Description,
  Assignment,
  Report,
  AccountTree,
  Logout // ✅ TAMBAHKAN INI
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({
    organization: false
  });

  const handleMenuClick = (menu) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Navigation structure sesuai permintaan - JANGAN DIUBAH
  const navigationStructure = {
    ADMIN: [
      {
        text: 'Executive Dashboard',
        icon: <Dashboard />,
        path: '/executive-dashboard'
      },
      {
        text: 'Risk Register',
        icon: <Warning />,
        path: '/risk-register'
      },
      {
        text: 'Risk Assessment',
        icon: <Assessment />,
        path: '/risk-assessment'
      },
      {
        text: 'Treatment Plans',
        icon: <Assignment />,
        path: '/treatment-plans'
      },
      {
        text: 'KRI Monitoring',
        icon: <TrackChanges />,
        path: '/kri-monitoring'
      },
      {
        text: 'Lapor Kejadian',
        icon: <Report />,
        path: '/incident-reporting'
      },
      {
        text: 'Reporting',
        icon: <Description />,
        path: '/reporting'
      },
      {
        text: 'User Management',
        icon: <People />,
        path: '/user-management'
      },
      {
        text: 'Organization',
        icon: <Business />,
        hasChildren: true,
        children: [
          {
            text: 'Struktur Organisasi',
            icon: <AccountTree />,
            path: '/organization'
          },
          {
            text: 'Risk Parameter Setting',
            icon: <Settings />,
            path: '/risk-parameters'
          }
        ]
      },
      {
        text: 'Settings',
        icon: <Settings />,
        hasChildren: true,
        children: [
          {
          text: 'Dashboard', // ✅ TAMBAH DASHBOARD DI SINI
          icon: <Dashboard />,
          path: '/dashboard'
        },
        {
          text: 'System Settings',
          icon: <Settings />,
          path: '/settings'
        },
        ]
      }
    ],
    DIRECTOR: [
      {
        text: 'Executive Dashboard',
        icon: <Dashboard />,
        path: '/executive-dashboard'
      },
      {
        text: 'Risk Register',
        icon: <Warning />,
        path: '/risk-register'
      },
      {
        text: 'Risk Assessment',
        icon: <Assessment />,
        path: '/risk-assessment'
      },
      {
        text: 'Treatment Plans',
        icon: <Assignment />,
        path: '/treatment-plans'
      },
      {
        text: 'KRI Monitoring',
        icon: <TrackChanges />,
        path: '/kri-monitoring'
      },
      {
        text: 'Lapor Kejadian',
        icon: <Report />,
        path: '/incident-reporting'
      },
      {
        text: 'Reporting',
        icon: <Description />,
        path: '/reporting'
      },
      {
        text: 'Organization',
        icon: <Business />,
        hasChildren: true,
        children: [
          {
            text: 'Struktur Organisasi',
            icon: <AccountTree />,
            path: '/organization'
          },
          {
            text: 'Risk Parameter Setting',
            icon: <Settings />,
            path: '/risk-parameters'
          }
        ]
      },
      {
        text: 'Settings',
        icon: <Settings />,
        hasChildren: true,
        children: [
          {
          text: 'Dashboard', // ✅ TAMBAH DASHBOARD DI SINI
          icon: <Dashboard />,
          path: '/dashboard'
        },
        {
          text: 'System Settings',
          icon: <Settings />,
          path: '/settings'
        },
        ]
      }
    ],
    RISK_MANAGER: [
      {
        text: 'Executive Dashboard',
        icon: <Dashboard />,
        path: '/executive-dashboard'
      },
      {
        text: 'Risk Register',
        icon: <Warning />,
        path: '/risk-register'
      },
      {
        text: 'Risk Assessment',
        icon: <Assessment />,
        path: '/risk-assessment'
      },
      {
        text: 'Treatment Plans',
        icon: <Assignment />,
        path: '/treatment-plans'
      },
      {
        text: 'KRI Monitoring',
        icon: <TrackChanges />,
        path: '/kri-monitoring'
      },
      {
        text: 'Lapor Kejadian',
        icon: <Report />,
        path: '/incident-reporting'
      },
      {
        text: 'Reporting',
        icon: <Description />,
        path: '/reporting'
      },
      {
        text: 'Organization',
        icon: <Business />,
        hasChildren: true,
        children: [
          {
            text: 'Risk Parameter Setting',
            icon: <Settings />,
            path: '/risk-parameters'
          }
        ]
      },
      {
        text: 'Settings',
        icon: <Settings />,
        hasChildren: true,
        children: [
          {
          text: 'Dashboard', // ✅ TAMBAH DASHBOARD DI SINI
          icon: <Dashboard />,
          path: '/dashboard'
        },
        {
          text: 'System Settings',
          icon: <Settings />,
          path: '/settings'
        },
        ]
      }
    ],
    RISK_OWNER: [
      {
        text: 'Executive Dashboard',
        icon: <Dashboard />,
        path: '/executive-dashboard'
      },
      {
        text: 'Risk Register',
        icon: <Warning />,
        path: '/risk-register'
      },
      {
        text: 'Risk Assessment',
        icon: <Assessment />,
        path: '/risk-assessment'
      },
      {
        text: 'Treatment Plans',
        icon: <Assignment />,
        path: '/treatment-plans'
      },
      {
        text: 'Lapor Kejadian',
        icon: <Report />,
        path: '/incident-reporting'
      },
      {
        text: 'Settings',
        icon: <Settings />,
        hasChildren: true,
        children: [
          {
          text: 'Dashboard', // ✅ TAMBAH DASHBOARD DI SINI
          icon: <Dashboard />,
          path: '/dashboard'
        },
        {
          text: 'System Settings',
          icon: <Settings />,
          path: '/settings'
        },
        ]
      }
    ],
    STAFF: [
      {
        text: 'Executive Dashboard',
        icon: <Dashboard />,
        path: '/executive-dashboard'
      },
      {
        text: 'Risk Register',
        icon: <Warning />,
        path: '/risk-register'
      },
      {
        text: 'Lapor Kejadian',
        icon: <Report />,
        path: '/incident-reporting'
      }
    ]
  };

  const { userData } = useAuth();

  const rawRole = userData?.role || 'STAFF';
  const userRole = rawRole.toUpperCase();
  const menuItems = navigationStructure[userRole] || navigationStructure.STAFF;


  const renderMenuItem = (item, level = 0) => {
    const isActive = location.pathname === item.path;
    const hasChildren = item.hasChildren && item.children;
    const isExpanded = openMenus[item.text?.toLowerCase()];

    if (hasChildren) {
      return (
        <React.Fragment key={item.text}>
          <ListItem
            component="button"
            onClick={() => handleMenuClick(item.text?.toLowerCase())}
            sx={{
              pl: 2 + level * 2,
              backgroundColor: isActive ? 'action.selected' : 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography 
                  variant="body2" 
                  fontWeight={isActive ? 'bold' : 'normal'}
                >
                  {item.text}
                </Typography>
              } 
            />
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <ListItem
        key={item.text}
        component={Link}
        to={item.path}
        sx={{
          pl: 2 + level * 2,
          color: isActive ? 'primary.main' : 'text.primary',
          backgroundColor: isActive ? 'action.selected' : 'transparent',
          borderRight: isActive ? 3 : 0,
          borderColor: 'primary.main',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          textDecoration: 'none',
        }}
      >
        <ListItemIcon 
          sx={{ 
            color: isActive ? 'primary.main' : 'text.secondary',
            minWidth: 40
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText 
          primary={
            <Typography 
              variant="body2" 
              fontWeight={isActive ? 'bold' : 'normal'}
            >
              {item.text}
            </Typography>
          } 
        />
      </ListItem>
    );
  };

  return (
    <>
      <List component="nav" sx={{ width: '100%' }}>
        {menuItems.map(item => renderMenuItem(item))}
      </List>
      
      {/* ✅ LOGOUT MENU */}
      <Divider sx={{ my: 1 }} />
      <List>
        <ListItem
           component="button"
          onClick={handleLogout}
          sx={{
            pl: 2,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <Logout /> {/* ✅ SEKARANG SUDAH TERDEFINISI */}
          </ListItemIcon>
          <ListItemText 
            primary={
              <Typography variant="body2" fontWeight="medium">
                Logout
              </Typography>
            } 
          />
        </ListItem>
      </List>
    </>
  );
};

export default Navigation;