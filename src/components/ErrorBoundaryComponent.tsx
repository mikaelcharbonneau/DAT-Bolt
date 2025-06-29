import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, Button } from 'grommet';

const ErrorBoundaryComponent = () => {
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    // Attempt to detect if app fails to load
    const timer = setTimeout(() => {
      if (document.querySelector('.main-content') === null) {
        setHasAttemptedLoad(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (hasAttemptedLoad) {
    return (
      <Box
        fill
        align="center"
        justify="center"
        pad="large"
        background="light-2"
        className="error-boundary"
      >
        <Heading level={2}>HPE Audit Portal</Heading>
        <Box 
          background="white" 
          pad="medium" 
          round="small" 
          width="large"
          elevation="small"
          margin={{ vertical: 'medium' }}
        >
          <Heading level={3}>Checking Application Status</Heading>
          <Text>If you see this message, the application might still be initializing.</Text>
          <Text margin={{ vertical: 'small' }}>
            Environment: {import.meta.env.MODE || 'Unknown'}
          </Text>
          <Button 
            primary 
            label="Refresh Page" 
            onClick={() => window.location.reload()} 
            margin={{ top: 'medium' }} 
          />
        </Box>
      </Box>
    );
  }

  return null;
};

export default ErrorBoundaryComponent;