import React, { useEffect, useState } from 'react';

interface AddressPickerProps {
  initialAddress: string;
  onAddressChange: (address: string) => void;
}

export const AddressPicker: React.FC<AddressPickerProps> = ({ initialAddress, onAddressChange }) => {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [street, setStreet] = useState('');

  // Initial load
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(console.error);

    if (initialAddress) {
      setStreet(initialAddress);
    }
  }, []);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const pName = e.target.options[e.target.selectedIndex].text;
    setSelectedProvince(code ? pName : '');
    setWards([]);
    setSelectedWard('');

    if (code) {
      fetch(`https://provinces.open-api.vn/api/v2/p/${code}?depth=2`)
        .then(res => res.json())
        .then(data => {
          if (data.wards) {
            setWards(data.wards);
          } else {
            setWards([]);
          }
        })
        .catch(console.error);
    }
    
    updateFullAddress(code ? pName : '', '', street);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const wName = e.target.options[e.target.selectedIndex].text;
    setSelectedWard(code ? wName : '');
    
    updateFullAddress(selectedProvince, code ? wName : '', street);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStreet(val);
    updateFullAddress(selectedProvince, selectedWard, val);
  };

  const updateFullAddress = (p: string, w: string, s: string) => {
    if (!p && !w) {
      onAddressChange(s);
      return;
    }
    const parts = [s, w, p].filter(Boolean);
    onAddressChange(parts.join(', '));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <select 
          onChange={handleProvinceChange}
          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        >
          <option value="">-- Chọn Tỉnh/Thành phố --</option>
          {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>

        <select 
          onChange={handleWardChange}
          disabled={!wards.length}
          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: !wards.length ? '#f1f5f9' : '#fff' }}
        >
          <option value="">-- Chọn Phường/Xã --</option>
          {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input 
          type="text"
          placeholder="Số nhà, Tên đường..."
          value={street}
          onChange={handleStreetChange}
          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />
      </div>
    </div>
  );
};
