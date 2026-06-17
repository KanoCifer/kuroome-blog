import { momentsGateway } from '@/api/momentsGateway';
import type {
  ListAdminMomentsParams,
  ListPublicMomentsParams,
} from '@/api/momentsGateway';
import type {
  Moment,
  MomentCreatePayload,
  MomentListResponse,
  MomentStatus,
  MomentUpdatePayload,
} from '@/types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const EMPTY_LIST: MomentListResponse = {
  moments: [],
  total: 0,
  page: 1,
  page_size: 20,
};

export const useMomentsStore = defineStore('moments', () => {
  // ───────────── 公共列表状态 ─────────────
  const publicList = ref<Moment[]>([]);
  const publicTotal = ref(0);
  const publicPage = ref(1);
  const publicPageSize = ref(20);
  const publicActiveTag = ref<string | null>(null);

  // ───────────── 管理员列表状态 ─────────────
  const adminList = ref<Moment[]>([]);
  const adminTotal = ref(0);
  const adminPage = ref(1);
  const adminPageSize = ref(20);
  const adminStatus = ref<MomentStatus | null>(null);

  // ───────────── 当前条目 ─────────────
  const current = ref<Moment | null>(null);

  // ───────────── 通用状态 ─────────────
  const loading = ref(false);
  const submitting = ref(false);
  const error = ref<string | null>(null);

  function resetPublic() {
    publicList.value = EMPTY_LIST.moments;
    publicTotal.value = EMPTY_LIST.total;
    publicPage.value = EMPTY_LIST.page;
    publicPageSize.value = EMPTY_LIST.page_size;
    publicActiveTag.value = null;
  }

  function resetAdmin() {
    adminList.value = EMPTY_LIST.moments;
    adminTotal.value = EMPTY_LIST.total;
    adminPage.value = EMPTY_LIST.page;
    adminPageSize.value = EMPTY_LIST.page_size;
    adminStatus.value = null;
  }

  async function fetchPublic(params: ListPublicMomentsParams = {}) {
    loading.value = true;
    error.value = null;
    try {
      const page = params.page ?? publicPage.value;
      const page_size = params.page_size ?? publicPageSize.value;
      const tag = params.tag !== undefined ? params.tag : publicActiveTag.value;
      const data = await momentsGateway.listPublic({
        page,
        page_size,
        tag: tag ?? undefined,
      });
      publicList.value = data.moments;
      publicTotal.value = data.total;
      publicPage.value = data.page;
      publicPageSize.value = data.page_size;
      publicActiveTag.value = tag ?? null;
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '加载碎碎念失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAdmin(params: ListAdminMomentsParams = {}) {
    loading.value = true;
    error.value = null;
    try {
      const page = params.page ?? adminPage.value;
      const page_size = params.page_size ?? adminPageSize.value;
      const status = params.status !== undefined ? params.status : adminStatus.value;
      const data = await momentsGateway.listAdmin({
        page,
        page_size,
        status: status ?? undefined,
      });
      adminList.value = data.moments;
      adminTotal.value = data.total;
      adminPage.value = data.page;
      adminPageSize.value = data.page_size;
      adminStatus.value = status ?? null;
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '加载碎碎念失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchOne(id: string, admin = false) {
    loading.value = true;
    error.value = null;
    try {
      const data = admin
        ? await momentsGateway.getAdmin(id)
        : await momentsGateway.get(id);
      current.value = data.moment;
      return data.moment;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '加载碎碎念失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: MomentCreatePayload) {
    submitting.value = true;
    error.value = null;
    try {
      const data = await momentsGateway.create(payload);
      return data.moment;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '发布碎碎念失败';
      throw err;
    } finally {
      submitting.value = false;
    }
  }

  async function update(id: string, payload: MomentUpdatePayload) {
    submitting.value = true;
    error.value = null;
    try {
      const data = await momentsGateway.update(id, payload);
      // 同步刷新当前条目
      if (current.value?.id === id) {
        current.value = data.moment;
      }
      return data.moment;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '更新碎碎念失败';
      throw err;
    } finally {
      submitting.value = false;
    }
  }

  async function remove(id: string) {
    submitting.value = true;
    error.value = null;
    try {
      await momentsGateway.remove(id);
      // 同步从两侧列表里剔除
      publicList.value = publicList.value.filter((m) => m.id !== id);
      adminList.value = adminList.value.filter((m) => m.id !== id);
      if (current.value?.id === id) {
        current.value = null;
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '删除碎碎念失败';
      throw err;
    } finally {
      submitting.value = false;
    }
  }

  return {
    // state
    publicList,
    publicTotal,
    publicPage,
    publicPageSize,
    publicActiveTag,
    adminList,
    adminTotal,
    adminPage,
    adminPageSize,
    adminStatus,
    current,
    loading,
    submitting,
    error,
    // actions
    resetPublic,
    resetAdmin,
    fetchPublic,
    fetchAdmin,
    fetchOne,
    create,
    update,
    remove,
  };
});
