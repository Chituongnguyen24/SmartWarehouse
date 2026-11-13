import dynamic from 'next/dynamic';

export { default as PaymentSimulatorModal } from './components/PaymentSimulatorModal';
export { default as AddressSelector } from './components/AddressSelector';
export { CustomerLiveTrackingMap } from './components/CustomerLiveTrackingMap';

export const MapPicker = dynamic(() => import('./components/MapPicker'), { ssr: false });
