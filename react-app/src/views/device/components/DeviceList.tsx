import { motion } from 'framer-motion';

import type { Device } from '@/services/deviceService';
import { DeviceCard } from './DeviceCard';

interface DeviceListProps {
  devices: Device[];
  onToggleStatus: (device: Device) => void;
  onDelete: (device: Device) => void;
  onConfigSuccess: (device: Device) => void;
  pendingId: number | null;
}

export function DeviceList({
  devices,
  onToggleStatus,
  onDelete,
  onConfigSuccess,
  pendingId,
}: DeviceListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-3"
    >
      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onConfigSuccess={onConfigSuccess}
          pendingId={pendingId}
        />
      ))}
    </motion.div>
  );
}
