import { Injectable, NotFoundException } from '@nestjs/common';

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand: number; // in units/kg
  requiredVehicleType?: 'REFRIGERATED' | 'FROZEN' | 'NORMAL';
}

@Injectable()
export class TransportService {
  constructor() {}

  // 1. Internal optimization: Suggest warehouse zone and location
  async suggestZonePlacement(sku: string): Promise<any> {
    // Mock product info for zone placement
    const product = { name: 'Mock Product', storageType: 'NORMAL', minTemp: 0, maxTemp: 30, maxHumidity: 80 };

    let zone = 'DRY';
    let suggestedLocation = 'dry-row-1';
    let instructions = 'Store at room temperature in a dry, ventilated area.';

    if (product.storageType === 'COLD') {
      zone = 'COLD';
      suggestedLocation = `cold-shelf-${Math.floor(Math.random() * 5) + 1}`;
      instructions = `Maintain temperature between ${product.minTemp || 0}°C and ${product.maxTemp || 4}°C. Keep humidity under ${product.maxHumidity || 80}%.`;
    } else if (product.storageType === 'FROZEN') {
      zone = 'FROZEN';
      suggestedLocation = `frozen-bin-${Math.floor(Math.random() * 5) + 1}`;
      instructions = `Keep frozen below ${product.maxTemp || -18}°C. Ensure no moisture exposure.`;
    }

    return {
      sku,
      productName: product.name,
      recommendedZone: zone,
      suggestedLocation,
      environmentalRequirements: {
        minTemp: product.minTemp,
        maxTemp: product.maxTemp,
        maxHumidity: product.maxHumidity,
      },
      instructions,
    };
  }

  // 2. Inbound dock scheduling: returns optimized slots avoiding overlaps
  getInboundSchedule(): any[] {
    // Mock incoming bookings
    const bookings = [
      { id: '1', supplier: 'Dalat Organic Farms', time: '08:00', durationMin: 60, status: 'Scheduled', dock: 1 },
      { id: '2', supplier: 'Vissan Meat JSC', time: '08:30', durationMin: 90, status: 'Scheduled', dock: 1 }, // Conflict on Dock 1!
      { id: '3', supplier: 'Masan Consumer', time: '10:00', durationMin: 45, status: 'Scheduled', dock: 2 },
      { id: '4', supplier: 'CP Poultry Vietnam', time: '10:30', durationMin: 60, status: 'Scheduled', dock: 2 }, // Overlap on Dock 2
    ];

    // Simple conflict resolution logic: if booking overlaps, push it forward or shift to next dock
    const resolved = [];
    const dockAvailability = { 1: 8 * 60, 2: 8 * 60 }; // minutes from 00:00

    for (const b of bookings) {
      const [hours, minutes] = b.time.split(':').map(Number);
      let requestedStart = hours * 60 + minutes;

      // Check current availability for this dock
      if (requestedStart < dockAvailability[b.dock]) {
        // Shift start time to clear the conflict
        requestedStart = dockAvailability[b.dock];
      }

      const end = requestedStart + b.durationMin;
      dockAvailability[b.dock] = end;

      const formatTime = (min: number) => {
        const h = Math.floor(min / 60).toString().padStart(2, '0');
        const m = (min % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
      };

      resolved.push({
        ...b,
        originalTime: b.time,
        optimizedTime: formatTime(requestedStart),
        endTime: formatTime(end),
        conflictResolved: requestedStart !== hours * 60 + minutes,
      });
    }

    return resolved;
  }

  // 3. Outbound grouping: group order lots by supermarket sections
  groupOutboundLots(lots: any[]): any {
    const grouped = {
      DairySection: [],
      MeatSection: [],
      ProduceSection: [],
      DryGoodsSection: [],
      Unknown: [],
    };

    for (const lot of lots) {
      const category = lot.category?.toLowerCase() || '';
      if (category.includes('dairy') || category.includes('milk')) {
        grouped.DairySection.push(lot);
      } else if (category.includes('meat') || category.includes('sea') || category.includes('poultry')) {
        grouped.MeatSection.push(lot);
      } else if (category.includes('produce') || category.includes('veg') || category.includes('fruit')) {
        grouped.ProduceSection.push(lot);
      } else if (category.includes('dry') || category.includes('noodle') || category.includes('canned')) {
        grouped.DryGoodsSection.push(lot);
      } else {
        grouped.Unknown.push(lot);
      }
    }

    return grouped;
  }

  // 4. Delivery routing: VRP (Vehicle Routing Problem) Clarke-Wright Savings solver
  // Depot at Go Vap Supermarket (10.8286, 106.6802) HCMC
  solveVrp(stops: Stop[], defaultCapacity = 200, driversList?: any[]): any {
    const depot: Stop = { id: 'depot', name: 'Depot Trung Tâm CityMart (Gò Vấp)', lat: 10.8286, lng: 106.6802, demand: 0 };
    
    // Calculates Haversine distance between 2 coordinates (km)
    const getDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
      const R = 6371; // Earth radius in km
      const dLat = (p2.lat - p1.lat) * Math.PI / 180;
      const dLng = (p2.lng - p1.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Filter valid stops
    const validStops = stops.filter(s => s.demand > 0);
    if (validStops.length === 0) {
      return { depot, totalRoutes: 0, routes: [], totalDistance: 0 };
    }

    // Initialize routes: each stop has its own route [stop] (depot is implicit at start/end)
    let routes: Array<Stop[]> = validStops.map(stop => [stop]);

    // Calculate savings for all pairs (i, j)
    const savings: Array<{ i: string; j: string; saving: number }> = [];
    for (let i = 0; i < validStops.length; i++) {
      for (let j = i + 1; j < validStops.length; j++) {
        const stopI = validStops[i];
        const stopJ = validStops[j];
        const distDepotI = getDistance(depot, stopI);
        const distDepotJ = getDistance(depot, stopJ);
        const distIJ = getDistance(stopI, stopJ);
        const saving = distDepotI + distDepotJ - distIJ;
        savings.push({ i: stopI.id, j: stopJ.id, saving });
      }
    }

    // Sort savings in descending order
    savings.sort((a, b) => b.saving - a.saving);

    // Merge routes based on Clarke-Wright Savings
    for (const s of savings) {
      // Find routes containing i and j
      let routeIndexA = -1;
      let routeIndexB = -1;

      for (let rIdx = 0; rIdx < routes.length; rIdx++) {
        const route = routes[rIdx];
        if (route.some(stop => stop.id === s.i)) routeIndexA = rIdx;
        if (route.some(stop => stop.id === s.j)) routeIndexB = rIdx;
      }

      // If they are on different routes
      if (routeIndexA !== -1 && routeIndexB !== -1 && routeIndexA !== routeIndexB) {
        const routeA = routes[routeIndexA];
        const routeB = routes[routeIndexB];

        // Check if stops are at endpoints of their respective routes
        const firstA = routeA[0].id;
        const lastA = routeA[routeA.length - 1].id;
        const firstB = routeB[0].id;
        const lastB = routeB[routeB.length - 1].id;

        const isEndpointA = (firstA === s.i || lastA === s.i);
        const isEndpointB = (firstB === s.j || lastB === s.j);

        if (isEndpointA && isEndpointB) {
          // Check capacity constraint
          const totalDemandA = routeA.reduce((sum, st) => sum + st.demand, 0);
          const totalDemandB = routeB.reduce((sum, st) => sum + st.demand, 0);
          const combinedDemand = totalDemandA + totalDemandB;

          if (combinedDemand <= defaultCapacity) {
            // Merge routes in correct order
            let mergedRoute: Stop[] = [];
            if (lastA === s.i && firstB === s.j) {
              mergedRoute = [...routeA, ...routeB];
            } else if (firstA === s.i && lastB === s.j) {
              mergedRoute = [...routeB, ...routeA];
            } else if (firstA === s.i && firstB === s.j) {
              mergedRoute = [...[...routeA].reverse(), ...routeB];
            } else if (lastA === s.i && lastB === s.j) {
              mergedRoute = [...routeA, ...[...routeB].reverse()];
            }

            // Remove old routes and insert merged route
            routes = routes.filter((_, idx) => idx !== routeIndexA && idx !== routeIndexB);
            routes.push(mergedRoute);
          }
        }
      }
    }

    // Format output routes
    const outputRoutes = routes.map((routeStops, idx) => {
      // Calculate total demand
      const totalDemand = routeStops.reduce((sum, st) => sum + st.demand, 0);
      
      // Calculate total distance (depot -> stops... -> depot)
      let totalDistance = 0;
      let prevPoint = depot;
      for (const stop of routeStops) {
        totalDistance += getDistance(prevPoint, stop);
        prevPoint = stop;
      }
      totalDistance += getDistance(prevPoint, depot);

      return {
        routeId: `Route-${idx + 1}`,
        stops: [depot, ...routeStops, depot],
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDemand,
        assignedDriver: null as any
      };
    });

    // Match drivers to routes if list is provided
    if (driversList && Array.isArray(driversList) && driversList.length > 0) {
      // Sort routes by demand descending
      const sortedRoutes = [...outputRoutes].sort((a, b) => b.totalDemand - a.totalDemand);
      const availableDrivers = [...driversList].map(d => ({ ...d, isAssigned: false }));

      for (const route of sortedRoutes) {
        // Determine required vehicle type
        let requiredType: 'REFRIGERATED' | 'FROZEN' | 'NORMAL' = 'NORMAL';
        const routeStopsOnly = route.stops.filter(s => s.id !== 'depot');
        
        if (routeStopsOnly.some(s => s.requiredVehicleType === 'FROZEN')) {
          requiredType = 'FROZEN';
        } else if (routeStopsOnly.some(s => s.requiredVehicleType === 'REFRIGERATED')) {
          requiredType = 'REFRIGERATED';
        }

        // Find best driver: satisfies capacity and vehicle type, is not assigned, is available
        // vehicle compatibility:
        // - FROZEN route requires FROZEN truck
        // - REFRIGERATED route requires REFRIGERATED or FROZEN truck
        // - NORMAL route can use any truck
        let bestDriverIdx = -1;
        let minCapacityDifference = Infinity;

        for (let dIdx = 0; dIdx < availableDrivers.length; dIdx++) {
          const drv = availableDrivers[dIdx];
          if (drv.isAssigned || drv.status === 'MAINTENANCE') continue;
          if (drv.capacityKg < route.totalDemand) continue;

          // Check vehicle type compatibility
          let isCompatible = false;
          if (requiredType === 'FROZEN') {
            isCompatible = drv.vehicleType === 'FROZEN';
          } else if (requiredType === 'REFRIGERATED') {
            isCompatible = drv.vehicleType === 'REFRIGERATED' || drv.vehicleType === 'FROZEN';
          } else {
            isCompatible = true; // NORMAL route fits all
          }

          if (isCompatible) {
            const diff = drv.capacityKg - route.totalDemand;
            if (diff < minCapacityDifference) {
              minCapacityDifference = diff;
              bestDriverIdx = dIdx;
            }
          }
        }

        if (bestDriverIdx !== -1) {
          availableDrivers[bestDriverIdx].isAssigned = true;
          route.assignedDriver = {
            id: availableDrivers[bestDriverIdx].id,
            name: availableDrivers[bestDriverIdx].name,
            phone: availableDrivers[bestDriverIdx].phone,
            licensePlate: availableDrivers[bestDriverIdx].licensePlate,
            vehicleType: availableDrivers[bestDriverIdx].vehicleType,
            capacityKg: availableDrivers[bestDriverIdx].capacityKg
          };
        }
      }
    }

    return {
      depot,
      totalRoutes: outputRoutes.length,
      truckCapacity: defaultCapacity,
      routes: outputRoutes,
      totalDistance: Math.round(outputRoutes.reduce((sum, r) => sum + r.totalDistance, 0) * 100) / 100,
    };
  }

  async optimizeBatch(orders: any[]): Promise<any[]> {
    if (!orders || orders.length === 0) return [];
    // Nhóm các order theo warehouseCode
    const grouped = orders.reduce((acc, order) => {
      const wh = order.warehouseCode || 'WH-001';
      if (!acc[wh]) acc[wh] = [];
      acc[wh].push(order);
      return acc;
    }, {});

    const routes = [];
    for (const wh of Object.keys(grouped)) {
      const whOrders = grouped[wh];
      // Tối đa 5 đơn / xe
      const CAPACITY = 5; 
      for (let i = 0; i < whOrders.length; i += CAPACITY) {
        const batch = whOrders.slice(i, i + CAPACITY);
        routes.push({
          id: `ROUTE-${wh}-${Math.floor(Math.random() * 10000)}`,
          warehouseCode: wh,
          orders: batch,
          totalDistanceKm: (Math.random() * 20 + 5).toFixed(1), // Mock distance 5-25km
          status: 'PENDING_DISPATCH',
        });
      }
    }
    return routes;
  }

  async get3plQuote(routeInfo: any): Promise<any[]> {
    const distance = parseFloat(routeInfo.totalDistanceKm || '10');
    const orderCount = routeInfo.orders?.length || 1;
    
    // GHN: Rẻ hơn nhưng đi chậm hơn
    const ghnPrice = 15000 + (distance * 4000) + (orderCount * 5000);
    
    // Ahamove: Mắc hơn nhưng giao siêu tốc (Siêu Tốc)
    const ahamovePrice = 25000 + (distance * 6000) + (orderCount * 5000);

    return [
      {
        provider: 'GHN',
        name: 'Giao Hàng Nhanh',
        serviceType: 'Chuẩn (1-2 ngày)',
        price: Math.round(ghnPrice),
        estimatedTime: '24-48 giờ',
      },
      {
        provider: 'AHAMOVE',
        name: 'Ahamove',
        serviceType: 'Siêu Tốc (2-4 giờ)',
        price: Math.round(ahamovePrice),
        estimatedTime: '2-4 giờ',
      }
    ];
  }
}
