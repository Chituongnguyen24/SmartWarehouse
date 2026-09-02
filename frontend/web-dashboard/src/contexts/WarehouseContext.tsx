import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  phone?: string;
  managerName?: string;
  managerEmail?: string;
  coolZoneMinTemp?: number;
  coolZoneMaxTemp?: number;
  frozenZoneMinTemp?: number;
  frozenZoneMaxTemp?: number;
  dryZoneMinTemp?: number;
  dryZoneMaxTemp?: number;
  maxRackCapacity?: number;
  totalRacks?: number;
  serviceRadiusKm?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface WarehouseContextType {
  warehouses: Warehouse[];
  selectedWarehouseCode: string;
  selectedWarehouse: Warehouse | null;
  isLoading: boolean;
  setSelectedWarehouseCode: (code: string) => void;
  fetchWarehouses: () => Promise<void>;
  createWarehouse: (data: Partial<Warehouse>) => Promise<Warehouse | null>;
  updateWarehouse: (id: string, data: Partial<Warehouse>) => Promise<Warehouse | null>;
  deleteWarehouse: (id: string) => Promise<boolean>;
  toggleWarehouseActive: (warehouse: Warehouse) => Promise<void>;
  
  // Modals state
  isConfigModalOpen: boolean;
  openConfigModal: (warehouse?: Warehouse | null) => void;
  closeConfigModal: () => void;
  targetWarehouseForConfig: Warehouse | null;

  isManageModalOpen: boolean;
  openManageModal: () => void;
  closeManageModal: () => void;
}

const WAREHOUSE_API = 'http://localhost:3005';

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

export const WarehouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isManager = user?.role === 'WAREHOUSE_MANAGER';
  const myWarehouseCode = user?.warehouseCode;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Default warehouse: if manager -> myWarehouseCode, else check localStorage or default to WH-006 (Gò Vấp)
  const [selectedWarehouseCode, setSelectedWarehouseCodeState] = useState<string>(() => {
    if (isManager && myWarehouseCode) return myWarehouseCode;
    const saved = localStorage.getItem('sfwms_selected_warehouse');
    return saved || 'WH-006';
  });

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [targetWarehouseForConfig, setTargetWarehouseForConfig] = useState<Warehouse | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses`);
      if (res.ok) {
        const data: Warehouse[] = await res.json();
        setWarehouses(data);
      }
    } catch (e) {
      console.error('Failed to fetch warehouses in WarehouseContext:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Sync if manager logs in
  useEffect(() => {
    if (isManager && myWarehouseCode) {
      setSelectedWarehouseCodeState(myWarehouseCode);
      localStorage.setItem('sfwms_selected_warehouse', myWarehouseCode);
    }
  }, [isManager, myWarehouseCode]);

  const setSelectedWarehouseCode = useCallback((code: string) => {
    setSelectedWarehouseCodeState(code);
    localStorage.setItem('sfwms_selected_warehouse', code);
  }, []);

  const selectedWarehouse = warehouses.find(w => w.code === selectedWarehouseCode) || warehouses[0] || null;

  const createWarehouse = async (data: Partial<Warehouse>): Promise<Warehouse | null> => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        await fetchWarehouses();
        setSelectedWarehouseCode(created.code);
        return created;
      }
      return null;
    } catch (e) {
      console.error('Failed to create warehouse:', e);
      return null;
    }
  };

  const updateWarehouse = async (id: string, data: Partial<Warehouse>): Promise<Warehouse | null> => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        await fetchWarehouses();
        return updated;
      }
      return null;
    } catch (e) {
      console.error('Failed to update warehouse:', e);
      return null;
    }
  };

  const deleteWarehouse = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchWarehouses();
        // If deleted currently selected, switch to first available
        if (selectedWarehouse?.id === id) {
          const remaining = warehouses.filter(w => w.id !== id);
          if (remaining.length > 0) {
            setSelectedWarehouseCode(remaining[0].code);
          }
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to delete warehouse:', e);
      return false;
    }
  };

  const toggleWarehouseActive = async (warehouse: Warehouse) => {
    await updateWarehouse(warehouse.id, { isActive: !warehouse.isActive });
  };

  const openConfigModal = (warehouse?: Warehouse | null) => {
    setTargetWarehouseForConfig(warehouse || selectedWarehouse || null);
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setTargetWarehouseForConfig(null);
  };

  const openManageModal = () => {
    setIsManageModalOpen(true);
  };

  const closeManageModal = () => {
    setIsManageModalOpen(false);
  };

  return (
    <WarehouseContext.Provider value={{
      warehouses,
      selectedWarehouseCode,
      selectedWarehouse,
      isLoading,
      setSelectedWarehouseCode,
      fetchWarehouses,
      createWarehouse,
      updateWarehouse,
      deleteWarehouse,
      toggleWarehouseActive,
      isConfigModalOpen,
      openConfigModal,
      closeConfigModal,
      targetWarehouseForConfig,
      isManageModalOpen,
      openManageModal,
      closeManageModal,
    }}>
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within a WarehouseProvider');
  }
  return context;
};
