import type { AxiosResponse } from 'axios';
import request from './request';

export type DeviceInput = {
  name: string;
  purchase_date: string;
  price: number;
  currency: string;
  notes?: string;
  status: 'active' | 'retired';
  reminder_config: unknown;
};

export type Device = DeviceInput & {
  id: number;
};

export interface DeviceGateway {
  getUserDevices: () => Promise<AxiosResponse<{ devices: Device[] }>>;

  getDeviceById: (device_id: number) => Promise<AxiosResponse<Device>>;

  createDevice: (data: DeviceInput) => Promise<AxiosResponse<Device>>;

  deleteDevice: (device_id: number) => Promise<AxiosResponse<void>>;

  updateDevice: (
    device_id: number,
    data: Omit<DeviceInput, 'id'>,
  ) => Promise<AxiosResponse<Device>>;

  updateDeviceStatus: (
    device_id: number,
    status: 'active' | 'retired',
  ) => Promise<AxiosResponse<Device>>;

  updateDeviceReminderConfig: (
    device_id: number,
    reminder_config: unknown,
  ) => Promise<AxiosResponse<Device>>;

  testNotification: (device_id: number) => Promise<AxiosResponse<void>>;
}

export const deviceGateway = (): DeviceGateway => {
  return {
    getUserDevices: () => {
      return request.get<{ devices: Device[] }>('v2/device');
    },

    getDeviceById: (device_id: number) => {
      return request.get<Device>(`v2/device/${device_id}`);
    },

    createDevice: (data: DeviceInput) => {
      return request.post<Device>('v2/device', { device_input: data });
    },

    deleteDevice: (device_id: number) => {
      return request.delete(`v2/device/${device_id}`);
    },

    updateDevice: (device_id: number, data: Omit<DeviceInput, 'id'>) => {
      return request.put<Device>(`v2/device/${device_id}`, { device_input: data });
    },

    updateDeviceStatus: (device_id: number, status: 'active' | 'retired') => {
      return request.patch<Device>(`v2/device/${device_id}/status`, { status });
    },

    updateDeviceReminderConfig: (
      device_id: number,
      reminder_config: unknown,
    ) => {
      return request.patch<Device>(`v2/device/${device_id}/reminders`, {
        reminder_config,
      });
    },

    testNotification: (device_id: number) => {
      return request.post(`v2/device/${device_id}/test-notification`);
    },
  };
};
