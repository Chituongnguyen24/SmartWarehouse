import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { RouteWaypoint } from '@/features/picking';
import {
  Navigation,
  Compass,
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
  MapPin,
  CheckCircle2,
  Box,
  Snowflake,
  Thermometer,
  Boxes,
  X,
  Package,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { DEFAULT_RACKS, ShelfRack, ShelfItem, populateRacksWithDbLots, formatStandardShelfLocation } from '@/features/picking';
import { fetchInventoryLots, fetchProducts, ApiLot, ApiProduct } from '@/shared';

interface Props {
  waypoints?: RouteWaypoint[];
  currentWaypointIndex?: number;
  items?: any[];
  activeItem?: any;
  height?: number | string;
  onSelectWaypoint?: (index: number) => void;
  initialZone?: 'ALL' | 'COOL' | 'FROZEN' | 'DRY';
  targetSku?: string;
  lots?: ApiLot[] | any[];
  products?: ApiProduct[] | any[];
  warehouseCode?: string;
}

export const Mobile3DWarehouseView: React.FC<Props> = ({
  waypoints = [],
  currentWaypointIndex = 0,
  items = [],
  activeItem,
  height = 420,
  onSelectWaypoint,
  initialZone = 'COOL',
  targetSku = '',
  lots: propLots,
  products: propProducts,
  warehouseCode = 'WH-006',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedZone, setSelectedZone] = useState<'ALL' | 'COOL' | 'FROZEN' | 'DRY'>(initialZone || 'COOL');

  const [dbLots, setDbLots] = useState<any[]>(propLots || []);
  const [dbProducts, setDbProducts] = useState<any[]>(propProducts || []);

  // Update lots when prop changes
  useEffect(() => {
    if (propLots && propLots.length > 0) {
      setDbLots(propLots);
      if (propProducts && propProducts.length > 0) setDbProducts(propProducts);
      return;
    }

    let isMounted = true;
    fetchInventoryLots({ warehouseCode: warehouseCode || 'WH-006', limit: 10000 })
      .then((lotsData) => {
        if (isMounted && Array.isArray(lotsData)) setDbLots(lotsData);
      })
      .catch((err) => console.warn('3D lots fetch warning:', err));

    fetchProducts()
      .then((prodsData) => {
        if (isMounted) {
          const list = Array.isArray(prodsData) ? prodsData : (prodsData as any)?.items || [];
          setDbProducts(list);
        }
      })
      .catch((err) => console.warn('3D prods fetch warning:', err));

    return () => {
      isMounted = false;
    };
  }, [propLots, propProducts, warehouseCode]);

  // Compute live 26 racks populated with DB lots
  const populatedRacks = useMemo(() => {
    return populateRacksWithDbLots(DEFAULT_RACKS, dbLots, dbProducts, warehouseCode);
  }, [dbLots, dbProducts, warehouseCode]);

  // Three.js Core Persistent Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const racksGroupRef = useRef<THREE.Group | null>(null);
  const beaconMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Orbit controls state (Touch + Mouse)
  const isDraggingCam = useRef(false);
  const previousTouchPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDist = useRef<number>(0);
  const sphericalCoords = useRef({ radius: 38, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const targetCamLookAt = useRef(new THREE.Vector3(16, 2.0, 14));
  const currentCamLookAt = useRef(new THREE.Vector3(16, 2.0, 14));

  // Determine current active target item and waypoint
  const currentTarget = useMemo(() => {
    if (activeItem) return activeItem;
    if (waypoints.length > 0 && waypoints[currentWaypointIndex]) {
      const wp = waypoints[currentWaypointIndex];
      return wp.items && wp.items[0]
        ? wp.items[0]
        : { shelfLocation: wp.shelf, productName: 'Sản phẩm cần lấy', quantity: 1, unit: 'món', zone: wp.zone };
    }
    if (items.length > 0) {
      const pending = items.find((i) => i.status !== 'PICKED') || items[0];
      return pending;
    }
    if (targetSku) {
      const q = targetSku.toLowerCase().trim();
      for (const r of populatedRacks) {
        const found = r.items.find(
          (it) => it.sku.toLowerCase().includes(q) || it.name.toLowerCase().includes(q) || it.lotCode.toLowerCase().includes(q)
        );
        if (found) {
          return {
            shelfLocation: r.name,
            productName: found.name,
            quantity: found.qty,
            unit: found.unit,
            zone: r.zone,
            sku: found.sku,
            lotCode: found.lotCode,
            location: found.location,
          };
        }
      }
    }
    return null;
  }, [activeItem, waypoints, currentWaypointIndex, items, targetSku, populatedRacks]);

  // Auto-switch zone to target item's zone if active
  useEffect(() => {
    if (currentTarget?.zone && (currentTarget.zone === 'COOL' || currentTarget.zone === 'FROZEN' || currentTarget.zone === 'DRY')) {
      setSelectedZone(currentTarget.zone);
    }
  }, [currentTarget?.zone]);

  // Helper to create 3D text sprite
  const createLabelSprite = useCallback((text: string, bgColor: string, textColor: string = '#ffffff') => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(6, 6, 372, 84, 14);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px "Segoe UI", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.6, 0.9, 1);
    return sprite;
  }, []);

  // 1. INITIALIZE THREE.JS ENGINE ONCE ON MOUNT
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(280, container.clientWidth || 360);
    const h = typeof height === 'number' ? height : container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1120');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 1000);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) {
      console.warn('WebGL init fallback:', e);
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // Floor Plane
    const floorGeo = new THREE.PlaneGeometry(68, 58);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(16, 0, 14);
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(68, 38, 0x334155, 0x1e293b);
    gridHelper.position.set(16, 0.01, 14);
    scene.add(gridHelper);

    // Main Dynamic Racks Group
    const racksGroup = new THREE.Group();
    scene.add(racksGroup);
    racksGroupRef.current = racksGroup;

    // Animation Loop
    let isRunning = true;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!isRunning) return;
      animationFrameRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Bobbing beacon animation
      if (beaconMeshRef.current) {
        beaconMeshRef.current.position.y += Math.sin(time * 4) * 0.005;
        beaconMeshRef.current.rotation.y = time * 2.0;
      }

      // Smooth camera orbit
      const target = targetCamLookAt.current;
      const radius = sphericalCoords.current.radius;
      const phi = sphericalCoords.current.phi;
      const theta = sphericalCoords.current.theta;

      const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      const y = target.y + radius * Math.cos(phi);
      const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

      camera.position.lerp(new THREE.Vector3(x, y, z), 0.1);
      currentCamLookAt.current.lerp(target, 0.1);
      camera.lookAt(currentCamLookAt.current);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = Math.max(280, container.clientWidth || 360);
      const newH = typeof height === 'number' ? height : container.clientHeight || 420;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      } else if (isRunning) {
        clock.start();
        animate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [height]);

  // 2. REBUILD RACK & BOX MESHES SAFELY WITHOUT RECREATING WEBGL CONTEXT
  useEffect(() => {
    const racksGroup = racksGroupRef.current;
    if (!racksGroup) return;

    // Clean up old dynamic child meshes
    while (racksGroup.children.length > 0) {
      const child = racksGroup.children[0];
      child.traverse((c: any) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose());
          else c.material.dispose();
        }
      });
      racksGroup.remove(child);
    }
    beaconMeshRef.current = null;

    // 3 Main Warehouse Zones Demarcation (COOL, FROZEN, DRY)
    const allZones = [
      { id: 'COOL', name: 'KHO MÁT (0-4°C)', x: -2, z: 14, w: 15, d: 36, color: '#10b981', labelBg: '#047857' },
      { id: 'FROZEN', name: 'ĐÔNG LẠNH (-18°C)', x: 16, z: 14, w: 15, d: 36, color: '#06b6d4', labelBg: '#0369a1' },
      { id: 'DRY', name: 'KHO KHÔ (+25°C)', x: 34, z: 14, w: 17, d: 36, color: '#f59e0b', labelBg: '#b45309' },
    ];

    const activeZones = selectedZone === 'ALL' ? allZones : allZones.filter((z) => z.id === selectedZone);

    activeZones.forEach((z) => {
      const zGeo = new THREE.PlaneGeometry(z.w, z.d);
      const zMat = new THREE.MeshBasicMaterial({
        color: z.color,
        transparent: true,
        opacity: 0.12,
      });
      const zMesh = new THREE.Mesh(zGeo, zMat);
      zMesh.rotation.x = -Math.PI / 2;
      zMesh.position.set(z.x, 0.02, z.z);
      racksGroup.add(zMesh);

      // Zone Header Label
      const zLabel = createLabelSprite(z.name, z.labelBg);
      if (zLabel) {
        zLabel.position.set(z.x, 6.8, z.z - z.d / 2 - 1.2);
        zLabel.scale.set(4.8, 1.2, 1);
        racksGroup.add(zLabel);
      }
    });

    const activeCenter = activeZones.length === 1
      ? new THREE.Vector3(activeZones[0].x, 2.0, 14)
      : new THREE.Vector3(16, 2.0, 14);

    // Start Dispatch Dock / Entrance (Anchored to active zone)
    const dockX = activeZones.length === 1 ? activeZones[0].x : 16;
    const dockGeo = new THREE.BoxGeometry(8, 0.4, 2.5);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const dock = new THREE.Mesh(dockGeo, dockMat);
    dock.position.set(dockX, 0.2, -4);
    racksGroup.add(dock);

    const dockLabel = createLabelSprite('CỬA XUẤT HÀNG (START)', '#0284c7');
    if (dockLabel) {
      dockLabel.position.set(dockX, 1.8, -4);
      dockLabel.scale.set(3.8, 0.9, 1);
      racksGroup.add(dockLabel);
    }

    // Target Shelf Coords Matcher
    let targetCoords = { x: dockX, z: 14, y: 2.2 };
    let hasFoundTargetRack = false;
    let targetSlotDetail = '';
    const currentLoc = (currentTarget?.shelfLocation || currentTarget?.location || '').toLowerCase();
    const currentSku = (currentTarget?.sku || '').toLowerCase();
    const currentLot = (currentTarget?.lotCode || '').toLowerCase();

    // Extract target tier and column from shelf location text (e.g. "Kệ C4 • Tầng 4 Cột 4")
    const targetTierMatch = currentLoc.match(/tầng\s*(\d+)/i);
    const targetColMatch = currentLoc.match(/cột\s*(\d+)/i);
    const targetLvl = targetTierMatch ? parseInt(targetTierMatch[1], 10) - 1 : -1;
    const targetCol = targetColMatch ? parseInt(targetColMatch[1], 10) - 1 : -1;

    // RACK 3D DIMENSIONS
    const levels = 5; // 5 Tiers (Tầng 1 đến Tầng 5)
    const levelHeight = 0.85;
    const rackWidth = 5.2;
    const rackDepth = 1.6;
    const rackHeight = levels * levelHeight + 0.35;

    const zoneRacksMap: { [key: string]: ShelfRack[] } = {
      COOL: populatedRacks.filter((r) => r.zone === 'COOL'),
      FROZEN: populatedRacks.filter((r) => r.zone === 'FROZEN'),
      DRY: populatedRacks.filter((r) => r.zone === 'DRY'),
    };

    activeZones.forEach((zoneConfig) => {
      const racksInZone = zoneRacksMap[zoneConfig.id] || [];

      racksInZone.forEach((rack, rIdx) => {
        const colIdx = rIdx % 2; // 2 Aisles per zone
        const rowIdx = Math.floor(rIdx / 2);
        const rx = zoneConfig.x + (colIdx === 0 ? -3.8 : 3.8);
        const rz = rowIdx * 6.5 + 2;

        const rackNameLower = rack.name.toLowerCase();
        const rackIdLower = rack.id.toLowerCase();

        const rackLetter = zoneConfig.id === 'COOL' ? 'A' : zoneConfig.id === 'FROZEN' ? 'B' : 'C';
        const rackCode = `${rackLetter}${rIdx + 1}`;
        const isTargetRack =
          (currentLoc && (new RegExp(`\\b${rackCode}\\b`, 'i').test(currentLoc) || currentLoc.includes(`kệ ${rackCode.toLowerCase()}`))) ||
          (currentLoc && currentLoc.includes(rackNameLower.split('(')[0].trim())) ||
          (currentLoc && currentLoc.includes(rackIdLower)) ||
          rack.items.some((it) => (currentSku && it.sku.toLowerCase() === currentSku) || (currentLot && it.lotCode.toLowerCase() === currentLot));

        const rackSubGroup = new THREE.Group();

        // 1. PBR Upright Steel Columns
        const postGeo = new THREE.BoxGeometry(0.12, rackHeight, 0.12);
        const postMat = new THREE.MeshStandardMaterial({
          color: isTargetRack ? 0x38bdf8 : 0x1e3a8a,
          metalness: 0.85,
          roughness: 0.3,
        });

        [-rackWidth / 2, -rackWidth / 6, rackWidth / 6, rackWidth / 2].forEach((px) => {
          [-rackDepth / 2, rackDepth / 2].forEach((pz) => {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(rx + px, rackHeight / 2, rz + pz);
            rackSubGroup.add(post);
          });
        });

        // 2. Load Beams & Decking on All 5 Tiers
        const beamMat = new THREE.MeshStandardMaterial({
          color: isTargetRack
            ? 0x0284c7
            : zoneConfig.id === 'COOL'
            ? 0x0284c7
            : zoneConfig.id === 'FROZEN'
            ? 0x0891b2
            : 0xea580c,
          metalness: 0.75,
          roughness: 0.3,
        });

        const deckingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 });

        for (let lvl = 0; lvl <= levels; lvl++) {
          const y = 0.22 + lvl * levelHeight;

          const beamFront = new THREE.Mesh(new THREE.BoxGeometry(rackWidth + 0.12, 0.09, 0.06), beamMat);
          beamFront.position.set(rx, y, rz + rackDepth / 2);

          const beamBack = new THREE.Mesh(new THREE.BoxGeometry(rackWidth + 0.12, 0.09, 0.06), beamMat);
          beamBack.position.set(rx, y, rz - rackDepth / 2);

          const decking = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.02, rackDepth - 0.08), deckingMat);
          decking.position.set(rx, y + 0.03, rz);

          rackSubGroup.add(beamFront, beamBack, decking);
        }

        // 3. Rack Signboard Billboard
        const shortName = rack.name.split('(')[0].trim();
        const rLabel = createLabelSprite(
          `${shortName} (${rack.items.length} Lô)`,
          isTargetRack ? '#0284c7' : zoneConfig.labelBg
        );
        if (rLabel) {
          rLabel.position.set(rx, rackHeight + 0.75, rz);
          rackSubGroup.add(rLabel);
        }

        // 4. Target Glowing Ring
        if (isTargetRack) {
          const ringGeo = new THREE.RingGeometry(2.8, 3.4, 32);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(rx, 0.04, rz);
          rackSubGroup.add(ring);
        }

        // 5. Populate 5-Tier x 3-Bay Product Boxes (Tối Đa 15 Ô Mỗi Kệ)
        const numCols = 3;
        const bayCenters = [-rackWidth / 3, 0, rackWidth / 3];
        const boxWidth = 1.42; // Thùng hàng to công nghiệp bề thế
        const boxHeight = 0.65; // Cao chiếm ~76% tầng
        const boxDepth = 1.15;

        const palletHeight = 0.09;
        const palletGeo = new THREE.BoxGeometry(boxWidth + 0.08, palletHeight, boxDepth + 0.08);
        const palletMat = new THREE.MeshStandardMaterial({
          color: 0xc89d6c,
          roughness: 0.9,
          metalness: 0.05,
        });

        const sharedBoxGeo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        const boxEdgeGeo = new THREE.EdgesGeometry(sharedBoxGeo);
        const edgeMatNormal = new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 1 });
        const edgeMatTarget = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

        const matNormal = new THREE.MeshStandardMaterial({
          color: zoneConfig.id === 'COOL' ? 0x10b981 : zoneConfig.id === 'FROZEN' ? 0x06b6d4 : 0xb48256,
          roughness: 0.65,
          metalness: 0.05,
        });
        const matTarget = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          roughness: 0.4,
          metalness: 0.2,
          emissive: 0xdc2626,
          emissiveIntensity: 0.3,
        });

        // Bảng 15 vị trí ô chuẩn (5 tầng x 3 khoang) phân bổ ziczac đều từ Tầng 1 đến Tầng 5
        const balancedSlotGrid: { lvl: number; col: number; cellNumber: number }[] = [
          { lvl: 0, col: 1, cellNumber: 2 },  // Tầng 1 - Cột 2 (Giữa)
          { lvl: 1, col: 0, cellNumber: 4 },  // Tầng 2 - Cột 1 (Trái)
          { lvl: 2, col: 2, cellNumber: 9 },  // Tầng 3 - Cột 3 (Phải)
          { lvl: 3, col: 1, cellNumber: 11 }, // Tầng 4 - Cột 2 (Giữa)
          { lvl: 4, col: 0, cellNumber: 13 }, // Tầng 5 - Cột 1 (Trái)
          { lvl: 0, col: 0, cellNumber: 1 },  // Tầng 1 - Cột 1 (Trái)
          { lvl: 1, col: 2, cellNumber: 6 },  // Tầng 2 - Cột 3 (Phải)
          { lvl: 2, col: 1, cellNumber: 8 },  // Tầng 3 - Cột 2 (Giữa)
          { lvl: 3, col: 0, cellNumber: 10 }, // Tầng 4 - Cột 1 (Trái)
          { lvl: 4, col: 2, cellNumber: 15 }, // Tầng 5 - Cột 3 (Phải)
          { lvl: 0, col: 2, cellNumber: 3 },  // Tầng 1 - Cột 3 (Phải)
          { lvl: 1, col: 1, cellNumber: 5 },  // Tầng 2 - Cột 2 (Giữa)
          { lvl: 2, col: 0, cellNumber: 7 },  // Tầng 3 - Cột 1 (Trái)
          { lvl: 3, col: 2, cellNumber: 12 }, // Tầng 4 - Cột 3 (Phải)
          { lvl: 4, col: 1, cellNumber: 14 }, // Tầng 5 - Cột 2 (Giữa)
        ];

        // Prioritize target item so it claims the exact target slot first
        const sortedItems = [...rack.items].sort((a, b) => {
          const aMatch = isTargetRack && ((currentSku && a.sku.toLowerCase() === currentSku) || (currentLot && a.lotCode.toLowerCase() === currentLot));
          const bMatch = isTargetRack && ((currentSku && b.sku.toLowerCase() === currentSku) || (currentLot && b.lotCode.toLowerCase() === currentLot));
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });

        // Xác định số lượng thùng hiển thị phủ đầy kệ theo dung lượng thực tế (tối đa 15 thùng)
        let targetBoxCount = 0;
        if (sortedItems.length > 0) {
          const totalUnits = sortedItems.reduce((s, it) => s + (it.qty || 1), 0);
          const capRatio = totalUnits / (rack.maxCapacity || 500);
          if (capRatio >= 0.85 || totalUnits >= 200) {
            targetBoxCount = 15; // Phủ đầy 15/15 ô kệ
          } else {
            targetBoxCount = Math.min(15, Math.max(sortedItems.length, Math.round(capRatio * 15), 6));
          }
        }

        for (let bIdx = 0; bIdx < targetBoxCount; bIdx++) {
          const it = sortedItems[bIdx % sortedItems.length];
          const isTargetItem = isTargetRack && (
            (currentSku && it.sku.toLowerCase() === currentSku) ||
            (currentLot && it.lotCode.toLowerCase() === currentLot) ||
            (!hasFoundTargetRack && bIdx === 0)
          );

          const slot = balancedSlotGrid[bIdx];
          let lvl = slot.lvl;
          let col = slot.col;

          if (isTargetItem && targetLvl >= 0 && targetCol >= 0) {
            lvl = Math.min(levels - 1, Math.max(0, targetLvl));
            col = Math.min(numCols - 1, Math.max(0, targetCol));
          }

          const levelBaseY = 0.22 + lvl * levelHeight + 0.04;
          const palletPosY = levelBaseY + palletHeight / 2;
          const posY = levelBaseY + palletHeight + boxHeight / 2;

          const posX = rx + bayCenters[col];
          const posZ = rz;

          if (isTargetItem && !hasFoundTargetRack) {
            targetCoords = { x: posX, y: posY + 0.35, z: posZ };
            targetSlotDetail = `Tầng ${lvl + 1} • Cột ${col + 1}`;
            hasFoundTargetRack = true;
          }

          // 1. Wooden Pallet
          const palletMesh = new THREE.Mesh(palletGeo, palletMat);
          palletMesh.position.set(posX, palletPosY, posZ);
          rackSubGroup.add(palletMesh);

          // 2. Main Box
          const boxMesh = new THREE.Mesh(sharedBoxGeo, isTargetItem ? matTarget : matNormal);
          boxMesh.position.set(posX, posY, posZ);
          rackSubGroup.add(boxMesh);

          // 3. Crisp Edge Outline
          const edgeLines = new THREE.LineSegments(boxEdgeGeo, isTargetItem ? edgeMatTarget : edgeMatNormal);
          edgeLines.position.set(posX, posY, posZ);
          rackSubGroup.add(edgeLines);
        }

        // Fallback target coordinate calculation directly on the rack
        if (isTargetRack && !hasFoundTargetRack) {
          const lvl = targetLvl >= 0 ? Math.min(levels - 1, targetLvl) : 2;
          const col = targetCol >= 0 ? Math.min(numCols - 1, targetCol) : 1;
          const levelBaseY = 0.22 + lvl * levelHeight + 0.04;
          const posX = rx + bayCenters[col];
          const posY = levelBaseY + palletHeight + boxHeight / 2;
          const posZ = rz;
          targetCoords = { x: posX, y: posY + 0.35, z: posZ };
          targetSlotDetail = `Tầng ${lvl + 1} Cột ${col + 1}`;
          hasFoundTargetRack = true;
        }

        racksGroup.add(rackSubGroup);
      });
    });

    // 3D Beacon Pointer for Target Item
    if (currentTarget) {
      const coneGeo = new THREE.ConeGeometry(0.7, 1.6, 16);
      const coneMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });
      const beaconCone = new THREE.Mesh(coneGeo, coneMat);
      beaconCone.rotation.x = Math.PI;
      beaconCone.position.set(targetCoords.x, targetCoords.y + 2.8, targetCoords.z);
      racksGroup.add(beaconCone);
      beaconMeshRef.current = beaconCone;

      const displayLoc = currentTarget.shelfLocation || formatStandardShelfLocation(currentTarget.location, currentTarget.zone) || 'Kệ Mục Tiêu';
      const targetBadge = createLabelSprite(
        displayLoc,
        '#dc2626'
      );
      if (targetBadge) {
        targetBadge.position.set(targetCoords.x, targetCoords.y + 4.2, targetCoords.z);
        targetBadge.scale.set(4.6, 1.15, 1);
        racksGroup.add(targetBadge);
      }

      // 3D Path Route to Target Shelf
      const routePoints: THREE.Vector3[] = [];
      routePoints.push(new THREE.Vector3(dockX, 0.25, -4));
      routePoints.push(new THREE.Vector3(dockX, 0.25, 1));
      routePoints.push(new THREE.Vector3(targetCoords.x, 0.25, 1));
      routePoints.push(new THREE.Vector3(targetCoords.x, 0.25, targetCoords.z));

      const curve = new THREE.CatmullRomCurve3(routePoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 35, 0.14, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      racksGroup.add(tubeMesh);

      targetCamLookAt.current.set(targetCoords.x, targetCoords.y, targetCoords.z);
    } else {
      targetCamLookAt.current.copy(activeCenter);
    }
  }, [populatedRacks, selectedZone, currentTarget, createLabelSprite]);

  // Touch Gesture Handling
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      isDraggingCam.current = true;
      previousTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDraggingCam.current) {
      const deltaX = e.touches[0].clientX - previousTouchPos.current.x;
      const deltaY = e.touches[0].clientY - previousTouchPos.current.y;

      sphericalCoords.current.theta -= deltaX * 0.008;
      sphericalCoords.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2.05, sphericalCoords.current.phi - deltaY * 0.008)
      );

      previousTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const pinchDelta = (touchStartDist.current - currentDist) * 0.05;

      sphericalCoords.current.radius = Math.max(
        10,
        Math.min(65, sphericalCoords.current.radius + pinchDelta)
      );
      touchStartDist.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    isDraggingCam.current = false;
  };

  // Mouse Drag Support
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingCam.current = true;
    previousTouchPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCam.current) return;
    const deltaX = e.clientX - previousTouchPos.current.x;
    const deltaY = e.clientY - previousTouchPos.current.y;

    sphericalCoords.current.theta -= deltaX * 0.006;
    sphericalCoords.current.phi = Math.max(
      0.1,
      Math.min(Math.PI / 2.05, sphericalCoords.current.phi - deltaY * 0.006)
    );

    previousTouchPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingCam.current = false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Zone Switcher Chips Bar */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { id: 'COOL', label: 'Kho Mát (8 Kệ A1-A8)' },
          { id: 'FROZEN', label: 'Đông Lạnh (8 Kệ B1-B8)' },
          { id: 'DRY', label: 'Kho Khô (10 Kệ C1-C10)' },
          { id: 'ALL', label: 'Toàn Kho (26 Kệ)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedZone(tab.id as any)}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: `1.5px solid ${selectedZone === tab.id ? '#0284c7' : '#e2e8f0'}`,
              backgroundColor: selectedZone === tab.id ? '#0284c7' : '#ffffff',
              color: selectedZone === tab.id ? '#ffffff' : '#475569',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxShadow: selectedZone === tab.id ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3D Viewport Box */}
      <div
        style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1.5px solid #1e293b',
          boxShadow: '0 8px 25px rgba(0,0,0,0.18)',
          backgroundColor: '#0b1120',
          height: typeof height === 'number' ? `${height}px` : height,
        }}
      >
        <div
          ref={mountRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
        />

        {/* Real-time Target Item Navigation Badge */}
        {currentTarget && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(10px)',
              padding: '10px 14px',
              borderRadius: '16px',
              border: '1.5px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>
                  CHỖ HÀNG CẦN LẤY TIẾP THEO:
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#ffffff', marginTop: '1px' }}>
                  {currentTarget.shelfLocation || formatStandardShelfLocation(currentTarget.location, currentTarget.zone) || 'Kệ Lưu Trữ'} • {currentTarget.productName || 'Sản phẩm'}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#34d399' }}>
                {currentTarget.quantity} {currentTarget.unit || 'món'}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Số lượng</div>
            </div>
          </div>
        )}

        {/* Bottom Camera Controls Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '4px 8px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              sphericalCoords.current = { radius: 38, theta: Math.PI / 4, phi: Math.PI / 3.2 };
            }}
            style={{
              padding: '5px 8px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Compass size={12} color="#38bdf8" />
            <span>3D Tổng Quan</span>
          </button>

          <button
            onClick={() => {
              sphericalCoords.current = { radius: 14, theta: 0, phi: Math.PI / 2.3 };
            }}
            style={{
              padding: '5px 8px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Eye size={12} color="#34d399" />
            <span>Tiêu Điểm Kệ 5 Tầng</span>
          </button>

          <button
            onClick={() => {
              sphericalCoords.current = { radius: 48, theta: 0, phi: 0.05 };
            }}
            style={{
              padding: '5px 8px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Layers size={12} color="#fbbf24" />
            <span>Mặt Bằng 2D</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              sphericalCoords.current.radius = Math.max(10, sphericalCoords.current.radius - 5);
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => {
              sphericalCoords.current.radius = Math.min(65, sphericalCoords.current.radius + 5);
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ZoomOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
