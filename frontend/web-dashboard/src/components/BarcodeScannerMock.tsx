import React, { useState, useEffect } from 'react';
import { Camera, X, CheckCircle } from 'lucide-react';

interface BarcodeScannerMockProps {
  onScan: (code: string) => void;
  onClose: () => void;
  mockCodes?: string[];
}

const BarcodeScannerMock: React.FC<BarcodeScannerMockProps> = ({ onScan, onClose, mockCodes = ['SKU-12345', 'LOT-98765'] }) => {
  const [scanning, setScanning] = useState(true);

  // Simulating the camera scanning effect
  useEffect(() => {
    if (!scanning) return;
    
    // Auto scan after 2 seconds for demo purposes
    const timer = setTimeout(() => {
      handleSuccessScan();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [scanning]);

  const handleSuccessScan = () => {
    setScanning(false);
    // Pick a random code from the mock list
    const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];
    
    // Wait a bit before returning the result so user sees the success state
    setTimeout(() => {
      onScan(randomCode);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
      >
        <X size={24} />
      </button>
      
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white mb-2">Đưa mã vạch vào khung</h3>
        <p className="text-white/70 text-sm">Hệ thống sẽ tự động nhận diện Barcode hoặc QR Code</p>
      </div>
      
      <div className="relative w-full max-w-sm aspect-square border-2 border-white/20 rounded-2xl overflow-hidden mb-8">
        {/* Scanner line animation */}
        {scanning && (
          <div className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(103,80,164,0.8)] animate-[scan_2s_ease-in-out_infinite]" 
               style={{ 
                 top: '0%', 
                 animationName: 'scanVertical', 
                 animationDuration: '2s', 
                 animationIterationCount: 'infinite' 
               }} 
          />
        )}
        
        {/* Camera placeholder */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/5">
          {scanning ? (
            <Camera size={48} className="text-white/30" />
          ) : (
            <CheckCircle size={64} className="text-green-500 animate-fade-in" />
          )}
        </div>
        
        {/* Corner markers */}
        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
      </div>
      
      {!scanning && (
        <div className="text-green-400 font-bold text-lg animate-fade-in">
          Quét thành công!
        </div>
      )}
      
      <button 
        onClick={handleSuccessScan}
        className="mt-8 px-6 py-3 bg-primary text-primary-on rounded-xl font-medium active:scale-95 transition-transform"
      >
        (Bấm để giả lập quét)
      </button>

      <style>{`
        @keyframes scanVertical {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default BarcodeScannerMock;
