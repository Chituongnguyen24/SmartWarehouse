import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

export interface ShelfItem3D {
  sku: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  lotCode: string;
  expiryDate: string;
  daysRemaining: number;
  price: number;
  imageUrl?: string;
  shelfLevel?: number;
  slotIndex?: number;
  location?: string;
}

export interface Rack3DData {
  id: string;
  name: string;
  zone: 'COOL' | 'FROZEN' | 'DRY';
  zoneLabel: string;
  temperature: string;
  humidity: string;
  maxCapacity: number;
  currentCapacity: number;
  hasAlert?: boolean;
  alertMsg?: string;
  position: [number, number, number];
  color: string;
  items: ShelfItem3D[];
}

interface Supermarket3DSceneProps {
  racks: Rack3DData[];
  selectedRackId: string;
  onSelectRack: (id: string) => void;
  zoneFilter: 'COOL' | 'FROZEN' | 'DRY';
  onSelectBox?: (item: ShelfItem3D, rack: Rack3DData, level: number) => void;
  onUpdateRackPosition?: (rackId: string, newPos: [number, number, number]) => void;
  searchQuery?: string;
}

// Module-level Singleton Renderer to prevent WebGL Context Leak during Hot-Reload
let globalSharedRenderer: THREE.WebGLRenderer | null = null;

export const Supermarket3DScene: React.FC<Supermarket3DSceneProps> = ({
  racks,
  selectedRackId,
  onSelectRack,
  zoneFilter,
  onSelectBox,
  onUpdateRackPosition,
  searchQuery = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'ISOMETRIC' | 'RACK_FRONT' | 'RACK_BACK' | 'TOP_DOWN' | 'AISLE'>('ISOMETRIC');
  const [isolateRack, setIsolateRack] = useState<boolean>(true);
  const [isLayoutEditMode, setIsLayoutEditMode] = useState<boolean>(false);
  const isLayoutEditModeRef = useRef<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const [hoveredInfo, setHoveredInfo] = useState<{
    type: 'RACK' | 'BOX';
    rack: Rack3DData;
    item?: ShelfItem3D;
    level?: number;
  } | null>(null);

  const [activeBoxModal, setActiveBoxModal] = useState<{
    item: ShelfItem3D;
    rack: Rack3DData;
    level: number;
    slot: number;
  } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rackMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const boxMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number>(0);
  const rebuildAllRacksRef = useRef<((currentRacks: Rack3DData[], activeId: string, currentZone: string) => void) | null>(null);
  const applySearchHighlightRef = useRef<((query: string) => void) | null>(null);

  // Cold Frost Mist Particle System Ref
  const mistParticlesRef = useRef<THREE.Points | null>(null);

  // References for live props without remounting WebGL
  const zoneFilterRef = useRef<'COOL' | 'FROZEN' | 'DRY'>(zoneFilter);
  const selectedRackIdRef = useRef<string>(selectedRackId);
  const racksRef = useRef<Rack3DData[]>(racks);
  const searchQueryRef = useRef<string>(searchQuery);
  const onSelectRackRef = useRef(onSelectRack);
  const onSelectBoxRef = useRef(onSelectBox);
  const onUpdateRackPositionRef = useRef(onUpdateRackPosition);

  // Sync refs
  useEffect(() => {
    isLayoutEditModeRef.current = isLayoutEditMode;
  }, [isLayoutEditMode]);

  useEffect(() => {
    zoneFilterRef.current = zoneFilter;
    selectedRackIdRef.current = selectedRackId;
    racksRef.current = racks;
    searchQueryRef.current = searchQuery;
    onSelectRackRef.current = onSelectRack;
    onSelectBoxRef.current = onSelectBox;
    onUpdateRackPositionRef.current = onUpdateRackPosition;
  }, [zoneFilter, selectedRackId, racks, searchQuery, onSelectRack, onSelectBox, onUpdateRackPosition]);

  // Mouse Orbiting / Drag State
  const isDraggingCam = useRef(false);
  const isPanningCam = useRef(false);
  const isDraggingRack = useRef(false);
  const draggedRackId = useRef<string | null>(null);
  const draggedRackGroup = useRef<THREE.Group | null>(null);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragIntersection = useRef(new THREE.Vector3());

  const previousMousePos = useRef({ x: 0, y: 0 });
  const sphericalCoords = useRef({ radius: 26, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const cameraTarget = useRef(new THREE.Vector3(0, 2.0, 0));

  // Target camera interpolations
  const targetCamPos = useRef(new THREE.Vector3(16, 18, 18));
  const targetCamLookAt = useRef(new THREE.Vector3(0, 2.0, 0));
  const currentCamLookAt = useRef(new THREE.Vector3(0, 2.0, 0));

  // Raycaster
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const searchHighlightMeshesRef = useRef<THREE.Object3D[]>([]);

  // Room Wall & Floor Refs for dynamic themes
  const floorMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wallMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wallLineMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const roomLightRef = useRef<THREE.PointLight | null>(null);

  // Helper: Create 3D Text Billboard
  const createTextSprite = (text: string, bgColor: string, textColor: string = '#ffffff') => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 104, 16);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 32px "Segoe UI", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 60);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4.0, 0.95, 1);
    return sprite;
  };

  // Helper: Create 3D Front Label for Lot Box WITH CLEAR BARCODE AND LOT CODE
  const createLotBoxLabelTexture = (it: ShelfItem3D) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const isNear = (it.daysRemaining ?? 10) <= 3;
    const isMed = (it.daysRemaining ?? 10) > 3 && (it.daysRemaining ?? 10) <= 7;

    // Card background
    ctx.fillStyle = isNear ? '#450a0a' : '#0f172a';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 304, 20);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = isNear ? '#ef4444' : isMed ? '#f59e0b' : '#38bdf8';
    ctx.stroke();

    // 1. Draw Real-looking Barcode Box in Top Left
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(20, 18, 175, 54, 8);
    ctx.fill();

    // Barcode stripes (Code 128 simulation)
    ctx.fillStyle = '#000000';
    const barPattern = [3, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 3, 1, 2, 4, 2, 1, 3, 2, 4, 2];
    let curX = 26;
    barPattern.forEach((w, bIdx) => {
      if (bIdx % 2 === 0) {
        ctx.fillRect(curX, 22, w, 36);
      }
      curX += w + 2;
    });

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(it.sku, 107, 68);

    // 2. Lot Code Title
    ctx.fillStyle = isNear ? '#fca5a5' : '#38bdf8';
    ctx.font = 'bold 23px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LÔ: ${it.lotCode.length > 17 ? it.lotCode.slice(0, 16) + '..' : it.lotCode}`, 205, 42);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText(`BARCODE: ${it.sku}`, 205, 64);

    // 3. Product Name (Large & Crisp)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 29px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    const truncatedName = it.name.length > 20 ? it.name.slice(0, 19) + '...' : it.name;
    ctx.fillText(truncatedName, 22, 115);

    // 4. Quantity & Price Row
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillText(`TỒN: ${it.qty} ${it.unit}`, 22, 168);

    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'right';
    ctx.fillText(`${it.price.toLocaleString('vi-VN')} đ`, 490, 168);

    // 5. Expiry Status Banner
    ctx.fillStyle = isNear ? '#dc2626' : isMed ? '#d97706' : '#0284c7';
    ctx.beginPath();
    ctx.roundRect(22, 205, 468, 88, 14);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const expText = isNear
      ? `⚠️ CẬN DATE: Còn ${it.daysRemaining} ngày`
      : `HSD: ${it.expiryDate} (Còn ${it.daysRemaining} ngày)`;
    ctx.fillText(expText, 256, 258);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // Mount Effect: Run ONCE with Singleton WebGL Engine
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 850;
    const height = container.clientHeight || 580;

    let renderer = globalSharedRenderer;

    if (!renderer) {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: 'default',
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        globalSharedRenderer = renderer;
      } catch (err: any) {
        console.error('WebGL Renderer Init Error:', err);
        setWebglError(err?.message || 'Trình duyệt chưa bật tăng tốc phần cứng WebGL');
        return;
      }
    }

    renderer.setSize(width, height);

    // Attach singleton canvas to container
    if (renderer.domElement.parentElement !== container) {
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    }
    setWebglError(null);

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x081528);
    scene.fog = new THREE.FogExp2(0x081528, 0.015);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(16, 18, 18);
    camera.lookAt(0, 2.0, 0);
    cameraRef.current = camera;

    // 3. PBR Cinematic Industrial Lighting Environment
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainSunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainSunLight.position.set(15, 25, 15);
    mainSunLight.castShadow = true;
    mainSunLight.shadow.mapSize.width = 1024;
    mainSunLight.shadow.mapSize.height = 1024;
    mainSunLight.shadow.bias = -0.0005;
    scene.add(mainSunLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fillLight.position.set(-15, 15, -15);
    scene.add(fillLight);

    // Overhead High-Bay Industrial Spotlights
    const roomAccentLight = new THREE.PointLight(0x0284c7, 3.5, 45, 1.2);
    roomAccentLight.position.set(0, 10, 0);
    scene.add(roomAccentLight);
    roomLightRef.current = roomAccentLight;

    // 4. Warehouse Room Frame (34m x 38m x 6.0m) - Mega Multi-Aisle Layout
    const roomW = 34;
    const roomD = 38;
    const roomH = 6.0;

    // PBR Glossy Industrial Epoxy Floor with Reflections
    const floorGeo = new THREE.PlaneGeometry(roomW, roomD);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c1e38,
      roughness: 0.16,
      metalness: 0.12,
    });
    floorMatRef.current = floorMat;
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Safety Hazard Walkway Border Lines
    const safetyLineGeo = new THREE.RingGeometry(15.8, 16.0, 4);
    const safetyLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
    const safetyLine = new THREE.Mesh(safetyLineGeo, safetyLineMat);
    safetyLine.rotation.x = -Math.PI / 2;
    safetyLine.rotation.z = Math.PI / 4;
    safetyLine.position.y = 0.015;
    scene.add(safetyLine);

    // Subtle High-Tech Floor Grid
    const gridHelper = new THREE.GridHelper(roomD, 38, 0x1e3a5f, 0x0f2942);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // PBR Translucent Wall Panels
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    wallMatRef.current = wallMat;

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    backWall.position.set(0, roomH / 2, -roomD / 2);
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-roomW / 2, roomH / 2, 0);
    scene.add(leftWall);

    // Wall Frame Lines
    const wallLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    wallLineMatRef.current = wallLineMat;
    const wallEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(roomW, roomH, roomD)),
      wallLineMat
    );
    wallEdges.position.y = roomH / 2;
    scene.add(wallEdges);

    // 5. Cold Frost Mist Particle System
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 24;
      particlePositions[i + 1] = 0.2 + Math.random() * 3.5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 18;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.22,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    const mistParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(mistParticles);
    mistParticlesRef.current = mistParticles;

    // High-Performance Shared Geometries & Materials (Saves >90% RAM/VRAM)
    const matNormal = new THREE.MeshStandardMaterial({ color: 0xb48256, roughness: 0.7, metalness: 0.05 });
    const matNearExpiry = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6, metalness: 0.05 });
    const matMediumRisk = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.6, metalness: 0.05 });
    const matSearch = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, metalness: 0.1 });

    // 6. Dynamic Rack Builder with PBR Steel & Kraft Carton Boxes
    const rebuildAllRacks = (currentRacks: Rack3DData[], activeId: string, currentZone: string) => {
      rackMeshesRef.current.forEach((group) => {
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
        scene.remove(group);
      });
      boxMeshesRef.current = [];
      searchHighlightMeshesRef.current = [];

      const filteredZoneRacks = currentRacks.filter((r) => r.zone === currentZone);

      filteredZoneRacks.forEach((rack) => {
        const rackGroup = new THREE.Group();
        rackGroup.name = rack.id;
        rackGroup.position.set(rack.position[0], 0, rack.position[2]);

        const itemsList = rack.items || [];
        const isSelected = rack.id === activeId;

        const rackWidth = 5.6;
        const rackDepth = 1.5;
        const rackHeight = 4.9;
        const levels = 5;
        const levelHeight = 0.92;

        // PBR Upright Blue Steel Columns with Middle Support (Industrial 3-Bay Heavy Duty Rack)
        const postGeo = new THREE.BoxGeometry(0.12, rackHeight, 0.12);
        const postMat = new THREE.MeshStandardMaterial({
          color: 0x1e3a8a,
          metalness: 0.88,
          roughness: 0.28,
        });

        const postXPos = [-rackWidth / 2, -rackWidth / 6, rackWidth / 6, rackWidth / 2];
        const postZPos = [-rackDepth / 2, rackDepth / 2];

        postXPos.forEach((px) => {
          postZPos.forEach((pz) => {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(px, rackHeight / 2, pz);
            post.castShadow = true;
            post.receiveShadow = true;
            rackGroup.add(post);
          });
        });

        // Diagonal Cross-Bracing Steel Bars on Left, Middle and Right
        const braceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
        const sideBraceGeo = new THREE.BoxGeometry(0.04, 4.4, 0.04);
        [-rackWidth / 2, rackWidth / 2].forEach((px, bIdx) => {
          const brace = new THREE.Mesh(sideBraceGeo, braceMat);
          brace.position.set(px, rackHeight / 2, 0);
          brace.rotation.x = (bIdx === 0 ? 1 : -1) * (Math.PI / 8);
          rackGroup.add(brace);
        });

        // PBR High-Visibility Load Beams and Heavy Mesh Decking on All 5 Tiers
        const beamMat = new THREE.MeshStandardMaterial({
          color: rack.zone === 'COOL' ? 0x0284c7 : rack.zone === 'FROZEN' ? 0x0891b2 : 0xea580c,
          metalness: 0.75,
          roughness: 0.3,
        });

        for (let lvl = 0; lvl <= levels; lvl++) {
          const y = 0.22 + lvl * levelHeight;
          const beamFront = new THREE.Mesh(new THREE.BoxGeometry(rackWidth + 0.12, 0.09, 0.06), beamMat);
          beamFront.position.set(0, y, rackDepth / 2);
          beamFront.castShadow = true;
          
          const beamBack = new THREE.Mesh(new THREE.BoxGeometry(rackWidth + 0.12, 0.09, 0.06), beamMat);
          beamBack.position.set(0, y, -rackDepth / 2);
          beamBack.castShadow = true;

          const deckingGeo = new THREE.BoxGeometry(rackWidth, 0.02, rackDepth - 0.08);
          const deckingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 });
          const decking = new THREE.Mesh(deckingGeo, deckingMat);
          decking.position.set(0, y + 0.03, 0);
          decking.receiveShadow = true;

          rackGroup.add(beamFront, beamBack, decking);
        }

        // 3D Billboard Sign
        const spriteSign = createTextSprite(
          `${rack.id.replace('RACK-', '')} - ${rack.name.split('(')[0]} (${itemsList.length} Lô)`,
          rack.hasAlert ? '#dc2626' : rack.zone === 'COOL' ? '#0284c7' : rack.zone === 'FROZEN' ? '#0891b2' : '#d97706'
        );
        if (spriteSign) {
          spriteSign.position.set(0, rackHeight + 0.65, 0);
          rackGroup.add(spriteSign);
        }

        // Active Ring Base when selected
        if (isSelected) {
          const ringGeo = new THREE.RingGeometry(2.8, 3.3, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.03;
          rackGroup.add(ring);
        }

        // Standard 5-Tier x 8-Column Industrial Rack Grid
        const numCols = 8; // Fixed 8 structural columns per tier
        const colSpacing = (rackWidth - 0.4) / numCols;
        const boxWidth = Math.min(0.55, colSpacing - 0.05);
        const boxDepth = (rackDepth - 0.25) / 2 - 0.04; // Double deep depth
        const sharedBoxGeo = new THREE.BoxGeometry(boxWidth, 0.38, boxDepth);

        const totalCells = levels * numCols * 2; // 5 Tiers x 8 Columns x 2 Sides = 80 Cells
        const cellOccupancy = new Map<string, number>();

        itemsList.forEach((it, idx) => {
          // Evenly distribute across 5 Tiers x 8 Columns x 2 Sides = 80 distinct rack cells
          const cellSlot = idx % totalCells;
          const lvl = Math.floor(cellSlot / (numCols * 2)) % levels;
          const col = cellSlot % numCols;
          const rowDeep = Math.floor(cellSlot / numCols) % 2; // 0 = back, 1 = front

          const cellKey = `${lvl}-${col}-${rowDeep}`;
          const stackCount = cellOccupancy.get(cellKey) || 0;
          cellOccupancy.set(cellKey, stackCount + 1);

          const boxHeight = 0.38;
          const levelBaseY = 0.22 + lvl * levelHeight + 0.04;
          const stackOffset = Math.min(2, stackCount);
          const posY = levelBaseY + (boxHeight / 2) + stackOffset * (boxHeight * 0.4);

          const startX = -((numCols - 1) * colSpacing) / 2;
          const posZOffset = (stackCount % 2 === 1 ? 0.03 : -0.03) * (stackCount > 0 ? 1 : 0);
          const posX = startX + col * colSpacing + (stackCount > 1 ? 0.02 : 0);
          const posZ = (rowDeep === 0 ? -rackDepth * 0.24 : rackDepth * 0.24) + posZOffset;

          const isNearExpiry = (it.daysRemaining ?? 10) <= 3;
          const isMediumRisk = (it.daysRemaining ?? 10) > 3 && (it.daysRemaining ?? 10) <= 7;
          const defaultMat = isNearExpiry ? matNearExpiry : isMediumRisk ? matMediumRisk : matNormal;

          const boxMesh = new THREE.Mesh(sharedBoxGeo, defaultMat);
          boxMesh.castShadow = true;
          boxMesh.receiveShadow = true;
          boxMesh.position.set(posX, posY, posZ);

          boxMesh.userData = {
            isProductBox: true,
            rack: rack,
            item: it,
            level: lvl + 1,
            slot: col + 1,
            rowDeep: rowDeep === 1 ? 'Trước' : 'Sau',
            stackLayer: stackCount + 1,
            originalMat: defaultMat,
            boxWidth,
            boxDepth,
            posX,
            posY,
            posZ,
          };

          rackGroup.add(boxMesh);
          boxMeshesRef.current.push(boxMesh);
        });

        // Hitbox for Rack Selection & Dragging
        const hitBoxGeo = new THREE.BoxGeometry(rackWidth + 0.4, rackHeight + 0.6, rackDepth + 0.4);
        const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
        hitBox.position.y = rackHeight / 2;
        hitBox.userData = { isRackHitbox: true, rackData: rack };
        rackGroup.add(hitBox);

        scene.add(rackGroup);
        rackMeshesRef.current.set(rack.id, rackGroup);
      });

      // Apply initial search highlight if query exists
      if (searchQueryRef.current) {
        applySearchHighlight(searchQueryRef.current);
      }
    };

    // Ultra-Fast In-Memory Search Highlighter (<1ms without WebGL rebuild)
    const applySearchHighlight = (query: string) => {
      // Clear previous search wireframes and billboard pins
      searchHighlightMeshesRef.current.forEach((m) => {
        if (m.parent) {
          m.parent.remove(m);
        }
        if ((m as THREE.Mesh).geometry) {
          (m as THREE.Mesh).geometry.dispose();
        }
      });
      searchHighlightMeshesRef.current = [];

      const q = (query || '').trim().toLowerCase();
      let firstMatchedWorldPos: THREE.Vector3 | null = null;

      boxMeshesRef.current.forEach((boxMesh) => {
        const it = boxMesh.userData?.item as ShelfItem3D | undefined;
        const origMat = boxMesh.userData?.originalMat || matNormal;
        if (!it) return;

        const isMatched = q.length > 0 && (
          it.lotCode.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          it.name.toLowerCase().includes(q)
        );

        if (isMatched) {
          boxMesh.material = matSearch;

          const lvl = boxMesh.userData.level;
          const col = boxMesh.userData.slot;
          const rowDeep = boxMesh.userData.rowDeep;
          const posX = boxMesh.userData.posX ?? boxMesh.position.x;
          const posY = boxMesh.userData.posY ?? boxMesh.position.y;
          const posZ = boxMesh.userData.posZ ?? boxMesh.position.z;
          const bW = boxMesh.userData.boxWidth || 0.55;
          const bD = boxMesh.userData.boxDepth || 0.55;

          const glowGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(bW * 1.08, 0.44, bD * 1.08));
          const glowMat = new THREE.LineBasicMaterial({ color: 0xfacc15 });
          const glowBox = new THREE.LineSegments(glowGeo, glowMat);
          glowBox.position.set(posX, posY, posZ);
          if (boxMesh.parent) {
            boxMesh.parent.add(glowBox);
            searchHighlightMeshesRef.current.push(glowBox);
          }

          const pointerPin = createTextSprite(
            `📍 ${it.lotCode} • T${lvl}-C${col} (${rowDeep})`,
            '#eab308',
            '#0f172a'
          );
          if (pointerPin && boxMesh.parent) {
            pointerPin.scale.set(3.4, 0.8, 1);
            pointerPin.position.set(posX, posY + 0.55, posZ);
            boxMesh.parent.add(pointerPin);
            searchHighlightMeshesRef.current.push(pointerPin);
          }

          if (!firstMatchedWorldPos) {
            const wp = new THREE.Vector3();
            boxMesh.getWorldPosition(wp);
            firstMatchedWorldPos = wp;
          }
        } else {
          boxMesh.material = origMat;
        }
      });

      // Fly Camera to first searched lot box in 3D smoothly
      if (firstMatchedWorldPos) {
        cameraTarget.current.set(firstMatchedWorldPos.x, firstMatchedWorldPos.y, firstMatchedWorldPos.z);
        targetCamLookAt.current.copy(cameraTarget.current);
        targetCamPos.current.set(
          firstMatchedWorldPos.x + (firstMatchedWorldPos.x >= 0 ? 3.5 : -3.5),
          firstMatchedWorldPos.y + 2.0,
          firstMatchedWorldPos.z + 4.2
        );
      }
    };

    rebuildAllRacksRef.current = rebuildAllRacks;
    applySearchHighlightRef.current = applySearchHighlight;
    rebuildAllRacks(racksRef.current, selectedRackIdRef.current, zoneFilterRef.current);

    // 8. Mouse Orbit & Drag Controls
    const handleMouseDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      if (isLayoutEditModeRef.current && e.button === 0) {
        for (const hit of intersects) {
          if (hit.object.userData?.isRackHitbox) {
            const rackData = hit.object.userData.rackData as Rack3DData;
            isDraggingRack.current = true;
            draggedRackId.current = rackData.id;
            draggedRackGroup.current = rackMeshesRef.current.get(rackData.id) || null;
            onSelectRackRef.current(rackData.id);
            container.style.cursor = 'move';
            return;
          }
        }
      }

      if (e.button === 0) {
        isDraggingCam.current = true;
        previousMousePos.current = { x: e.clientX, y: e.clientY };
      } else if (e.button === 2) {
        isPanningCam.current = true;
        previousMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      if (isDraggingRack.current && draggedRackGroup.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        if (raycasterRef.current.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
          const clampedX = Math.max(-11, Math.min(11, dragIntersection.current.x));
          const clampedZ = Math.max(-8, Math.min(8, dragIntersection.current.z));
          draggedRackGroup.current.position.x = clampedX;
          draggedRackGroup.current.position.z = clampedZ;
        }
        return;
      }

      if (isDraggingCam.current) {
        const deltaX = e.clientX - previousMousePos.current.x;
        const deltaY = e.clientY - previousMousePos.current.y;
        previousMousePos.current = { x: e.clientX, y: e.clientY };

        sphericalCoords.current.theta -= deltaX * 0.008;
        sphericalCoords.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalCoords.current.phi - deltaY * 0.008));
        updateCameraFromSpherical();
        return;
      }

      if (isPanningCam.current) {
        const deltaX = e.clientX - previousMousePos.current.x;
        const deltaY = e.clientY - previousMousePos.current.y;
        previousMousePos.current = { x: e.clientX, y: e.clientY };

        cameraTarget.current.x -= deltaX * 0.04;
        cameraTarget.current.z -= deltaY * 0.04;
        updateCameraFromSpherical();
        return;
      }

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      let foundBox: any = null;
      let foundRack: any = null;

      for (const hit of intersects) {
        if (hit.object.userData?.isProductBox) {
          foundBox = hit.object;
          break;
        } else if (hit.object.userData?.isRackHitbox) {
          foundRack = hit.object.userData.rackData;
        }
      }

      if (foundBox) {
        setHoveredInfo({
          type: 'BOX',
          rack: foundBox.userData.rack,
          item: foundBox.userData.item,
          level: foundBox.userData.level,
        });
        container.style.cursor = 'pointer';
      } else if (foundRack) {
        setHoveredInfo({
          type: 'RACK',
          rack: foundRack,
        });
        container.style.cursor = isLayoutEditModeRef.current ? 'grab' : 'pointer';
      } else {
        setHoveredInfo(null);
        container.style.cursor = 'default';
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRack.current && draggedRackId.current && draggedRackGroup.current) {
        const finalPos: [number, number, number] = [
          draggedRackGroup.current.position.x,
          0,
          draggedRackGroup.current.position.z,
        ];
        if (onUpdateRackPositionRef.current) {
          onUpdateRackPositionRef.current(draggedRackId.current, finalPos);
        }
        isDraggingRack.current = false;
        draggedRackId.current = null;
        draggedRackGroup.current = null;
      }
      isDraggingCam.current = false;
      isPanningCam.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalCoords.current.radius = Math.max(8, Math.min(60, sphericalCoords.current.radius + e.deltaY * 0.03));
      updateCameraFromSpherical();
    };

    const handleClick = (e: MouseEvent) => {
      if (isLayoutEditModeRef.current) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        if (hit.object.userData?.isProductBox) {
          const u = hit.object.userData;
          onSelectRackRef.current(u.rack.id);

          setActiveBoxModal({
            item: u.item,
            rack: u.rack,
            level: u.level,
            slot: u.slot,
          });

          if (onSelectBoxRef.current) {
            onSelectBoxRef.current(u.item, u.rack, u.level);
          }

          const worldPos = new THREE.Vector3();
          hit.object.getWorldPosition(worldPos);
          cameraTarget.current.copy(worldPos);
          sphericalCoords.current.radius = 10;
          updateCameraFromSpherical();
          return;
        }

        if (hit.object.userData?.isRackHitbox) {
          const r = hit.object.userData.rackData as Rack3DData;
          onSelectRackRef.current(r.id);
          cameraTarget.current.set(r.position[0], 2.0, r.position[2]);
          sphericalCoords.current.radius = 14;
          updateCameraFromSpherical();
          return;
        }
      }
    };

    const updateCameraFromSpherical = () => {
      const { radius, theta, phi } = sphericalCoords.current;
      targetCamPos.current.x = cameraTarget.current.x + radius * Math.sin(phi) * Math.sin(theta);
      targetCamPos.current.y = cameraTarget.current.y + radius * Math.cos(phi);
      targetCamPos.current.z = cameraTarget.current.z + radius * Math.sin(phi) * Math.cos(theta);
      targetCamLookAt.current.copy(cameraTarget.current);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    // 7. Animation Loop
    let timeTick = 0;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      timeTick += 0.015;

      camera.position.lerp(targetCamPos.current, 0.08);
      currentCamLookAt.current.lerp(targetCamLookAt.current, 0.08);
      camera.lookAt(currentCamLookAt.current);

      // Pulsing Animation for 3D Search Highlights
      searchHighlightMeshesRef.current.forEach((m, mIdx) => {
        if ((m as THREE.LineSegments).isLineSegments) {
          const scale = 1.0 + 0.08 * Math.sin(timeTick * 7 + mIdx);
          m.scale.set(scale, scale, scale);
        }
      });

      if (mistParticlesRef.current) {
        const positions = mistParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 0.005;
          if (positions[i] > 3.8) {
            positions[i] = 0.2;
          }
        }
        mistParticlesRef.current.geometry.attributes.position.needsUpdate = true;
        mistParticlesRef.current.rotation.y = timeTick * 0.05;
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (renderer) {
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('click', handleClick);
    };
  }, []);

  // Update Theme & Racks when zoneFilter, racks, selectedRackId, or searchQuery change
  useEffect(() => {
    if (!sceneRef.current) return;

    const bgColor = zoneFilter === 'COOL' ? 0x081528 : zoneFilter === 'FROZEN' ? 0x051b26 : 0x1a1208;
    sceneRef.current.background = new THREE.Color(bgColor);
    if (sceneRef.current.fog) {
      sceneRef.current.fog.color = new THREE.Color(bgColor);
    }

    if (floorMatRef.current) {
      floorMatRef.current.color.set(
        zoneFilter === 'COOL' ? 0x0c1e38 : zoneFilter === 'FROZEN' ? 0x082230 : 0x22180d
      );
    }
    if (wallMatRef.current) {
      wallMatRef.current.color.set(
        zoneFilter === 'COOL' ? 0x0369a1 : zoneFilter === 'FROZEN' ? 0x0891b2 : 0xd97706
      );
    }
    if (wallLineMatRef.current) {
      wallLineMatRef.current.color.set(
        zoneFilter === 'COOL' ? 0x38bdf8 : zoneFilter === 'FROZEN' ? 0x22d3ee : 0xfbbf24
      );
    }
    if (roomLightRef.current) {
      roomLightRef.current.color.set(
        zoneFilter === 'COOL' ? 0x0284c7 : zoneFilter === 'FROZEN' ? 0x06b6d4 : 0xf59e0b
      );
    }

    if (mistParticlesRef.current) {
      mistParticlesRef.current.visible = zoneFilter === 'FROZEN' || zoneFilter === 'COOL';
    }

    if (rebuildAllRacksRef.current) {
      rebuildAllRacksRef.current(racks, selectedRackId, zoneFilter);
    }
  }, [zoneFilter, racks, selectedRackId]);

  // Ultra-fast search highlight trigger without scene rebuilding
  useEffect(() => {
    searchQueryRef.current = searchQuery;
    if (applySearchHighlightRef.current) {
      applySearchHighlightRef.current(searchQuery);
    }
  }, [searchQuery]);

  // Update View Modes Presets
  const currentSelectedRack = useMemo(() => {
    return racks.find(r => r.id === selectedRackId) || racks[0];
  }, [racks, selectedRackId]);

  useEffect(() => {
    if (!cameraRef.current) return;
    const sel = currentSelectedRack;
    const isInspectingSingleRack = viewMode === 'RACK_FRONT' || viewMode === 'RACK_BACK';

    // Isolate rack visibility: Hide surrounding racks when inspecting front/back to prevent obstruction
    rackMeshesRef.current.forEach((group, rackId) => {
      if (isInspectingSingleRack && isolateRack) {
        group.visible = (rackId === selectedRackId);
      } else {
        group.visible = true;
      }
    });

    if (viewMode === 'ISOMETRIC') {
      cameraTarget.current.set(0, 2.0, 0);
      sphericalCoords.current = { radius: 26, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    } else if (viewMode === 'RACK_FRONT') {
      if (sel) {
        cameraTarget.current.set(sel.position[0], 2.4, sel.position[2]);
        sphericalCoords.current = { radius: 6.8, theta: 0, phi: Math.PI / 2.05 };
      }
    } else if (viewMode === 'RACK_BACK') {
      if (sel) {
        cameraTarget.current.set(sel.position[0], 2.4, sel.position[2]);
        sphericalCoords.current = { radius: 6.8, theta: Math.PI, phi: Math.PI / 2.05 };
      }
    } else if (viewMode === 'TOP_DOWN') {
      cameraTarget.current.set(0, 0, 0);
      sphericalCoords.current = { radius: 30, theta: 0, phi: 0.05 };
    } else if (viewMode === 'AISLE') {
      cameraTarget.current.set(-4, 1.8, 0);
      sphericalCoords.current = { radius: 10, theta: Math.PI / 2, phi: Math.PI / 2.2 };
    }

    const { radius, theta, phi } = sphericalCoords.current;
    targetCamPos.current.x = cameraTarget.current.x + radius * Math.sin(phi) * Math.sin(theta);
    targetCamPos.current.y = cameraTarget.current.y + radius * Math.cos(phi);
    targetCamPos.current.z = cameraTarget.current.z + radius * Math.sin(phi) * Math.cos(theta);
    targetCamLookAt.current.copy(cameraTarget.current);
  }, [viewMode, selectedRackId, racks, currentSelectedRack, isolateRack]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '580px', borderRadius: '20px', overflow: 'hidden', userSelect: 'none', backgroundColor: '#081528' }}>
      
      {/* WebGL Canvas Container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', display: webglError ? 'none' : 'block' }} />

      {/* WebGL GPU Recovery Guide HUD if Context was disabled in Browser */}
      {webglError && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
            textAlign: 'center',
            backgroundColor: '#0a192f',
            color: '#ffffff',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#facc15', margin: '0 0 10px' }}>
            Trình Duyệt Đang Tạm Khóa Tăng Tốc Đồ Họa 3D WebGL
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '600px', lineHeight: '1.6', margin: '0 0 20px' }}>
            Do trình duyệt Chrome/Edge của bạn vừa kích hoạt cờ an toàn <b>GL_VENDOR = Disabled</b> sau một lần crash GPU hoặc tắt tính năng tăng tốc phần cứng.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                globalSharedRenderer = null;
                window.location.reload();
              }}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🔄 Tải Lại và Khởi Chạy 3D Ngay
            </button>
            <button
              onClick={() => window.open('chrome://settings/system', '_blank')}
              style={{
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #38bdf8',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ⚙️ Mở Cài Đặt GPU Trình Duyệt
            </button>
          </div>
        </div>
      )}

      {/* View Presets & Edit Layout Mode Bar */}
      {!webglError && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            gap: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: '6px',
            borderRadius: '14px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            zIndex: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            flexWrap: 'wrap',
          }}
        >
          {/* Front Face Button */}
          <button
            onClick={() => setViewMode('RACK_FRONT')}
            title="Góc nhìn trực diện mặt trước của kệ"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: viewMode === 'RACK_FRONT' ? '#0284c7' : 'transparent',
              color: viewMode === 'RACK_FRONT' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            👁️ Mặt Trước ({currentSelectedRack ? currentSelectedRack.name.split('(')[0].trim() : 'Kệ'})
          </button>

          {/* Back Face Button */}
          <button
            onClick={() => setViewMode('RACK_BACK')}
            title="Góc nhìn trực diện mặt sau (hàng sâu) của kệ"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: viewMode === 'RACK_BACK' ? '#0891b2' : 'transparent',
              color: viewMode === 'RACK_BACK' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            🔄 Mặt Sau (Hàng Sâu)
          </button>

          {/* Toggle Isolate Rack Button (Visible during front/back inspection) */}
          {(viewMode === 'RACK_FRONT' || viewMode === 'RACK_BACK') && (
            <button
              onClick={() => setIsolateRack(!isolateRack)}
              title={isolateRack ? 'Đang ẩn các dãy kệ khác để không bị che khuất tầm nhìn' : 'Hiển thị lại toàn bộ các dãy kệ xung quanh'}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: isolateRack ? '1px solid #38bdf8' : '1px solid #64748b',
                fontSize: '11.5px',
                fontWeight: 900,
                cursor: 'pointer',
                backgroundColor: isolateRack ? 'rgba(2, 132, 199, 0.45)' : '#1e293b',
                color: isolateRack ? '#38bdf8' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
              }}
            >
              <span>{isolateRack ? '✨ Đang Ẩn Kệ Khác (Không Bị Che)' : '🏢 Hiện Lại Toàn Bộ Kệ'}</span>
            </button>
          )}

          {/* Isometric Overview */}
          <button
            onClick={() => setViewMode('ISOMETRIC')}
            title="Góc nhìn 3D toàn cảnh nhà kho"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: viewMode === 'ISOMETRIC' ? '#0284c7' : 'transparent',
              color: viewMode === 'ISOMETRIC' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            🌐 Toàn Cảnh
          </button>

          {/* Top Down View */}
          <button
            onClick={() => setViewMode('TOP_DOWN')}
            title="Góc nhìn 2D từ trần kho nhìn xuống"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: viewMode === 'TOP_DOWN' ? '#0284c7' : 'transparent',
              color: viewMode === 'TOP_DOWN' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            🗺️ Mặt Bằng
          </button>

          {/* Aisle Walkway View */}
          <button
            onClick={() => setViewMode('AISLE')}
            title="Góc nhìn dọc theo lối đi giữa các dãy kệ"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: viewMode === 'AISLE' ? '#0284c7' : 'transparent',
              color: viewMode === 'AISLE' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            🚶 Lối Đi
          </button>

          {/* Drag & Drop Rack Toggle */}
          <button
            onClick={() => setIsLayoutEditMode(!isLayoutEditMode)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: isLayoutEditMode ? '1px solid #22c55e' : '1px solid #475569',
              fontSize: '11.5px',
              fontWeight: 900,
              cursor: 'pointer',
              backgroundColor: isLayoutEditMode ? '#15803d' : '#1e293b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: isLayoutEditMode ? '0 0 15px rgba(34, 197, 94, 0.5)' : 'none',
            }}
          >
            <span>{isLayoutEditMode ? '✅ Đang Kéo Thả Kệ' : '🛠️ Kéo Thả Sắp Xếp Kệ'}</span>
          </button>
        </div>
      )}

      {/* Guide Badge */}
      {!webglError && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: '6px 12px',
            borderRadius: '10px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            fontSize: '11px',
            color: isLayoutEditMode ? '#4ade80' : '#38bdf8',
            fontWeight: 700,
            zIndex: 10,
            display: 'flex',
            gap: '10px',
          }}
        >
          {isLayoutEditMode ? (
            <span>✋ Giữ chuột trái vào Kệ để kéo thả di chuyển vị trí trong kho!</span>
          ) : (
            <>
              <span>❄️ Hiệu Ứng Sương Khói PBR</span>
              <span>📦 Thùng Kraft Barcode</span>
            </>
          )}
        </div>
      )}

      {/* Hover Tooltip HUD */}
      {hoveredInfo && !isDraggingRack.current && !webglError && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1.5px solid #38bdf8',
            padding: '10px 14px',
            borderRadius: '12px',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: '240px',
          }}
        >
          {hoveredInfo.type === 'BOX' && hoveredInfo.item ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: '#0284c7', padding: '2px 6px', borderRadius: '4px' }}>
                  {hoveredInfo.item.sku}
                </span>
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  Tầng {hoveredInfo.level} ({hoveredInfo.rack.id})
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '4px', color: '#ffffff' }}>
                {hoveredInfo.item.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                <span>Tồn: <b>{hoveredInfo.item.qty} {hoveredInfo.item.unit}</b></span>
                <span style={{ color: (hoveredInfo.item.daysRemaining ?? 10) <= 3 ? '#f87171' : '#34d399', fontWeight: 800 }}>
                  HSD: {hoveredInfo.item.expiryDate} (Còn {hoveredInfo.item.daysRemaining} ngày)
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>{hoveredInfo.rack.id}</div>
              <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '2px' }}>{hoveredInfo.rack.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>Nhiệt độ: <b style={{ color: '#ffffff' }}>{hoveredInfo.rack.temperature}</b></span>
                <span>Sức chứa: <b style={{ color: '#34d399' }}>{hoveredInfo.rack.currentCapacity}/{hoveredInfo.rack.maxCapacity}</b></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAMING HUD: MODAL X-RAY THÔNG TIN CHI TIẾT */}
      {activeBoxModal && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '16px',
            width: '330px',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            borderRadius: '16px',
            border: '2px solid #38bdf8',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 25px rgba(56, 189, 248, 0.3)',
            backdropFilter: 'blur(12px)',
            padding: '18px',
            color: '#ffffff',
            zIndex: 30,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: '#0369a1', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                  {activeBoxModal.rack.id}
                </span>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>
                  TẦNG {activeBoxModal.level} • VỊ TRÍ {activeBoxModal.slot}
                </span>
              </div>
              <h4 style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>
                {activeBoxModal.item.name}
              </h4>
            </div>
            <button
              onClick={() => setActiveBoxModal(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Mã Barcode SKU:</span>
              <b style={{ color: '#f8fafc' }}>{activeBoxModal.item.sku}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Mã số Lô (Lot Code):</span>
              <b style={{ color: '#38bdf8' }}>{activeBoxModal.item.lotCode}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Số lượng tồn trong thùng:</span>
              <b style={{ color: '#34d399' }}>{activeBoxModal.item.qty} {activeBoxModal.item.unit}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Đơn giá niêm yết:</span>
              <b style={{ color: '#fbbf24' }}>{activeBoxModal.item.price.toLocaleString('vi-VN')} đ</b>
            </div>

            <div style={{ backgroundColor: activeBoxModal.item.daysRemaining <= 3 ? '#7f1d1d' : '#1e293b', padding: '8px 10px', borderRadius: '8px', border: activeBoxModal.item.daysRemaining <= 3 ? '1px solid #ef4444' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: activeBoxModal.item.daysRemaining <= 3 ? '#fca5a5' : '#94a3b8' }}>
                  {activeBoxModal.item.daysRemaining <= 3 ? '⚠️ CẢNH BÁO FEFO CẬN DATE' : 'Hạn sử dụng:'}
                </span>
                <b style={{ color: activeBoxModal.item.daysRemaining <= 3 ? '#fca5a5' : '#ffffff' }}>
                  {activeBoxModal.item.expiryDate} (Còn {activeBoxModal.item.daysRemaining} ngày)
                </b>
              </div>
              <div style={{ height: '5px', backgroundColor: '#334155', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(10, activeBoxModal.item.daysRemaining * 10))}%`,
                    backgroundColor: activeBoxModal.item.daysRemaining <= 3 ? '#ef4444' : '#10b981',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', padding: '4px 2px' }}>
              <span>Nhiệt độ kệ: <b style={{ color: '#ffffff' }}>{activeBoxModal.rack.temperature}</b></span>
              <span>Độ ẩm: <b style={{ color: '#ffffff' }}>{activeBoxModal.rack.humidity}</b></span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => alert(`Đã tạo lệnh xuất FEFO ưu tiên cho lô hàng: ${activeBoxModal.item.lotCode} (${activeBoxModal.item.name})`)}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                ⚡ Xuất FEFO
              </button>
              <button
                onClick={() => alert(`Đang in mã vạch QR cho thùng hàng: [${activeBoxModal.item.sku}] - Lô ${activeBoxModal.item.lotCode}`)}
                style={{
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                🖨️ In Mã QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
