import React, { useEffect, useRef, useState } from 'react';
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
  position: [number, number, number]; // [x, y, z]
  color: string;
  items: ShelfItem3D[];
}

interface Supermarket3DSceneProps {
  racks: Rack3DData[];
  selectedRackId: string;
  onSelectRack: (id: string) => void;
  zoneFilter: 'ALL' | 'COOL' | 'FROZEN' | 'DRY';
  onSelectBox?: (item: ShelfItem3D, rack: Rack3DData, level: number) => void;
}

export const Supermarket3DScene: React.FC<Supermarket3DSceneProps> = ({
  racks,
  selectedRackId,
  onSelectRack,
  zoneFilter,
  onSelectBox,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'ISOMETRIC' | 'TOP_DOWN' | 'FOCUS_RACK' | 'AISLE'>('ISOMETRIC');
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rackMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const boxMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number>(0);
  const rebuildAllRacksRef = useRef<((currentRacks: Rack3DData[]) => void) | null>(null);

  // Mouse Orbiting / Drag State (Game Controls)
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const previousMousePos = useRef({ x: 0, y: 0 });
  const sphericalCoords = useRef({ radius: 34, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));

  // Target camera interpolations
  const targetCamPos = useRef(new THREE.Vector3(18, 20, 22));
  const targetCamLookAt = useRef(new THREE.Vector3(0, 2, 0));
  const currentCamLookAt = useRef(new THREE.Vector3(0, 2, 0));

  // Raycaster
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());

  // Helper: Create 3D Text Billboard Sprite for Rack Signboard
  const createTextSprite = (text: string, bgColor: string, textColor: string = '#ffffff') => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Rounded Box background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 108, 20);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Text label
    ctx.fillStyle = textColor;
    ctx.font = 'bold 36px "Segoe UI", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.6, 0.9, 1);
    return sprite;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 850;
    const height = container.clientHeight || 560;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.012);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(18, 20, 22);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting Environment
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(25, 35, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    // Accent Point Lights
    const coolLight = new THREE.PointLight(0x38bdf8, 2.5, 30);
    coolLight.position.set(-11, 8, 0);
    scene.add(coolLight);

    const frozenLight = new THREE.PointLight(0x06b6d4, 3, 30);
    frozenLight.position.set(0, 8, 0);
    scene.add(frozenLight);

    const dryLight = new THREE.PointLight(0xf59e0b, 2.5, 30);
    dryLight.position.set(11, 8, 0);
    scene.add(dryLight);

    // 5. Floor & Zone Markings
    const floorGeo = new THREE.PlaneGeometry(46, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Lines Overlay
    const gridHelper = new THREE.GridHelper(44, 44, 0x334155, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Visual Zone Areas with glowing edges
    const createZoneFloor = (x: number, z: number, w: number, d: number, color: number, label: string) => {
      const zoneGeo = new THREE.PlaneGeometry(w, d);
      const zoneMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      });
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.rotation.x = -Math.PI / 2;
      zoneMesh.position.set(x, 0.02, z);
      scene.add(zoneMesh);

      const edges = new THREE.EdgesGeometry(zoneGeo);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: color, linewidth: 2 }));
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.03, z);
      scene.add(line);
    };

    createZoneFloor(-11, 0, 11, 26, 0x0284c7, 'KHO MÁT (0-4°C)');
    createZoneFloor(0, 0, 10, 26, 0x06b6d4, 'ĐÔNG LẠNH (-18°C)');
    createZoneFloor(11, 0, 11, 26, 0xf59e0b, 'KHO KHÔ (+25°C)');

    // Inbound / Outbound Front Staging Line
    const dockGeo = new THREE.BoxGeometry(38, 0.15, 3.5);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const dockMesh = new THREE.Mesh(dockGeo, dockMat);
    dockMesh.position.set(0, 0.08, 14);
    dockMesh.receiveShadow = true;
    scene.add(dockMesh);

    // Forklift / AGV Robot
    const agvGroup = new THREE.Group();
    const agvBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 2.4), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
    agvBody.position.y = 0.5;
    agvBody.castShadow = true;
    agvGroup.add(agvBody);

    const agvMast1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    agvMast1.position.set(0.6, 1.2, 1.2);
    agvGroup.add(agvMast1);

    const agvMast2 = agvMast1.clone();
    agvMast2.position.x = -0.6;
    agvGroup.add(agvMast2);

    const agvPallet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.1), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    agvPallet.position.set(0, 1.2, 1.3);
    agvGroup.add(agvPallet);

    // Headlights
    const headlight = new THREE.SpotLight(0xfef08a, 4, 15, Math.PI / 6, 0.5);
    headlight.position.set(0, 0.8, 1.4);
    headlight.target.position.set(0, 0, 8);
    agvGroup.add(headlight);
    agvGroup.add(headlight.target);

    agvGroup.position.set(-5, 0, 4);
    scene.add(agvGroup);

    // Function to build all racks dynamically
    const rebuildAllRacks = (currentRacks: Rack3DData[]) => {
      // Clear old meshes
      rackMeshesRef.current.forEach((mesh) => {
        scene.remove(mesh);
      });
      rackMeshesRef.current.clear();
      boxMeshesRef.current = [];

      currentRacks.forEach((rack) => {
        const rackGroup = new THREE.Group();
        rackGroup.name = rack.id;
        rackGroup.position.set(...rack.position);

        const rackWidth = 2.8;
        const rackHeight = 4.5;
        const rackDepth = 1.6;
        const levels = 3; // 3 Tầng kệ

        // Vertical Upright Posts
        const postMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.7,
          roughness: 0.3,
        });
        const postGeo = new THREE.BoxGeometry(0.08, rackHeight, 0.08);

        const postPos = [
          [-rackWidth / 2, rackHeight / 2, -rackDepth / 2],
          [rackWidth / 2, rackHeight / 2, -rackDepth / 2],
          [-rackWidth / 2, rackHeight / 2, rackDepth / 2],
          [rackWidth / 2, rackHeight / 2, rackDepth / 2],
        ];

        postPos.forEach(([px, py, pz]) => {
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(px, py, pz);
          post.castShadow = true;
          rackGroup.add(post);
        });

        // Shelf Level Platforms & Crossbars
        const beamMat = new THREE.MeshStandardMaterial({
          color: rack.zone === 'COOL' ? 0x0284c7 : rack.zone === 'FROZEN' ? 0x0891b2 : 0xd97706,
          metalness: 0.5,
          roughness: 0.4,
        });

        for (let lvl = 0; lvl <= levels; lvl++) {
          const y = 0.35 + (lvl * (rackHeight - 0.7)) / levels;
          const beamGeo = new THREE.BoxGeometry(rackWidth + 0.1, 0.08, rackDepth + 0.1);
          const beam = new THREE.Mesh(beamGeo, beamMat);
          beam.position.y = y;
          beam.castShadow = true;
          beam.receiveShadow = true;
          rackGroup.add(beam);
        }

        // Add 3D Text Floating Signboard over Rack
        const spriteSign = createTextSprite(
          `${rack.id.replace('RACK-', '')} - ${rack.name.split('(')[0]}`,
          rack.hasAlert ? '#dc2626' : rack.zone === 'COOL' ? '#0284c7' : rack.zone === 'FROZEN' ? '#0891b2' : '#d97706'
        );
        if (spriteSign) {
          spriteSign.position.set(0, rackHeight + 0.6, 0);
          rackGroup.add(spriteSign);
        }

        // Populate Individual Interactive 3D Product Crates/Boxes on each level
        const itemsList = rack.items || [];
        const slotsPerLevel = 2;

        for (let lvl = 0; lvl < levels; lvl++) {
          const levelY = 0.35 + (lvl * (rackHeight - 0.7)) / levels + 0.32;

          for (let slot = 0; slot < slotsPerLevel; slot++) {
            const itemIdx = lvl * slotsPerLevel + slot;
            const it = itemsList[itemIdx % Math.max(1, itemsList.length)] || {
              sku: `SKU-${rack.id}-L${lvl + 1}S${slot + 1}`,
              name: `${rack.name.split('(')[0]} - Thùng ${lvl + 1}.${slot + 1}`,
              category: rack.zoneLabel,
              qty: 24,
              unit: 'Thùng',
              lotCode: `LOT-${rack.id}-${lvl + 1}${slot + 1}`,
              expiryDate: '15/09/2026',
              daysRemaining: 12 - lvl * 3,
              price: 55000,
            };

            const isNearExpiry = (it.daysRemaining ?? 10) <= 3;

            // Box Geometry & Material
            const boxWidth = 1.0;
            const boxHeight = 0.55;
            const boxDepth = 1.2;
            const boxGeo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

            let boxColorHex = rack.zone === 'COOL' ? 0x38bdf8 : rack.zone === 'FROZEN' ? 0x22d3ee : 0xfbbf24;
            if (isNearExpiry) {
              boxColorHex = 0xef4444; // Cận date đỏ rực
            }

            const boxMat = new THREE.MeshStandardMaterial({
              color: boxColorHex,
              roughness: 0.5,
              metalness: 0.2,
              emissive: isNearExpiry ? 0x7f1d1d : 0x000000,
              emissiveIntensity: isNearExpiry ? 0.6 : 0.0,
            });

            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
            const posX = (slot - 0.5) * (rackWidth * 0.45);
            boxMesh.position.set(posX, levelY, 0);
            boxMesh.castShadow = true;
            boxMesh.receiveShadow = true;

            // Attach Metadata for Game Click & Raycasting
            boxMesh.userData = {
              isProductBox: true,
              rack: rack,
              item: it,
              level: lvl + 1,
              slot: slot + 1,
              originalColor: boxColorHex,
            };

            rackGroup.add(boxMesh);
            boxMeshesRef.current.push(boxMesh);
          }
        }

        // Hitbox for Rack Selection
        const hitBoxGeo = new THREE.BoxGeometry(rackWidth + 0.4, rackHeight + 0.8, rackDepth + 0.4);
        const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
        hitBox.position.y = rackHeight / 2;
        hitBox.userData = { isRackHitbox: true, rackData: rack };
        rackGroup.add(hitBox);

        scene.add(rackGroup);
        rackMeshesRef.current.set(rack.id, rackGroup);
      });
    };

    rebuildAllRacksRef.current = rebuildAllRacks;
    rebuildAllRacks(racks);

    // 7. Mouse Orbit Controls (Interactive Game Navigation)
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left Click: Orbit
        isDraggingRef.current = true;
        previousMousePos.current = { x: e.clientX, y: e.clientY };
      } else if (e.button === 2) {
        // Right Click: Pan
        isPanningRef.current = true;
        previousMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePos.current.x;
        const deltaY = e.clientY - previousMousePos.current.y;
        previousMousePos.current = { x: e.clientX, y: e.clientY };

        sphericalCoords.current.theta -= deltaX * 0.008;
        sphericalCoords.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalCoords.current.phi - deltaY * 0.008));
        updateCameraFromSpherical();
        return;
      }

      if (isPanningRef.current) {
        const deltaX = e.clientX - previousMousePos.current.x;
        const deltaY = e.clientY - previousMousePos.current.y;
        previousMousePos.current = { x: e.clientX, y: e.clientY };

        cameraTarget.current.x -= deltaX * 0.04;
        cameraTarget.current.z -= deltaY * 0.04;
        updateCameraFromSpherical();
        return;
      }

      // Raycasting Hover
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
        container.style.cursor = 'pointer';
      } else {
        setHoveredInfo(null);
        container.style.cursor = 'grab';
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalCoords.current.radius = Math.max(8, Math.min(65, sphericalCoords.current.radius + e.deltaY * 0.04));
      updateCameraFromSpherical();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        // 1. Click specifically on a 3D Product Box
        if (hit.object.userData?.isProductBox) {
          const u = hit.object.userData;
          onSelectRack(u.rack.id);

          setActiveBoxModal({
            item: u.item,
            rack: u.rack,
            level: u.level,
            slot: u.slot,
          });

          if (onSelectBox) {
            onSelectBox(u.item, u.rack, u.level);
          }

          // Smooth Zoom in onto this specific box
          const worldPos = new THREE.Vector3();
          hit.object.getWorldPosition(worldPos);
          cameraTarget.current.copy(worldPos);
          sphericalCoords.current.radius = 12;
          updateCameraFromSpherical();
          return;
        }

        // 2. Click on Rack Hitbox
        if (hit.object.userData?.isRackHitbox) {
          const r = hit.object.userData.rackData as Rack3DData;
          onSelectRack(r.id);
          cameraTarget.current.set(r.position[0], 2, r.position[2]);
          sphericalCoords.current.radius = 18;
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

    // 8. Game Animation & Render Loop (60 FPS)
    let agvX = -5;
    let agvDir = 1;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Smooth Camera LERP
      camera.position.lerp(targetCamPos.current, 0.08);
      currentCamLookAt.current.lerp(targetCamLookAt.current, 0.08);
      camera.lookAt(currentCamLookAt.current);

      // AGV Robot Patrol Animation
      agvX += 0.025 * agvDir;
      if (agvX > 7) agvDir = -1;
      if (agvX < -7) agvDir = 1;
      agvGroup.position.x = agvX;
      agvGroup.rotation.y = agvDir > 0 ? 0 : Math.PI;

      // Animate Near-Expiry Pulsing Boxes
      const time = Date.now() * 0.006;
      boxMeshesRef.current.forEach((box) => {
        if (box.userData?.item?.daysRemaining <= 3) {
          const pulse = 0.5 + Math.sin(time) * 0.5;
          (box.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + pulse * 0.7;
        }
      });

      // Highlight selected rack
      const selGroup = rackMeshesRef.current.get(selectedRackId);
      if (selGroup) {
        const pulse = 1 + Math.sin(time * 0.8) * 0.02;
        selGroup.scale.set(pulse, pulse, pulse);
      }

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Handler
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
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('click', handleClick);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Update View Modes Presets
  useEffect(() => {
    if (!cameraRef.current) return;
    if (viewMode === 'ISOMETRIC') {
      cameraTarget.current.set(0, 2, 0);
      sphericalCoords.current = { radius: 32, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    } else if (viewMode === 'TOP_DOWN') {
      cameraTarget.current.set(0, 0, 0);
      sphericalCoords.current = { radius: 36, theta: 0, phi: 0.05 };
    } else if (viewMode === 'FOCUS_RACK') {
      const sel = racks.find(r => r.id === selectedRackId) || racks[0];
      if (sel) {
        cameraTarget.current.set(sel.position[0], 2, sel.position[2]);
        sphericalCoords.current = { radius: 14, theta: Math.PI / 4, phi: Math.PI / 3.4 };
      }
    } else if (viewMode === 'AISLE') {
      cameraTarget.current.set(-5, 1.8, 0);
      sphericalCoords.current = { radius: 10, theta: Math.PI / 2, phi: Math.PI / 2.2 };
    }

    const { radius, theta, phi } = sphericalCoords.current;
    targetCamPos.current.x = cameraTarget.current.x + radius * Math.sin(phi) * Math.sin(theta);
    targetCamPos.current.y = cameraTarget.current.y + radius * Math.cos(phi);
    targetCamPos.current.z = cameraTarget.current.z + radius * Math.sin(phi) * Math.cos(theta);
    targetCamLookAt.current.copy(cameraTarget.current);
  }, [viewMode, selectedRackId, racks]);

  // Dynamic Rebuild Racks when racks list updates (e.g. Added new rack, synced from DB)
  useEffect(() => {
    if (rebuildAllRacksRef.current) {
      rebuildAllRacksRef.current(racks);
    }
  }, [racks]);

  // Visibility Filter
  useEffect(() => {
    rackMeshesRef.current.forEach((group, rackId) => {
      const isSelected = rackId === selectedRackId;
      if (!isSelected) {
        group.scale.set(1, 1, 1);
      }
      const rack = racks.find(r => r.id === rackId);
      if (rack) {
        group.visible = zoneFilter === 'ALL' || rack.zone === zoneFilter;
      }
    });
  }, [selectedRackId, zoneFilter, racks]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '560px', borderRadius: '20px', overflow: 'hidden', userSelect: 'none' }}>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Game Camera Controls Switcher */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          padding: '6px',
          borderRadius: '14px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          zIndex: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={() => setViewMode('ISOMETRIC')}
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
          🎮 Toàn Cảnh 3D
        </button>
        <button
          onClick={() => setViewMode('FOCUS_RACK')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: viewMode === 'FOCUS_RACK' ? '#0284c7' : 'transparent',
            color: viewMode === 'FOCUS_RACK' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          🎯 Soi Kệ Đang Chọn
        </button>
        <button
          onClick={() => setViewMode('TOP_DOWN')}
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
        <button
          onClick={() => setViewMode('AISLE')}
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
          🚶 Lối Đi Soạn Hàng
        </button>
      </div>

      {/* Game Navigation Guide Badge (Top Right) */}
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
          color: '#38bdf8',
          fontWeight: 700,
          zIndex: 10,
          display: 'flex',
          gap: '10px',
        }}
      >
        <span>🖱️ Kéo chuột: Xoay 360°</span>
        <span>🔍 Cuộn chuột: Phóng to</span>
        <span>📦 Click thùng: Xem chi tiết</span>
      </div>

      {/* Floating Legend / Zone Indicators (Bottom Left) */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          display: 'flex',
          gap: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
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
          <span>Lô Hàng Cận Date (FEFO)</span>
        </div>
      </div>

      {/* Hover Mini Tooltip HUD */}
      {hoveredInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
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

      {/* GAMING HUD: MODAL X-RAY THÔNG TIN CHI TIẾT THÙNG HÀNG 3D KHI CLICK */}
      {activeBoxModal && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '16px',
            width: '320px',
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
          {/* Header */}
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

          {/* Details Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Mã SKU:</span>
              <b style={{ color: '#f8fafc' }}>{activeBoxModal.item.sku}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Số lô (Lot Code):</span>
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

            {/* Expiry / FEFO Risk Bar */}
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

            {/* Environmental Sensor at slot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', padding: '4px 2px' }}>
              <span>Nhiệt độ kệ: <b style={{ color: '#ffffff' }}>{activeBoxModal.rack.temperature}</b></span>
              <span>Độ ẩm: <b style={{ color: '#ffffff' }}>{activeBoxModal.rack.humidity}</b></span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => alert(`Đã tạo lệnh xuất kho FEFO ưu tiên cho lô hàng: ${activeBoxModal.item.lotCode} (${activeBoxModal.item.name})`)}
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
