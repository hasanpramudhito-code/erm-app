import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Box,
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  Toolbar,
  alpha
} from '@mui/material';
import {
  LayoutDashboard,
  BarChart3,
  AlertTriangle,
  Users,
  GitMerge,
  Settings,
  Target,
  FileText,
  ClipboardCheck,
  AlertCircle,
  Network,
  LogOut,
  ShieldCheck,
  Calendar,
  Bug,
  CheckCircle2,
  Sliders,
  Wrench,
  Building2,
  Activity,
  ChevronUp,
  ChevronDown,
  Menu as MenuIcon,
  CheckSquare,
  History,
  Workflow,
  Zap
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EnhancedNavigation = ({ mobileOpen, onDrawerToggle }) => {
  const { currentUser, logout, userData, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Professional Sidebar Styling
  const sidebarBg = theme.palette.mode === 'dark' ? '#121212' : '#0d47a1';
  const sidebarGradient = `linear-gradient(180deg, ${sidebarBg} 0%, ${alpha(sidebarBg, 0.9)} 100%)`;

  const [openMenus, setOpenMenus] = useState({});

  // Auto-expand menu based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const newOpenMenus = { ...openMenus };

    // Auto-expand parent menus when child is active
    Object.keys(navigationStructure).forEach(role => {
      navigationStructure[role].forEach(section => {
        section.items.forEach(item => {
          if (item.hasChildren && item.children) {
            const isChildActive = item.children.some(child =>
              child.path === currentPath || currentPath.startsWith(child.path + '/')
            );
            if (isChildActive) {
              newOpenMenus[item.text] = true;
            }
          }
        });
      });
    });

    setOpenMenus(newOpenMenus);
  }, [location.pathname]);

  const userRole = userData?.role || "STAFF";

  const handleMenuClick = (menu) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
    }
  };

  // Role-based access dengan struktur terbaru - URUTAN DIPERBARUI
  const navigationStructure = {
    ADMIN: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            path: '/dashboard',
            badge: 'home'
          },
          {
            text: 'Executive Dashboard',
            icon: <BarChart3 size={20} />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'ADMINISTRATION', // DIPINDAHKAN KE ATAS
        items: [
          {
            text: 'User Management',
            icon: <Users size={20} />,
            path: '/user-management',
            badge: 'admin'
          },
          {
            text: 'Organization',
            icon: <Building2 size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Organization Structure',
                icon: <GitMerge size={20} />,
                path: '/organization',
                tab: 'structure'
              },
              {
                text: 'Risk Parameters',
                icon: <Sliders size={20} />,
                path: '/organization',
                tab: 'risk-params',
                badge: 'comprehensive'
              },
              {
                text: 'System Settings',
                icon: <Settings size={20} />,
                path: '/organization',
                tab: 'system-settings',
                badge: 'admin'
              }
            ]
          },

        ]
      },
      {
        section: 'CORE RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <AlertTriangle size={20} />,
            path: '/risk-register',
            badge: 'core'
          },
          {
            text: 'Risk Assessment',
            icon: <BarChart3 size={20} />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <ClipboardCheck size={20} />,
            path: '/treatment-plans'
          }
        ]
      },
      {
        section: 'ADVANCED RISK MANAGEMENT',
        items: [
          {
            text: 'KRI Monitoring',
            icon: <Activity size={20} />,
            path: '/kri-monitoring'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <ShieldCheck size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <ShieldCheck size={20} />,
                path: '/control-register'
              },
              {
                text: 'Testing Schedule',
                icon: <Calendar size={20} />,
                path: '/testing-schedule'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle2 size={20} />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <Bug size={20} />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Incident Reporting', // DIUBAH: Lapor Kejadian → Incident Reporting
            icon: <AlertCircle size={20} />,
            path: '/incident-reporting',
            badge: 'hot'
          },
          {
            text: 'Reporting',
            icon: <FileText size={20} />,
            path: '/reporting'
          },
          {
            text: 'Approval Workflow',
            icon: <Workflow size={20} />,
            hasChildren: true,
            badge: 'new',
            children: [
              {
                text: 'Dashboard',
                icon: <LayoutDashboard size={20} />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <CheckSquare size={20} />,
                path: '/approval/pending'
              },
              {
                text: 'Workflow Configuration',
                icon: <Settings size={20} />,
                path: '/approval/workflows'
              },
              {
                text: 'Approval History',
                icon: <History size={20} />,
                path: '/approval/history'
              }
            ]
          }
        ]
      }
    ],
    DIRECTOR: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <BarChart3 size={20} />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'ORGANIZATION', // DIPINDAHKAN KE ATAS
        items: [
          {
            text: 'Organization',
            icon: <Building2 size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Organization Structure',
                icon: <GitMerge size={20} />,
                path: '/organization',
                tab: 'structure'
              },
              {
                text: 'Risk Parameters',
                icon: <Sliders size={20} />,
                path: '/organization',
                tab: 'risk-params'
              }
            ]
          }
        ]
      },
      {
        section: 'RISK OVERSIGHT',
        items: [
          {
            text: 'Risk Register',
            icon: <AlertTriangle size={20} />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <BarChart3 size={20} />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <ClipboardCheck size={20} />,
            path: '/treatment-plans'
          },
          {
            text: 'KRI Monitoring',
            icon: <Activity size={20} />,
            path: '/kri-monitoring'
          }
        ]
      },
      {
        section: 'CONTROL MONITORING',
        items: [
          {
            text: 'Control Testing',
            icon: <ShieldCheck size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <ShieldCheck size={20} />,
                path: '/control-register'
              },
              {
                text: 'Testing Schedule',
                icon: <Calendar size={20} />,
                path: '/testing-schedule'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle2 size={20} />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <Bug size={20} />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Incident Reporting', // DIUBAH
            icon: <AlertCircle size={20} />,
            path: '/incident-reporting'
          },
          {
            text: 'Reporting',
            icon: <FileText size={20} />,
            path: '/reporting'
          },
          {
            text: 'Approval Workflow',
            icon: <Workflow size={20} />,
            hasChildren: true,
            badge: 'new',
            children: [
              {
                text: 'Dashboard',
                icon: <LayoutDashboard size={20} />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <CheckSquare size={20} />,
                path: '/approval/pending'
              },
              {
                text: 'Approval History',
                icon: <History size={20} />,
                path: '/approval/history'
              }
            ]
          }
        ]
      }
    ],
    RISK_MANAGER: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <BarChart3 size={20} />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'SETTINGS', // DIPINDAHKAN KE ATAS
        items: [
          {
            text: 'Organization',
            icon: <Building2 size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Risk Parameters',
                icon: <Sliders size={20} />,
                path: '/organization',
                tab: 'risk-params'
              },
              {
                text: 'RACI Chart',
                icon: <Users size={20} />,
                path: '/raci-chart'
              }
            ]
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <AlertTriangle size={20} />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <BarChart3 size={20} />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <ClipboardCheck size={20} />,
            path: '/treatment-plans'
          },
          {
            text: 'KRI Monitoring',
            icon: <Activity size={20} />,
            path: '/kri-monitoring'
          },
          {
            text: 'KRI Settings',
            icon: <Settings size={20} />,
            path: '/kri-settings'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <ShieldCheck size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <ShieldCheck size={20} />,
                path: '/control-register'
              },
              {
                text: 'Testing Schedule',
                icon: <Calendar size={20} />,
                path: '/testing-schedule'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle2 size={20} />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <Bug size={20} />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Incident Reporting', // DIUBAH
            icon: <AlertCircle size={20} />,
            path: '/incident-reporting'
          },
          {
            text: 'Reporting',
            icon: <FileText size={20} />,
            path: '/reporting'
          },
          {
            text: 'Approval Workflow',
            icon: <Workflow size={20} />,
            hasChildren: true,
            badge: 'new',
            children: [
              {
                text: 'Dashboard',
                icon: <LayoutDashboard size={20} />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <CheckSquare size={20} />,
                path: '/approval/pending'
              },
              {
                text: 'Workflow Configuration',
                icon: <Settings size={20} />,
                path: '/approval/workflows'
              },
              {
                text: 'Approval History',
                icon: <History size={20} />,
                path: '/approval/history'
              }
            ]
          }
        ]
      }
    ],
    RISK_OWNER: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <BarChart3 size={20} />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <AlertTriangle size={20} />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <BarChart3 size={20} />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <ClipboardCheck size={20} />,
            path: '/treatment-plans'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <ShieldCheck size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <ShieldCheck size={20} />,
                path: '/control-register'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle2 size={20} />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <Bug size={20} />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Incident Reporting', // DIUBAH
            icon: <AlertCircle size={20} />,
            path: '/incident-reporting'
          },
          {
            text: 'Approval Workflow',
            icon: <Workflow size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Dashboard',
                icon: <LayoutDashboard size={20} />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <CheckSquare size={20} />,
                path: '/approval/pending'
              },
              {
                text: 'Approval History',
                icon: <History size={20} />,
                path: '/approval/history'
              }
            ]
          }
        ]
      }
    ],
    RISK_OFFICER: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <BarChart3 size={20} />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <AlertTriangle size={20} />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <BarChart3 size={20} />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <ClipboardCheck size={20} />,
            path: '/treatment-plans'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <ShieldCheck size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <ShieldCheck size={20} />,
                path: '/control-register'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle2 size={20} />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <Bug size={20} />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Incident Reporting', // DIUBAH
            icon: <AlertCircle size={20} />,
            path: '/incident-reporting'
          },
          {
            text: 'Approval Workflow',
            icon: <Workflow size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Dashboard',
                icon: <LayoutDashboard size={20} />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <CheckSquare size={20} />,
                path: '/approval/pending'
              },
              {
                text: 'Approval History',
                icon: <History size={20} />,
                path: '/approval/history'
              }
            ]
          }
        ]
      }
    ],
    STAFF: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <BarChart3 size={20} />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <AlertTriangle size={20} />,
            path: '/risk-register'
          }
        ]
      },
      {
        section: 'CONTROLS',
        items: [
          {
            text: 'Control Testing',
            icon: <ShieldCheck size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <ShieldCheck size={20} />,
                path: '/control-register'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle2 size={20} />,
                path: '/test-results'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Incident Reporting', // DIUBAH
            icon: <AlertCircle size={20} />,
            path: '/incident-reporting'
          },
          {
            text: 'Approval Workflow',
            icon: <Workflow size={20} />,
            hasChildren: true,
            children: [
              {
                text: 'Dashboard',
                icon: <LayoutDashboard size={20} />,
                path: '/approval'
              },
              {
                text: 'Approval History',
                icon: <History size={20} />,
                path: '/approval/history'
              }
            ]
          }
        ]
      }
    ]
  };

  // Fallback to STAFF if role not found
  const menuSections = navigationStructure[userRole] || navigationStructure[userRole === 'SUPER_ADMIN' ? 'ADMIN' : 'STAFF'];

  const renderMenuItem = (item, level = 0) => {
    // Logic untuk menentukan apakah item aktif
    const currentPath = location.pathname;

    // Check if this specific item path matches current path
    const isExactMatch = currentPath === item.path;

    // Check if any children match
    const hasMatchingChild = item.children && item.children.some(child =>
      currentPath === child.path
    );

    // Organization special case handling for tabs
    const getOrganizationLink = () => {
      if (item.path === '/organization' && item.tab) {
        return `/organization?tab=${item.tab}`;
      }
      return item.path;
    };

    const isOrganizationActive = () => {
      if (item.path === '/organization' && item.tab) {
        const urlParams = new URLSearchParams(location.search);
        return currentPath === '/organization' && urlParams.get('tab') === item.tab;
      }
      return false;
    };

    const isChildActive = item.hasChildren ? false : (item.tab ? isOrganizationActive() : isExactMatch);
    const isActive = isChildActive || hasMatchingChild; // Parent is active if child is active

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = openMenus[item.text] || hasMatchingChild;

    const paddingLeft = level === 0 ? 2 : 4;

    if (hasChildren) {
      return (
        <React.Fragment key={item.text}>
          <ListItem
            button
            onClick={() => handleMenuClick(item.text)}
            sx={{
              pl: paddingLeft,
              mb: 0.5,
              mx: 1.5,
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.85)',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'translateX(4px)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: isExpanded ? 600 : 400
              }}
            />
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {item.badge && (
              <Chip
                label={item.badge}
                size="small"
                color={item.badge === 'new' ? 'secondary' : 'primary'}
                sx={{ height: 20, fontSize: '0.625rem', ml: 1 }}
              />
            )}
          </ListItem>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ position: 'relative' }}>
              {/* Vertical line connector */}
              <Box sx={{
                position: 'absolute',
                left: '26px',
                top: 0,
                bottom: 0,
                width: '1px',
                bgcolor: 'rgba(255,255,255,0.15)'
              }} />
              {item.children.map((child, index) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <ListItem
        button
        key={item.text}
        component={Link}
        to={item.tab ? `/organization?tab=${item.tab}` : item.path}
        sx={{
          pl: paddingLeft,
          mb: 0.5,
          mx: 1.5,
          width: 'auto',
          borderRadius: '12px', // Floating bubble shape
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          // ACTIVE STATE STYLING (FLOATING BUBBLE)
          ...(isChildActive ? {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: 600,
            '&:before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: '#60a5fa', // Bright accent
              borderRadius: '4px 0 0 4px',
            }
          } : {
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: '#fff',
              transform: 'translateX(4px)',
            }
          })
        }}
      >
        <ListItemIcon sx={{
          color: 'inherit',
          minWidth: 36,
          // Glow effect for active icon
          filter: isChildActive ? 'drop-shadow(0 0 8px rgba(96,165,250,0.5))' : 'none'
        }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: isChildActive ? 600 : 400,
            letterSpacing: '0.02em'
          }}
        />
        {item.badge && (
          <Chip
            label={item.badge}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.625rem',
              bgcolor: isChildActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              color: '#fff'
            }}
          />
        )}
      </ListItem>
    );
  };

  const renderSection = (section) => (
    <Box key={section.section} sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        sx={{
          px: 3,
          py: 1,
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 700,
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'block',
        }}
      >
        {section.section}
      </Typography>
      <List component="div" disablePadding>
        {section.items.map(item => renderMenuItem(item))}
      </List>
    </Box>
  );

  if (loading) {
    return null; // ⛔ jangan render apapun saat auth belum siap
  }

  if (!currentUser) {
    return null; // 🔐 STOP TOTAL kalau belum login
  }



  const drawerContent = (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <Toolbar sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
          py: 1,
          background: alpha(theme.palette.primary.dark, 0.9),
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                bgcolor: theme.palette.secondary.light,
                width: 36,
                height: 36,
                border: `2px solid ${theme.palette.primary.light}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {userData?.name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                noWrap
                sx={{ color: theme.palette.common.white }}
              >
                {userData?.name || currentUser.email?.split('@')[0]}
              </Typography>
              <Chip
                label={userRole.replace('_', ' ')}
                size="small"
                color="secondary"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  color: theme.palette.common.white,
                  bgcolor: alpha(theme.palette.secondary.light, 0.8),
                  border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
                }}
              />
            </Box>
          </Box>
          <IconButton
            onClick={onDrawerToggle}
            sx={{
              color: theme.palette.common.white,
              bgcolor: alpha(theme.palette.common.white, 0.1),
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.2),
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <Toolbar sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          py: 2,
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
          background: alpha(theme.palette.primary.dark, 0.9),
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}>
          <Box display="flex" alignItems="center" width="100%" mb={2}>
            <Avatar
              sx={{
                bgcolor: theme.palette.secondary.light,
                width: 44,
                height: 44,
                mr: 2,
                fontSize: '1.2rem',
                border: `3px solid ${theme.palette.primary.light}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {userData?.name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                noWrap
                sx={{
                  maxWidth: 180,
                  color: theme.palette.common.white,
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              >
                {userData?.name || currentUser.email?.split('@')[0]}
              </Typography>
              <Chip
                label={userRole.replace('_', ' ')}
                size="small"
                color="secondary"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  mt: 0.5,
                  color: theme.palette.common.white,
                  bgcolor: alpha(theme.palette.secondary.light, 0.8),
                  border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
                }}
              />
            </Box>
          </Box>

          {/* Quick Actions */}
          <Box display="flex" gap={1} width="100%" flexWrap="wrap">
            <IconButton
              size="small"
              onClick={() => navigate('/risk-register')}
              sx={{
                p: 1,
                bgcolor: alpha(theme.palette.common.white, 0.15),
                borderRadius: 2,
                flex: 1,
                minWidth: 70,
                color: theme.palette.common.white,
                border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.25),
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <AlertTriangle size={18} />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem' }}>
                Risks
              </Typography>
            </IconButton>
            <IconButton
              size="small"
              onClick={() => navigate('/incident-reporting')}
              sx={{
                p: 1,
                bgcolor: alpha(theme.palette.error.light, 0.3),
                borderRadius: 2,
                flex: 1,
                minWidth: 70,
                color: theme.palette.common.white,
                border: `1px solid ${alpha(theme.palette.error.light, 0.3)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.light, 0.4),
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <AlertCircle size={18} />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem' }}>
                Report
              </Typography>
            </IconButton>
            <IconButton
              size="small"
              onClick={() => navigate('/organization')}
              sx={{
                p: 1,
                bgcolor: alpha(theme.palette.info.light, 0.3),
                borderRadius: 2,
                flex: 1,
                minWidth: 70,
                color: theme.palette.common.white,
                border: `1px solid ${alpha(theme.palette.info.light, 0.3)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.info.light, 0.4),
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Settings size={18} />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem' }}>
                Config
              </Typography>
            </IconButton>
          </Box>
        </Toolbar>
      )}

      {/* Navigation Sections */}
      <Box sx={{
        overflowY: 'auto',
        flex: 1,
        py: 1,
        background: sidebarGradient,
        '&::-webkit-scrollbar': {
          width: 6,
        },
        '&::-webkit-scrollbar-track': {
          background: alpha(theme.palette.primary.dark, 0.4),
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.primary.light, 0.5),
          borderRadius: 3,
          '&:hover': {
            background: alpha(theme.palette.primary.light, 0.7),
          }
        },
      }}>
        {menuSections.map(section => renderSection(section))}
      </Box>

      {/* Footer */}
      <Box sx={{
        p: 2,
        borderTop: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
        backgroundColor: alpha(theme.palette.primary.dark, 0.9),
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="caption" sx={{
            color: alpha(theme.palette.common.white, 0.8),
            fontWeight: 500,
          }}>
            System Status
          </Typography>
          <Chip
            label="Online"
            size="small"
            color="success"
            sx={{
              height: 20,
              fontSize: '0.6rem',
              color: theme.palette.common.white,
              bgcolor: alpha('#10b981', 0.8),
              border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
            }}
          />
        </Box>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            color: theme.palette.common.white,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.error.light, 0.3),
            border: `1px solid ${alpha(theme.palette.error.light, 0.3)}`,
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.light, 0.4),
              transform: 'translateY(-1px)',
            },
            py: 1,
            px: 2,
            transition: 'all 0.2s ease',
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            <LogOut size={18} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight={500}>
                Logout
              </Typography>
            }
          />
        </ListItem>
      </Box>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 300,
              background: sidebarGradient,
              boxShadow: '0 0 40px rgba(30, 58, 138, 0.3)',
              border: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              background: sidebarGradient,
              borderRight: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
              boxShadow: '0 0 30px rgba(30, 58, 138, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              border: 'none',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default EnhancedNavigation;