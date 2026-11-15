import { getApiHost } from './apiConfig';

export const DEFAULT_VERIFIED_POD_PHOTO = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';

export const resolvePodUrl = (rawUrl?: string): string => {
  if (!rawUrl || !rawUrl.trim()) return DEFAULT_VERIFIED_POD_PHOTO;
  const trimmed = rawUrl.trim();
  const orderApi = `${getApiHost(3004)}/orders`;
  
  // Proxy AWS S3 URLs through backend order-service to avoid 403 S3 Bucket Access Denied
  if (trimmed.includes('s3.amazonaws.com') || trimmed.includes('.s3.')) {
    const key = trimmed.replace(/^https?:\/\/[^\/]+\//, '');
    return `${orderApi}/pod-photo/${key}`;
  }
  if (trimmed.startsWith('/orders/pod-photo')) {
    return `${orderApi.replace(/\/orders$/, '')}${trimmed}`;
  }
  return trimmed;
};
