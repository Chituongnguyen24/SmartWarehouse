import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, CheckCircle2, Navigation, X, Edit3 } from 'lucide-react';

interface AddressPickerProps {
  initialAddress?: string;
  onAddressChange: (address: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

interface GoongPrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
}

export const AddressPicker: React.FC<AddressPickerProps> = ({
  initialAddress = '',
  onAddressChange,
  placeholder = 'Tìm địa chỉ kho, số nhà, tên đường hoặc địa danh...',
}) => {
  const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6';

  const [inputVal, setInputVal] = useState(initialAddress);
  const [predictions, setPredictions] = useState<GoongPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with parent initialAddress if changed externally
  useEffect(() => {
    if (initialAddress && initialAddress !== inputVal) {
      setInputVal(initialAddress);
    }
  }, [initialAddress]);

  // Click outside to close predictions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Goong AutoComplete predictions
  const fetchPredictions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Focus search around HCMC & Vietnam location (10.8231, 106.6297)
      const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(
        query
      )}&location=10.8231,106.6297&limit=6`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          setPredictions(data.predictions);
          setIsOpen(true);
        } else {
          setPredictions([]);
        }
      }
    } catch (err) {
      console.warn('[AddressPicker] Goong AutoComplete error:', err);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [GOONG_API_KEY]);

  // Handle Input Change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputVal(text);
    setSelectedCoords(null);
    onAddressChange(text);

    if (isManualMode) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  // Select place from Goong suggestions
  const handleSelectPrediction = async (prediction: GoongPrediction) => {
    const placeId = prediction.place_id;
    const fullAddress = prediction.description;

    setInputVal(fullAddress);
    setIsOpen(false);
    setPredictions([]);
    setIsLoading(true);

    try {
      // Fetch precise GPS Coordinates (Place Detail)
      const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${GOONG_API_KEY}`;
      const res = await fetch(detailUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const { lat, lng } = data.result.geometry.location;
          const coords = { lat: Number(lat), lng: Number(lng) };
          const resolvedAddress = data.result.formatted_address || fullAddress;

          setInputVal(resolvedAddress);
          setSelectedCoords(coords);
          onAddressChange(resolvedAddress, coords);
          return;
        }
      }
    } catch (err) {
      console.warn('[AddressPicker] Failed to fetch Place Detail from Goong:', err);
    } finally {
      setIsLoading(false);
    }

    // Fallback if Place Detail fails
    onAddressChange(fullAddress);
  };

  const handleClear = () => {
    setInputVal('');
    setSelectedCoords(null);
    setPredictions([]);
    setIsOpen(false);
    onAddressChange('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Search Input Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#ffffff',
          border: isOpen ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '6px 12px',
          boxShadow: isOpen ? '0 0 0 3px rgba(15, 118, 110, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease',
        }}
      >
        <MapPin size={18} color={selectedCoords ? '#0f766e' : '#64748b'} style={{ flexShrink: 0 }} />

        <input
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onFocus={() => {
            if (predictions.length > 0 && !isManualMode) setIsOpen(true);
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '0.88rem',
            color: '#1e293b',
            backgroundColor: 'transparent',
          }}
        />

        {/* Loading Spinner */}
        {isLoading && <Loader2 size={16} className="animate-spin text-teal-600" style={{ flexShrink: 0 }} />}

        {/* Clear Button */}
        {inputVal && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '50%',
            }}
            title="Xóa địa chỉ"
          >
            <X size={15} />
          </button>
        )}

        {/* Toggle Manual/Goong Mode */}
        <button
          type="button"
          onClick={() => {
            setIsManualMode(!isManualMode);
            setIsOpen(false);
          }}
          style={{
            background: isManualMode ? '#f1f5f9' : '#f0fdf4',
            border: '1px solid',
            borderColor: isManualMode ? '#cbd5e1' : '#bbf7d0',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: isManualMode ? '#64748b' : '#15803d',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title={isManualMode ? 'Bấm để bật gợi ý Goong Maps' : 'Bấm để nhập tay tùy chỉnh'}
        >
          {isManualMode ? <Edit3 size={11} /> : <Search size={11} />}
          <span>{isManualMode ? 'Nhập tay' : 'Goong.io'}</span>
        </button>
      </div>

      {/* GPS Verified Badge */}
      {selectedCoords && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
            padding: '3px 8px',
            backgroundColor: '#f0fdf4',
            borderRadius: '6px',
            fontSize: '0.74rem',
            color: '#166534',
            border: '1px solid #dcfce7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={13} color="#16a34a" />
            <span>
              Đã định vị tọa độ Goong GPS: <strong>{selectedCoords.lat.toFixed(5)}</strong>, <strong>{selectedCoords.lng.toFixed(5)}</strong>
            </span>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600 }}>Tự động điền Lat/Lng</span>
        </div>
      )}

      {/* Predictions Dropdown Menu */}
      {isOpen && predictions.length > 0 && !isManualMode && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 9999,
            overflow: 'hidden',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>GỢI Ý ĐỊA ĐIỂM GOONG MAPS</span>
            <span style={{ fontSize: '0.68rem', color: '#0f766e' }}>{predictions.length} kết quả</span>
          </div>

          {predictions.map((p, idx) => {
            const mainText = p.structured_formatting?.main_text || p.description.split(',')[0];
            const secondaryText =
              p.structured_formatting?.secondary_text ||
              p.description.split(',').slice(1).join(',').trim();

            return (
              <div
                key={p.place_id || idx}
                onClick={() => handleSelectPrediction(p)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: idx < predictions.length - 1 ? '1px solid #f8fafc' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#f0fdfa';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div
                  style={{
                    backgroundColor: '#e6fffa',
                    color: '#0f766e',
                    borderRadius: '8px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  <Navigation size={14} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {mainText}
                  </div>
                  {secondaryText && (
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {secondaryText}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
