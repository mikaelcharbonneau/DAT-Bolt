import React from 'react';
import { Card, CardBody, Box, Text } from 'grommet';

interface StatusCardProps {
  title: string;
  count: number;
  status: 'ok' | 'warning' | 'critical' | 'disabled' | 'unknown';
}

export const StatusCard = ({ title, count, status }: StatusCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'status-ok';
      case 'warning':
        return 'status-warning';
      case 'critical':
        return 'status-critical';
      case 'disabled':
        return 'status-disabled';
      default:
        return 'status-unknown';
    }
  };

  return (
    <Card
      background="light-1"
      pad="medium"
      gap="small"
      width={{ min: '150px' }}
    >
      <Box direction="row" justify="between" align="center">
        <Text size="small" color="dark-3">
          {title}
        </Text>
        <Box
          background={getStatusColor(status)}
          pad={{ horizontal: 'xsmall', vertical: 'xxsmall' }}
          round="small"
        >
          <Text size="xsmall" color="white">
            {status.toUpperCase()}
          </Text>
        </Box>
      </Box>
      <CardBody>
        <Box align="center" justify="center" pad={{ vertical: 'small' }}>
          <Text size="xlarge" weight="bold">
            {count}
          </Text>
        </Box>
      </CardBody>
    </Card>
  );
};
