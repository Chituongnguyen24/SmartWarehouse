import React, { createContext, useContext, useState } from 'react';
import { DeliveryTask, DriverProfile, TaskStatus } from '../types/driver';
import { MOCK_DRIVER_PROFILE, MOCK_DELIVERY_TASKS } from '../data/mockDriverData';

interface DriverTaskContextType {
  driverProfile: DriverProfile;
  toggleOnline: () => void;
  updateContainerTemp: (temp: number) => void;
  tasks: DeliveryTask[];
  activeTask: DeliveryTask | null;
  setActiveTask: (task: DeliveryTask | null) => void;
  startDelivery: (taskId: string) => void;
  completeDelivery: (taskId: string, proofImageUri?: string) => void;
  assignedTasks: DeliveryTask[];
  inTransitTasks: DeliveryTask[];
  deliveredTasks: DeliveryTask[];
}

const DriverTaskContext = createContext<DriverTaskContextType | undefined>(undefined);

export const DriverTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driverProfile, setDriverProfile] = useState<DriverProfile>(MOCK_DRIVER_PROFILE);
  const [tasks, setTasks] = useState<DeliveryTask[]>(MOCK_DELIVERY_TASKS);
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(
    MOCK_DELIVERY_TASKS.find(t => t.status === 'IN_TRANSIT') || MOCK_DELIVERY_TASKS[0]
  );

  const toggleOnline = () => {
    setDriverProfile(prev => ({ ...prev, isOnline: !prev.isOnline }));
  };

  const updateContainerTemp = (temp: number) => {
    setDriverProfile(prev => ({ ...prev, currentTemp: temp }));
  };

  const startDelivery = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: 'IN_TRANSIT' } : t))
    );
    const target = tasks.find(t => t.id === taskId);
    if (target) {
      setActiveTask({ ...target, status: 'IN_TRANSIT' });
    }
  };

  const completeDelivery = (taskId: string, proofImageUri?: string) => {
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay';
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'DELIVERED', deliveredAt: timeNow, proofImageUri }
          : t
      )
    );

    // Increase earnings & completed count
    setDriverProfile(prev => ({
      ...prev,
      completedTasksToday: prev.completedTasksToday + 1,
      totalEarningsToday: prev.totalEarningsToday + 35000, // 35.000đ per trip
    }));

    if (activeTask?.id === taskId) {
      setActiveTask(null);
    }
  };

  const assignedTasks = tasks.filter(t => t.status === 'ASSIGNED');
  const inTransitTasks = tasks.filter(t => t.status === 'IN_TRANSIT');
  const deliveredTasks = tasks.filter(t => t.status === 'DELIVERED');

  return (
    <DriverTaskContext.Provider
      value={{
        driverProfile,
        toggleOnline,
        updateContainerTemp,
        tasks,
        activeTask,
        setActiveTask,
        startDelivery,
        completeDelivery,
        assignedTasks,
        inTransitTasks,
        deliveredTasks,
      }}
    >
      {children}
    </DriverTaskContext.Provider>
  );
};

export const useDriverTask = () => {
  const context = useContext(DriverTaskContext);
  if (!context) {
    throw new Error('useDriverTask must be used within a DriverTaskProvider');
  }
  return context;
};
