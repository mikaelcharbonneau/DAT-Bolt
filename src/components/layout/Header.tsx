import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Home, Clipboard, AlertTriangle, BarChart, User } from 'lucide-react';
import HPELogo from '../ui/HPELogo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Header as GrommetHeader, Box, Nav, Button, Text, ResponsiveContext, Menu } from 'grommet';
import { useContext } from 'react';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { logout } = useAuth();
  const size = useContext(ResponsiveContext);

  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { path: '/inspections', icon: <Clipboard size={20} />, label: 'Audits' },
    { path: '/incidents', icon: <AlertTriangle size={20} />, label: 'Incidents' },
    { path: '/reports', icon: <BarChart size={20} />, label: 'Reports' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <GrommetHeader 
      background={darkMode ? 'background-back' : 'background-front'} 
      pad={{ horizontal: 'medium', vertical: 'small' }} 
      elevation="small"
    >
      <Box 
        direction="row" 
        align="center" 
        justify="between"
        fill="horizontal"
        gap="small"
      >
        {/* Logo and App Name Section - Fixed width */}
        <Box 
          direction="row" 
          align="center"
          gap="xlarge"
          width="250"
          flex={false}
        >
          <Box width="32px" height="32px" flex={false}>
            <HPELogo height={32} />
          </Box>
          <Text 
            weight="bold" 
            color="text-strong" 
            size="medium"
          >
            Datacenter Audit Tool
          </Text>
        </Box>

        {/* Navigation Section - Centered */}
        {size !== 'small' && (
          <Box flex="grow" align="center" justify="center">
            <Nav direction="row" gap="medium">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  style={{ textDecoration: 'none' }}
                >
                  <Box
                    direction="row"
                    align="center"
                    pad={{ horizontal: 'small', vertical: 'xsmall' }}
                    background={isActive(item.path) ? { color: 'brand', opacity: 'weak' } : undefined}
                    round="small"
                    gap="xsmall"
                  >
                    {item.icon}
                    <Text 
                      color={isActive(item.path) ? 'brand' : 'text'} 
                      weight={isActive(item.path) ? 'bold' : undefined}
                      size="small"
                    >
                      {item.label}
                    </Text>
                  </Box>
                </Link>
              ))}
            </Nav>
          </Box>
        )}

        {/* Actions Section - Fixed width */}
        <Box 
          direction="row" 
          align="center" 
          gap="small"
          width="250px"
          flex={false}
          justify="end"
        >
          <Button 
            plain 
            icon={<Bell size={20} />} 
            a11yTitle="Notifications" 
          />
          <Menu
            icon={<User size={20} />}
            items={[
              { label: 'Profile', onClick: () => navigate('/profile') },
              { label: 'Sign Out', onClick: handleLogout }
            ]}
          />
        </Box>
      </Box>

      {/* Mobile Navigation */}
      {size === 'small' && (
        <Box 
          direction="row" 
          gap="small" 
          margin={{ top: 'small' }} 
          justify="center"
          overflow="auto"
        >
          <Nav direction="row" gap="small">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path} 
                style={{ textDecoration: 'none' }}
              >
                <Box
                  direction="row"
                  align="center"
                  pad={{ horizontal: 'small', vertical: 'xsmall' }}
                  background={isActive(item.path) ? { color: 'brand', opacity: 'weak' } : undefined}
                  round="small"
                  gap="xsmall"
                >
                  {item.icon}
                  <Text 
                    color={isActive(item.path) ? 'brand' : 'text'} 
                    weight={isActive(item.path) ? 'bold' : undefined}
                    size="small"
                  >
                    {item.label}
                  </Text>
                </Box>
              </Link>
            ))}
          </Nav>
        </Box>
      )}
    </GrommetHeader>
  );
};

export default Header;