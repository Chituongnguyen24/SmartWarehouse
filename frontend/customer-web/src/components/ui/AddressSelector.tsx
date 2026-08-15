"use client";

import { useEffect, useState } from "react";

interface AddressSelectorProps {
  onAddressChange: (address: string) => void;
}

export default function AddressSelector({ onAddressChange }: AddressSelectorProps) {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [street, setStreet] = useState("");

  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/v2/p/")
      .then((res) => res.json())
      .then((data) => setProvinces(data))
      .catch((err) => console.error(err));
  }, []);

  const handleProvinceChange = (code: string) => {
    const province = provinces.find((p) => p.code == code || p.code === Number(code));
    setSelectedProvince(province ? province.name : "");
    setSelectedWard("");
    setWards([]);
    
    if (code) {
      fetch(`https://provinces.open-api.vn/api/v2/p/${code}?depth=2`)
        .then((res) => res.json())
        .then((data) => {
          if (data.wards) {
            setWards(data.wards);
          } else {
            setWards([]);
          }
        })
        .catch((err) => console.error(err));
    }
    updateAddress(province ? province.name : "", "", street);
  };

  const handleWardChange = (code: string) => {
    const ward = wards.find((w) => w.code == code || w.code === Number(code));
    setSelectedWard(ward ? ward.name : "");
    updateAddress(selectedProvince, ward ? ward.name : "", street);
  };

  const handleStreetChange = (val: string) => {
    setStreet(val);
    updateAddress(selectedProvince, selectedWard, val);
  };

  const updateAddress = (p: string, w: string, s: string) => {
    const parts = [s, w, p].filter(Boolean);
    onAddressChange(parts.join(", "));
  };

  return (
    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
      <div className="text-sm font-medium text-gray-700 mb-2">Chọn khu vực giao hàng</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          onChange={(e) => handleProvinceChange(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-white"
        >
          <option value="">-- Chọn Tỉnh/Thành phố --</option>
          {provinces.map((p, idx) => (
            <option key={p.code || idx} value={p.code}>{p.name}</option>
          ))}
        </select>

        <select
          onChange={(e) => handleWardChange(e.target.value)}
          disabled={!wards.length}
          className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-white disabled:bg-gray-100"
        >
          <option value="">-- Chọn Phường/Xã --</option>
          {wards.map((w, idx) => (
            <option key={w.code || idx} value={w.code}>{w.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <input
          type="text"
          value={street}
          onChange={(e) => handleStreetChange(e.target.value)}
          placeholder="Số nhà, đường, hẻm cụ thể..."
          className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-white mt-1"
        />
      </div>
    </div>
  );
}
