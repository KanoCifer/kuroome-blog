import type { AxiosResponse } from 'axios';

import { deviceGateway, type Device, type DeviceInput } from '@/api/deviceGateway';
import { extractData } from '@/api/request';
import type { ApiResponse } from '@/api/request';

export type { Device, DeviceInput };

export const deviceService = () => {
  const gateway = deviceGateway();

  return {
    getUserDevices: async (): Promise<Device[]> => {
      const res = await gateway.getUserDevices();
      const data = extractData(res as unknown as { data: ApiResponse<unknown> }) as { devices: Device[] };
      return data.devices;
    },

    getDeviceById: async (device_id: number): Promise<Device> => {
      if (!device_id || device_id <= 0) {
        return Promise.reject(new Error('无效的设备ID'));
      }
      const res: AxiosResponse<Device> = await gateway.getDeviceById(device_id);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as Device;
    },

    createDevice: async (data: DeviceInput): Promise<Device> => {
      if (!data.name?.trim()) {
        return Promise.reject(new Error('设备名称不能为空'));
      }
      if (data.price < 0) {
        return Promise.reject(new Error('价格不能为负数'));
      }
      if (!['active', 'retired'].includes(data.status)) {
        return Promise.reject(new Error('设备状态无效'));
      }
      const res: AxiosResponse<Device> = await gateway.createDevice(data);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as Device;
    },

    updateDevice: async (device_id: number, data: Omit<DeviceInput, 'id'>): Promise<Device> => {
      if (!device_id || device_id <= 0) {
        return Promise.reject(new Error('无效的设备ID'));
      }
      if (data.name !== undefined && !data.name.trim()) {
        return Promise.reject(new Error('设备名称不能为空'));
      }
      const res: AxiosResponse<Device> = await gateway.updateDevice(device_id, data);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as Device;
    },

    deleteDevice: async (device_id: number): Promise<void> => {
      if (!device_id || device_id <= 0) {
        return Promise.reject(new Error('无效的设备ID'));
      }
      const res: AxiosResponse<void> = await gateway.deleteDevice(device_id);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as void;
    },

    updateDeviceStatus: async (
      device_id: number,
      status: 'active' | 'retired',
    ): Promise<Device> => {
      if (!device_id || device_id <= 0) {
        return Promise.reject(new Error('无效的设备ID'));
      }
      if (!['active', 'retired'].includes(status)) {
        return Promise.reject(new Error('设备状态无效'));
      }
      const res: AxiosResponse<Device> = await gateway.updateDeviceStatus(device_id, status);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as Device;
    },

    updateDeviceReminderConfig: async (
      device_id: number,
      reminder_config: unknown,
    ): Promise<Device> => {
      if (!device_id || device_id <= 0) {
        return Promise.reject(new Error('无效的设备ID'));
      }
      const res: AxiosResponse<Device> = await gateway.updateDeviceReminderConfig(device_id, reminder_config);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as Device;
    },

    testNotification: async (device_id: number): Promise<void> => {
      if (!device_id || device_id <= 0) {
        return Promise.reject(new Error('无效的设备ID'));
      }
      const res: AxiosResponse<void> = await gateway.testNotification(device_id);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as void;
    },
  };
};
