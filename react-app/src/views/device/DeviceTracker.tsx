import { deviceService, type Device } from '@/services/deviceService';
import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const service = useMemo(() => deviceService(), []);
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
        const updated = await service.updateDeviceStatus(device.id, nextStatus);
        setDevices((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        notifySuccess(
          nextStatus === 'retired' ? '设备已标记为退役' : '设备已恢复使用',
        );
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
    [notifySuccess, service],
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
    <div className="min-h-dvh bg-gray-50 dark:bg-slate-900 pb-24">
      <DeviceHeader
        onClick={() => {
          window.history.back();
        }}
      />

      <motion.main
        className="px-6 py-8 space-y-10 max-w-md mx-auto"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Summary Cards Section */}
        <section className="grid grid-cols-2 gap-4">
          {/* Total Price (Spans 2) */}
          <div className="col-span-2 bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-6 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                设备总价格
              </p>
              <p className="font-bold text-3xl text-[#00288e] dark:text-blue-400 tracking-tight mt-1">
                ¥{totalPrice.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center text-[#00288e] dark:text-blue-400">
              <svg
                className="w-6 h-6"
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
          <div className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-emerald-500/20 flex items-center justify-center text-green-600 dark:text-emerald-400 mb-3">
              <svg
                className="w-5 h-5"
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
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
              使用中
            </p>
            <p className="font-bold text-xl mt-1 text-slate-900 dark:text-white">
              {activeCount}
            </p>
          </div>
          {/* Total */}
          <div className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
              <svg
                className="w-5 h-5"
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
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
              设备总数
            </p>
            <p className="font-bold text-xl mt-1 text-slate-900 dark:text-white">
              {devices.length}
            </p>
          </div>
        </section>

        {/* Main Action Button */}
        <section className="flex justify-center items-center">
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
        <AddDeviceForm onClose={() => setIsAddModalOpen(false)} />
      )}

      <section className="px-6 py-8 max-w-md mx-auto"></section>
    </div>
  );
}
