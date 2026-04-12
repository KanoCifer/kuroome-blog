import { deviceGateway } from "@/api/deviceGateway";
import type { Device, DeviceInput } from "@/api/deviceGateway";
import { useNotificationStore } from "@/stores/notification";

export type { Device, DeviceInput };

export interface DeviceService {
  getUserDevices: () => Promise<Device[]>;
  getDeviceById: (device_id: number) => Promise<Device>;
  createDevice: (data: DeviceInput) => Promise<Device>;
  updateDevice: (device_id: number, data: Omit<DeviceInput, "id">) => Promise<Device>;
  deleteDevice: (device_id: number) => Promise<void>;
  updateDeviceStatus: (device_id: number, status: "active" | "retired") => Promise<Device>;
  updateDeviceReminderConfig: (device_id: number, reminder_config: unknown) => Promise<Device>;
  testNotification: (device_id: number) => Promise<void>;
}

const gateway = deviceGateway;

export const deviceService: DeviceService = {
  async getUserDevices(): Promise<Device[]> {
    return gateway.getUserDevices();
  },

  async getDeviceById(device_id: number): Promise<Device> {
    if (!device_id || device_id <= 0) {
      return Promise.reject(new Error("无效的设备ID"));
    }
    return gateway.getDeviceById(device_id);
  },

  async createDevice(data: DeviceInput): Promise<Device> {
    if (!data.name?.trim()) {
      return Promise.reject(new Error("设备名称不能为空"));
    }
    if (data.price < 0) {
      return Promise.reject(new Error("价格不能为负数"));
    }
    if (!["active", "retired"].includes(data.status)) {
      return Promise.reject(new Error("设备状态无效"));
    }
    return gateway.createDevice(data);
  },

  async updateDevice(device_id: number, data): Promise<Device> {
    if (!device_id || device_id <= 0) {
      return Promise.reject(new Error("无效的设备ID"));
    }
    if (data.name !== undefined && !data.name.trim()) {
      return Promise.reject(new Error("设备名称不能为空"));
    }
    return gateway.updateDevice(device_id, data);
  },

  async deleteDevice(device_id: number): Promise<void> {
    if (!device_id || device_id <= 0) {
      return Promise.reject(new Error("无效的设备ID"));
    }
    return gateway.deleteDevice(device_id);
  },

  async updateDeviceStatus(device_id: number, status): Promise<Device> {
    if (!device_id || device_id <= 0) {
      return Promise.reject(new Error("无效的设备ID"));
    }
    if (!["active", "retired"].includes(status)) {
      return Promise.reject(new Error("设备状态无效"));
    }
    return gateway.updateDeviceStatus(device_id, status);
  },

  async updateDeviceReminderConfig(device_id: number, reminder_config: unknown): Promise<Device> {
    if (!device_id || device_id <= 0) {
      return Promise.reject(new Error("无效的设备ID"));
    }
    return gateway.updateDeviceReminderConfig(device_id, reminder_config);
  },

  async testNotification(device_id: number): Promise<void> {
    if (!device_id || device_id <= 0) {
      return Promise.reject(new Error("无效的设备ID"));
    }
    return gateway.testNotification(device_id);
  },
};
