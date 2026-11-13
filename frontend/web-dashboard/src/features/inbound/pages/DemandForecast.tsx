import React from 'react';
import { AIDemandForecastPanel } from '../components/AIDemandForecastPanel';

export const DemandForecast: React.FC = () => {
  return (
    <div style={{ padding: '0.25rem 0' }}>
      <AIDemandForecastPanel />
    </div>
  );
};

export default DemandForecast;
