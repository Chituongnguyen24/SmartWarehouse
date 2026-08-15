"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, MapPin } from "lucide-react";

// Fix icon Leaflet trong Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter: [number, number] = [10.762622, 106.660172];

interface MapPickerProps {
  position: { lat: number; lng: number } | null;
  setPosition: (pos: { lat: number; lng: number }) => void;
  onAddressSelect?: (address: string) => void;
}

function LocationMarker({ position, setPosition, onAddressSelect, setSearchValue }: any) {
  const map = useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setPosition({ lat, lng });
      map.flyTo(e.latlng, map.getZoom());

      // Reverse geocoding (Nominatim)
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setSearchValue(data.display_name);
            if (onAddressSelect) onAddressSelect(data.display_name);
          }
        });
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 17);
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={[position.lat, position.lng]}></Marker>
  );
}

export default function MapPicker({ position, setPosition, onAddressSelect }: MapPickerProps) {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchValue(val);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=vn&addressdetails=1&limit=5&accept-language=vi`);
        const data = await response.json();
        setSuggestions(data);
        setShowDropdown(true);
      } catch (error) {
        console.error("Nominatim error:", error);
      }
    }, 500); // Debounce 500ms
  };

  const handleSelectSuggestion = (sug: any) => {
    const desc = sug.display_name;
    setSearchValue(desc);
    setShowDropdown(false);
    
    if (onAddressSelect) onAddressSelect(desc);

    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);
    setPosition({ lat, lng });
  };

  return (
    <div className="w-full flex flex-col gap-2 relative">
      <div className="relative z-[1000] w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="text-gray-400" size={18} />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Tìm địa chỉ giao hàng (Miễn phí)..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm shadow-sm"
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {suggestions.map((sug, idx) => (
              <div 
                key={sug.place_id || idx}
                onClick={() => handleSelectSuggestion(sug)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-start gap-2 transition-colors"
              >
                <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 line-clamp-2">{sug.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-[300px] w-full rounded-lg border overflow-hidden relative shadow-sm z-0">
        <MapContainer 
          center={position ? [position.lat, position.lng] : defaultCenter} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            onAddressSelect={onAddressSelect} 
            setSearchValue={setSearchValue}
          />
        </MapContainer>
      </div>
    </div>
  );
}

/* =========================================================================================
   GIỮ LẠI CODE GOOGLE MAPS Ở ĐÂY ĐỂ SAU NÀY BẠN CÓ KINH PHÍ THÌ MỞ RA XÀI NHÉ
   =========================================================================================
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 10.762622, lng: 106.660172 };
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function MapPicker_GoogleMaps({ position, setPosition, onAddressSelect }: MapPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) { setMap(map); }, []);
  const onUnmount = useCallback(function callback() { setMap(null); }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setPosition({ lat, lng });

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const address = results[0].formatted_address;
          setSearchValue(address);
          if (onAddressSelect) onAddressSelect(address);
        }
      });
    }
  };

  const handleSearchInput = (val: string) => {
    setSearchValue(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
          body: JSON.stringify({ input: val, includedRegionCodes: ["vn"] })
        });
        const data = await response.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
        }
      } catch (error) { console.error(error); }
    }, 300);
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setSearchValue(description);
    setShowDropdown(false);
    if (onAddressSelect) onAddressSelect(description);
    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: "GET",
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "location,formattedAddress" }
      });
      const data = await response.json();
      if (data.location) {
        const newPos = { lat: data.location.latitude, lng: data.location.longitude };
        setPosition(newPos);
        if (map) { map.panTo(newPos); map.setZoom(17); }
      }
    } catch (error) {}
  };

  if (loadError) return <div>Error</div>;
  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="w-full flex flex-col gap-2 relative">
      <div className="relative z-[1000] w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="text-gray-400" size={18} />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Tìm địa chỉ giao hàng bằng Google (VD: Landmark 81)..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 outline-none text-sm shadow-sm"
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {suggestions.map((sug, idx) => {
              const placeId = sug.placePrediction.placeId;
              const text = sug.placePrediction.text.text;
              return (
                <div key={placeId || idx} onClick={() => handleSelectSuggestion(placeId, text)} className="p-3 hover:bg-gray-50 cursor-pointer border-b flex items-start gap-2">
                  <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="h-[300px] w-full rounded-lg border overflow-hidden relative shadow-sm z-0">
        <GoogleMap mapContainerStyle={containerStyle} center={position || defaultCenter} zoom={13} onLoad={onLoad} onUnmount={onUnmount} onClick={handleMapClick}>
          {position && <Marker position={position} />}
        </GoogleMap>
      </div>
    </div>
  );
}
*/
