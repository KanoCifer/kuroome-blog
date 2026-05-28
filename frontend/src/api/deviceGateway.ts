import request from '@/api/request';

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
  getUserDevices: () => Promise<Device[]>;
  getUserGlobalConfig: () => Promise<{ config: Record<string, unknown> }>;
  getDeviceById: (device_id: number) => Promise<Device>;
  createDevice: (data: DeviceInput) => Promise<Device>;
  deleteDevice: (device_id: number) => Promise<void>;
  updateDevice: (
    device_id: number,
    data: Omit<DeviceInput, 'id'>,
  ) => Promise<Device>;
  updateDeviceStatus: (
    device_id: number,
    status: 'active' | 'retired',
  ) => Promise<Device>;
  updateDeviceReminderConfig: (
    device_id: number,
    reminder_config: unknown,
  ) => Promise<Device>;
  testNotification: (device_id: number) => Promise<void>;
}

export const deviceGateway: DeviceGateway = {
  async getUserDevices() {
    const res = await request.get<{ data: { devices: Device[] } }>('v2/device');
    return res.data.data.devices;
  },

  async getUserGlobalConfig() {
    const res = await request.get<{
      data: { config: Record<string, unknown> };
    }>('v2/subscriptions/global-config');
    return res.data.data;
  },

  async getDeviceById(device_id: number) {
    const res = await request.get<{ data: Device }>(`v2/device/${device_id}`);
    return res.data.data;
  },

  async createDevice(data: DeviceInput) {
    const res = await request.post<{ data: Device }>('v2/device', data);
    return res.data.data;
  },

  async deleteDevice(device_id: number) {
    await request.delete(`v2/device/${device_id}`);
  },

  async updateDevice(device_id: number, data) {
    const res = await request.put<{ data: Device }>(`v2/device/${device_id}`, {
      device_input: data,
    });
    return res.data.data;
  },

  async updateDeviceStatus(device_id: number, status: 'active' | 'retired') {
    const res = await request.patch<{ data: Device }>(
      `v2/device/${device_id}/status`,
      { status },
    );
    return res.data.data;
  },

  async updateDeviceReminderConfig(
    device_id: number,
    reminder_config: unknown,
  ) {
    const res = await request.patch<{ data: Device }>(
      `v2/device/${device_id}/reminders`,
      {
        reminder_config,
      },
    );
    return res.data.data;
  },

  async testNotification(device_id: number) {
    await request.post(`v2/device/${device_id}/test-notification`);
  },
};
