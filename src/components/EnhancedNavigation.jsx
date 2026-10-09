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
  Zap,
  CalendarCheck,
  Gauge,
  Library
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoncengNotifikasi from './persetujuan/LoncengNotifikasi';
import { useIdentitas } from '../services/identitas';

// Satu daftar menu. `peran` = siapa yang melihat (kosong = semua). Server tetap memeriksa hak akses.
const SEMUA_LIHAT = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO', 'AUDITOR'];
const PENGELOLA = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO'];
const MENU = [
  {
    section: 'Ringkasan',
    items: [
      { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
      { text: 'Dashboard Unit Kerja', icon: <Gauge size={20} />, path: '/dashboard-unit', peran: [...SEMUA_LIHAT, 'PIMPINAN', 'PETUGAS'] },
      { text: 'Dashboard Korporat', icon: <Building2 size={20} />, path: '/dashboard-korporat', peran: SEMUA_LIHAT },
      { text: 'Dashboard Eksekutif', icon: <BarChart3 size={20} />, path: '/executive-dashboard', peran: SEMUA_LIHAT },
    ]
  },
  {
    section: 'Manajemen Risiko',
    items: [
      { text: 'Register Risiko', icon: <AlertTriangle size={20} />, path: '/risk-register' },
      { text: 'Risiko Utama & Pustaka', icon: <Library size={20} />, path: '/risiko-utama' },
      { text: 'Pemantauan', icon: <CalendarCheck size={20} />, path: '/pemantauan' },
      { text: 'Antrean Verifikasi', icon: <CheckSquare size={20} />, path: '/approval', peran: [...PENGELOLA, 'PIMPINAN'] },
    ]
  },
  {
    section: 'Pantauan',
    items: [
      { text: 'Rencana Mitigasi', icon: <ClipboardCheck size={20} />, path: '/treatment-plans' },
      { text: 'Indikator Risiko (KRI)', icon: <Activity size={20} />, path: '/kri-monitoring' },
      { text: 'Peristiwa Risiko', icon: <AlertCircle size={20} />, path: '/incident-reporting' },
      { text: 'Laporan', icon: <FileText size={20} />, path: '/reporting' },
    ]
  },
  {
    section: 'Tata Kelola',
    items: [
      { text: 'Pengujian Kontrol', icon: <ShieldCheck size={20} />, path: '/control-testing' },
      { text: 'Selera Risiko', icon: <Target size={20} />, path: '/risk-appetite' },
      { text: 'Budaya Risiko', icon: <Users size={20} />, path: '/risk-culture' },
      { text: 'Matriks RACI', icon: <GitMerge size={20} />, path: '/raci-chart' },
    ]
  },
  {
    section: 'Administrasi',
    items: [
      {
        text: 'Organisasi', icon: <Settings size={20} />, hasChildren: true, peran: PENGELOLA,
        children: [
          { text: 'Struktur Organisasi', icon: <Network size={20} />, path: '/organization', tab: 'structure' },
          { text: 'Pengguna & Peran', icon: <Users size={20} />, path: '/organization', tab: 'users', peran: ['ADMIN', 'DIREKSI'] },
          { text: 'Parameter Risiko', icon: <Sliders size={20} />, path: '/organization', tab: 'risk-params' },
          { text: 'Pengaturan Sistem', icon: <Wrench size={20} />, path: '/organization', tab: 'system-settings', peran: ['ADMIN'] },
        ]
      },
    ]
  }
];

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
  const peranSaya = userData?.peran || [];
  const boleh = (item) => !item.peran || item.peran.some((p) => peranSaya.includes(p));
  const menuSections = MENU
    .map((sec) => ({ ...sec, items: sec.items.filter(boleh).map((it) => (it.children ? { ...it, children: it.children.filter(boleh) } : it)) }))
    .filter((sec) => sec.items.length);



  // Auto-expand menu based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const newOpenMenus = { ...openMenus };

    // Auto-expand parent menus when child is active
    menuSections.forEach(section => {
      section.items.forEach(item => {
        if (item.children?.some(child => child.path === currentPath)) newOpenMenus[item.text] = true;
      });
    });

    setOpenMenus(newOpenMenus);
  }, [location.pathname]);

  // Label peran utama pengguna untuk chip di header.
  const NAMA_PERAN = { ADMIN: 'Admin', DIREKSI: 'Direksi', PENGELOLA_RISIKO: 'Pengelola Risiko', AUDITOR: 'Auditor', PIMPINAN: 'Pimpinan', PETUGAS: 'Petugas' };
  const labelPeran = Object.keys(NAMA_PERAN).filter((p) => peranSaya.includes(p)).map((p) => NAMA_PERAN[p])[0] || '-';
  const identitas = useIdentitas();

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
                label={labelPeran}
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
          <LoncengNotifikasi sx={{ color: theme.palette.common.white }} />
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
        <>
        <Box sx={{
          px: 2, py: 1.5,
          background: theme.palette.primary.dark,
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
        }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: theme.palette.common.white, lineHeight: 1.2 }}>
            {identitas.perusahaan}
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.85) }}>
            {identitas.namaUnit}
          </Typography>
        </Box>
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
                label={labelPeran}
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
            <LoncengNotifikasi sx={{ ml: 'auto', color: theme.palette.common.white }} />
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
                Risiko
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
                Peristiwa
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
                Atur
              </Typography>
            </IconButton>
          </Box>
        </Toolbar>
        </>
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
            Status Sistem
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
                Keluar
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