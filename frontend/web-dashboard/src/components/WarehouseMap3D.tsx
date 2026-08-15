import React from 'react';

interface WarehouseMap3DProps {
  onSelectSlot: (zone: string, slotId: string) => void;
  selectedSlot?: string;
}

const shelves = [
  { id: 'COLD-A1', zone: 'COLD', label: 'Kho Mát A1' },
  { id: 'COLD-A2', zone: 'COLD', label: 'Kho Mát A2' },
  { id: 'COLD-A3', zone: 'COLD', label: 'Kho Mát A3' },
  { id: 'FROZEN-B1', zone: 'FROZEN', label: 'Kho Đông B1' },
  { id: 'FROZEN-B2', zone: 'FROZEN', label: 'Kho Đông B2' },
  { id: 'FROZEN-B3', zone: 'FROZEN', label: 'Kho Đông B3' },
  { id: 'DRY-C1', zone: 'DRY', label: 'Kho Khô C1' },
  { id: 'DRY-C2', zone: 'DRY', label: 'Kho Khô C2' },
  { id: 'DRY-C3', zone: 'DRY', label: 'Kho Khô C3' },
];

const WarehouseMap3D: React.FC<WarehouseMap3DProps> = ({ onSelectSlot, selectedSlot }) => {
  return (
    <div className="iso-container">
      <div className="iso-grid">
        {shelves.map((shelf) => {
          const isSelected = selectedSlot === shelf.id;
          const zoneClass = shelf.zone === 'COLD' ? 'iso-zone-cold' : shelf.zone === 'FROZEN' ? 'iso-zone-frozen' : 'iso-zone-dry';
          return (
            <div
              key={shelf.id}
              className={`iso-shelf ${zoneClass} ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSlot(shelf.zone, shelf.id)}
            >
              <div className="iso-shelf-shadow"></div>
              <div className="iso-label">{shelf.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WarehouseMap3D;
