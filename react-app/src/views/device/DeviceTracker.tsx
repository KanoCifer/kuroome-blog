import {
  deviceService,
  type Device,
  type DeviceService,
} from '@/services/deviceService';
import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useEffect, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import {
  DeviceEmptyState,
  DeviceErrorState,
  DeviceHeader,
  DeviceList,
  DeviceLoadingSkeleton,
  NewButton,
} from './components';
import { AddDeviceForm } from './components/AddDeviceForm';

export default function DeviceTracker() {
  const serviceRef = useRef<DeviceService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = deviceService();
  }
  const service = serviceRef.current;
  const notifySuccess = useNotificationStore((state) => state.success);

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await service.getUserDevices();
      setDevices(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : '设备列表加载失败，请稍后重试。';
      setError(message);
      useNotificationStore.getState().error(message);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const handleToggleStatus = useCallback(
    async (device: Device) => {
      const nextStatus = device.status === 'active' ? 'retired' : 'active';
      setPendingId(device.id);
      try {
        await service.updateDeviceStatus(device.id, nextStatus);
        notifySuccess(
          nextStatus === 'retired' ? '设备已标记为退役' : '设备已恢复使用',
        );
        await fetchDevices();
      } catch (updateError) {
        useNotificationStore
          .getState()
          .error(
            updateError instanceof Error
              ? updateError.message
              : '状态更新失败，请重试。',
          );
      } finally {
        setPendingId(null);
      }
    },
    [fetchDevices, notifySuccess, service],
  );

  const handleDeleteDevice = useCallback(
    async (device: Device) => {
      if (
        !window.confirm(`确定要删除设备 "${device.name}" 吗？此操作不可恢复。`)
      ) {
        return;
      }
      setPendingId(device.id);
      try {
        await service.deleteDevice(device.id);
        setDevices((prev) => prev.filter((item) => item.id !== device.id));
        notifySuccess('设备已删除');
      } catch (deleteError) {
        useNotificationStore
          .getState()
          .error(
            deleteError instanceof Error
              ? deleteError.message
              : '删除失败，请重试。',
          );
      } finally {
        setPendingId(null);
      }
    },
    [notifySuccess, service],
  );

  const activeCount = devices.filter((item) => item.status === 'active').length;
  const totalPrice = devices.reduce((total, device) => total + device.price, 0);

  return (
    <div className="min-h-dvh bg-gray-50/95 pb-24 dark:bg-slate-900/95">
      <DeviceHeader
        onClick={() => {
          window.history.back();
        }}
      />

      <motion.main
        className="mx-auto max-w-md space-y-10 px-6 py-8"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Summary Cards Section */}
        <section className="grid grid-cols-2 gap-4">
          {/* Total Price (Spans 2) */}
          <div className="squircle col-span-2 flex items-center justify-between border border-slate-100 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-slate-800/70 dark:shadow-xl dark:shadow-slate-900/50 dark:backdrop-blur-xl">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                设备总价格
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[#00288e] dark:text-blue-400">
                ¥{totalPrice.toFixed(2)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#00288e] dark:bg-blue-500/20 dark:text-blue-400">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          {/* Active */}
          <div className="squircle border border-slate-100 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-800/70 dark:shadow-xl dark:shadow-slate-900/50 dark:backdrop-blur-xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              使用中
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {activeCount}
            </p>
          </div>
          {/* Total */}
          <div className="squircle border border-slate-100 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-800/70 dark:shadow-xl dark:shadow-slate-900/50 dark:backdrop-blur-xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              设备总数
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {devices.length}
            </p>
          </div>
        </section>

        {/* Main Action Button */}
        <section className="flex items-center justify-center">
          <NewButton onClick={() => setIsAddModalOpen(true)} />
        </section>

        {isLoading ? (
          <DeviceLoadingSkeleton />
        ) : error ? (
          <DeviceErrorState
            message={error}
            onRetry={() => {
              void fetchDevices();
            }}
          />
        ) : devices.length === 0 ? (
          <DeviceEmptyState />
        ) : (
          <DeviceList
            devices={devices}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteDevice}
            pendingId={pendingId}
          />
        )}
      </motion.main>

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <AddDeviceForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchDevices}
        />
      )}

      <section className="mx-auto max-w-md px-6 py-8"></section>
    </div>
  );
}
