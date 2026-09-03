import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface Rack3DData {
  id: string;
  name: string;
  zone: 'COOL' | 'FROZEN' | 'DRY';
  temperature: string;
  humidity: string;
  maxCapacity: number;
  currentCapacity: number;
  hasAlert?: boolean;
  alertMsg?: string;
  position: [number, number, number]; // [x, y, z]
  color: string;
}

interface Supermarket3DSceneProps {
  racks: Rack3DData[];
  selectedRackId: string;
  onSelectRack: (id: string) => void;
  zoneFilter: 'ALL' | 'COOL' | 'FROZEN' | 'DRY';
}

export const Supermarket3DScene: React.FC<Supermarket3DSceneProps> = ({
  racks,
  selectedRackId,
  onSelectRack,
  zoneFilter,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'ISOMETRIC' | 'TOP_DOWN' | 'AISLE'>('ISOMETRIC');
  const [hoveredRack, setHoveredRack] = useState<Rack3DData | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rackMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const animationFrameRef = useRef<number>(0);

  // Mouse & Raycasting
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());

  // Target camera positions for smooth interpolation
  const targetCamPos = useRef(new THREE.Vector3(18, 20, 22));
  const targetCamLookAt = useRef(new THREE.Vector3(0, 2, 0));
  const currentCamLookAt = useRef(new THREE.Vector3(0, 2, 0));

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b132b);
    scene.fog = new THREE.FogExp2(0x0b132b, 0.018);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(18, 20, 22);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 30, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    // Cool Zone Blue Accent Light
    const coolLight = new THREE.PointLight(0x38bdf8, 2, 25);
    coolLight.position.set(-10, 6, -6);
    scene.add(coolLight);

    // Frozen Zone Cyan Accent Light
    const frozenLight = new THREE.PointLight(0x06b6d4, 2.5, 25);
    frozenLight.position.set(0, 6, -6);
    scene.add(frozenLight);

    // Dry Zone Amber Accent Light
    const dryLight = new THREE.PointLight(0xf59e0b, 2, 25);
    dryLight.position.set(10, 6, -6);
    scene.add(dryLight);

    // 5. Floor & Grid setup
    const floorGeo = new THREE.PlaneGeometry(42, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Floor Overlay
    const gridHelper = new THREE.GridHelper(40, 40, 0x334155, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Zone Dividing Painted Lines on Floor
    const createZoneFloor = (x: number, z: number, w: number, d: number, color: number, label: string) => {
      const zoneGeo = new THREE.PlaneGeometry(w, d);
      const zoneMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.rotation.x = -Math.PI / 2;
      zoneMesh.position.set(x, 0.02, z);
      scene.add(zoneMesh);

      // Zone boundary outline
      const edges = new THREE.EdgesGeometry(zoneGeo);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: color, linewidth: 2 }));
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.03, z);
      scene.add(line);
    };

    createZoneFloor(-11, 0, 11, 24, 0x0284c7, 'KHU VỰC KHO MÁT (0°C ~ 4°C)');
    createZoneFloor(0, 0, 10, 24, 0x06b6d4, 'KHU VỰC ĐÔNG LẠNH (-18°C)');
    createZoneFloor(11, 0, 11, 24, 0xf59e0b, 'KHU VỰC KHO KHÔ (+25°C)');

    // Inbound & Outbound Dock Areas (Front)
    const dockGeo = new THREE.BoxGeometry(36, 0.2, 3);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const dockMesh = new THREE.Mesh(dockGeo, dockMat);
    dockMesh.position.set(0, 0.1, 13);
    dockMesh.receiveShadow = true;
    scene.add(dockMesh);

    // Forklift / AGV Robot Model (Moving in aisle)
    const agvGroup = new THREE.Group();
    const agvBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
    agvBody.position.y = 0.5;
    agvBody.castShadow = true;
    agvGroup.add(agvBody);

    const agvMast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    agvMast.position.set(0.6, 1.2, 1.1);
    agvGroup.add(agvMast);

    const agvMast2 = agvMast.clone();
    agvMast2.position.x = -0.6;
    agvGroup.add(agvMast2);

    const palletOnAgv = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    palletOnAgv.position.set(0, 1.2, 1.3);
    agvGroup.add(palletOnAgv);

    agvGroup.position.set(-5, 0, 4);
    scene.add(agvGroup);

    // 6. Build 3D Shelf Racks
    rackMeshesRef.current.clear();

    const buildRackMesh = (rack: Rack3DData) => {
      const rackGroup = new THREE.Group();
      rackGroup.name = rack.id;
      rackGroup.position.set(...rack.position);

      const rackWidth = 2.6;
      const rackHeight = 4.2;
      const rackDepth = 1.6;
      const levels = 3;

      // Upright pillars (Frame)
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.6,
        roughness: 0.4,
      });
      const postGeo = new THREE.BoxGeometry(0.1, rackHeight, 0.1);

      const postPositions = [
        [-rackWidth / 2, rackHeight / 2, -rackDepth / 2],
        [rackWidth / 2, rackHeight / 2, -rackDepth / 2],
        [-rackWidth / 2, rackHeight / 2, rackDepth / 2],
        [rackWidth / 2, rackHeight / 2, rackDepth / 2],
      ];

      postPositions.forEach(([px, py, pz]) => {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, py, pz);
        post.castShadow = true;
        rackGroup.add(post);
      });

      // Shelf Horizontal Beams & Shelves
      const shelfMat = new THREE.MeshStandardMaterial({
        color: rack.zone === 'COOL' ? 0x0284c7 : rack.zone === 'FROZEN' ? 0x0891b2 : 0xd97706,
        metalness: 0.4,
        roughness: 0.5,
      });

      for (let lvl = 0; lvl <= levels; lvl++) {
        const y = 0.4 + (lvl * (rackHeight - 0.6)) / levels;
        const beamGeo = new THREE.BoxGeometry(rackWidth + 0.1, 0.08, rackDepth + 0.1);
        const beam = new THREE.Mesh(beamGeo, shelfMat);
        beam.position.y = y;
        beam.castShadow = true;
        beam.receiveShadow = true;
        rackGroup.add(beam);

        // Add Product Boxes on each level (based on capacity ratio)
        if (lvl < levels) {
          const numBoxes = Math.min(3, Math.max(1, Math.round((rack.currentCapacity / rack.maxCapacity) * 3)));
          for (let b = 0; b < numBoxes; b++) {
            const boxGeo = new THREE.BoxGeometry(0.65, 0.55, 0.85);
            const boxColor = rack.hasAlert
              ? 0xef4444
              : rack.zone === 'COOL'
              ? 0x38bdf8
              : rack.zone === 'FROZEN'
              ? 0x22d3ee
              : 0xfbbf24;
            const boxMat = new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.6 });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(-rackWidth / 3 + b * (rackWidth / 3), y + 0.32, 0);
            box.castShadow = true;
            rackGroup.add(box);
          }
        }
      }

      // Top Header Signboard with Rack ID
      const signGeo = new THREE.BoxGeometry(rackWidth, 0.45, 0.05);
      const signMat = new THREE.MeshStandardMaterial({
        color: rack.hasAlert ? 0xdc2626 : 0x0f172a,
        emissive: rack.hasAlert ? 0x7f1d1d : 0x000000,
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, rackHeight + 0.25, rackDepth / 2);
      rackGroup.add(sign);

      // Hitbox for Raycasting Selection
      const hitBoxGeo = new THREE.BoxGeometry(rackWidth + 0.4, rackHeight + 0.8, rackDepth + 0.4);
      const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
      hitBox.position.y = rackHeight / 2;
      hitBox.userData = { rackData: rack };
      rackGroup.add(hitBox);

      scene.add(rackGroup);
      rackMeshesRef.current.set(rack.id, rackGroup);
    };

    racks.forEach(buildRackMesh);

    // 7. Raycasting & Click Handler
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      let found: Rack3DData | null = null;
      for (const hit of intersects) {
        if (hit.object.userData?.rackData) {
          found = hit.object.userData.rackData;
          break;
        }
      }
      setHoveredRack(found);
      container.style.cursor = found ? 'pointer' : 'default';
    };

    const handlePointerDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        if (hit.object.userData?.rackData) {
          const r = hit.object.userData.rackData as Rack3DData;
          onSelectRack(r.id);
          break;
        }
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handlePointerDown);

    // 8. Animation & Render Loop
    let agvX = -5;
    let agvDir = 1;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Smooth camera interpolation
      camera.position.lerp(targetCamPos.current, 0.05);
      currentCamLookAt.current.lerp(targetCamLookAt.current, 0.05);
      camera.lookAt(currentCamLookAt.current);

      // AGV Robot movement animation
      agvX += 0.02 * agvDir;
      if (agvX > 6) agvDir = -1;
      if (agvX < -6) agvDir = 1;
      agvGroup.position.x = agvX;
      agvGroup.rotation.y = agvDir > 0 ? 0 : Math.PI;

      // Selected Rack Glowing Pulse Animation
      const selGroup = rackMeshesRef.current.get(selectedRackId);
      if (selGroup) {
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.04;
        selGroup.scale.set(pulse, pulse, pulse);
      }

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handlePointerDown);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Update camera view mode
  useEffect(() => {
    if (!cameraRef.current) return;
    if (viewMode === 'ISOMETRIC') {
      targetCamPos.current.set(18, 20, 22);
      targetCamLookAt.current.set(0, 2, 0);
    } else if (viewMode === 'TOP_DOWN') {
      targetCamPos.current.set(0, 32, 0.1);
      targetCamLookAt.current.set(0, 0, 0);
    } else if (viewMode === 'AISLE') {
      // Focus near selected rack or middle aisle
      const sel = racks.find(r => r.id === selectedRackId) || racks[0];
      if (sel) {
        targetCamPos.current.set(sel.position[0], 5, sel.position[2] + 7);
        targetCamLookAt.current.set(sel.position[0], 2, sel.position[2]);
      }
    }
  }, [viewMode, selectedRackId, racks]);

  // Highlight selected rack & reset others
  useEffect(() => {
    rackMeshesRef.current.forEach((group, rackId) => {
      const isSelected = rackId === selectedRackId;
      if (!isSelected) {
        group.scale.set(1, 1, 1);
      }

      // Filter Visibility based on zoneFilter
      const rack = racks.find(r => r.id === rackId);
      if (rack) {
        const isVisible = zoneFilter === 'ALL' || rack.zone === zoneFilter;
        group.visible = isVisible;
      }
    });
  }, [selectedRackId, zoneFilter, racks]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '20px', overflow: 'hidden' }}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating View Mode Switcher */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: '4px',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(51, 65, 85, 0.8)',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setViewMode('ISOMETRIC')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: viewMode === 'ISOMETRIC' ? '#0284c7' : 'transparent',
            color: viewMode === 'ISOMETRIC' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          📐 Góc Nhìn Không Gian 3D
        </button>
        <button
          onClick={() => setViewMode('TOP_DOWN')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: viewMode === 'TOP_DOWN' ? '#0284c7' : 'transparent',
            color: viewMode === 'TOP_DOWN' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          🗺️ Mặt Bằng Tổng Thể
        </button>
        <button
          onClick={() => setViewMode('AISLE')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: viewMode === 'AISLE' ? '#0284c7' : 'transparent',
            color: viewMode === 'AISLE' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          🚶 Lối Đi Soạn Hàng (Aisle)
        </button>
      </div>

      {/* Floating Legend / Zone Indicators */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          display: 'flex',
          gap: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: '8px 14px',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(51, 65, 85, 0.8)',
          fontSize: '11px',
          color: '#cbd5e1',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
          <span>Kho Mát (0°C ~ +4°C)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#06b6d4' }} />
          <span>Đông Lạnh (-18°C)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span>Kho Khô (+25°C)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <span>Cảnh Báo Hết Hạn FEFO</span>
        </div>
      </div>

      {/* Hovered Rack Floating Tooltip */}
      {hoveredRack && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1.5px solid #38bdf8',
            padding: '10px 14px',
            borderRadius: '12px',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: '220px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>{hoveredRack.id}</div>
          <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '2px' }}>{hoveredRack.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
            <span>Nhiệt độ: <b style={{ color: '#ffffff' }}>{hoveredRack.temperature}</b></span>
            <span>Độ ẩm: <b style={{ color: '#ffffff' }}>{hoveredRack.humidity}</b></span>
          </div>
          <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>
            Sức chứa: <b>{hoveredRack.currentCapacity}/{hoveredRack.maxCapacity}</b> ({Math.round((hoveredRack.currentCapacity / hoveredRack.maxCapacity) * 100)}%)
          </div>
        </div>
      )}
    </div>
  );
};
