/**
 * 位置解析（LocationResolver）—— 把「我现在在哪」从地图渲染关注点里剥离。
 *
 * 职责：
 * - 浏览器原生 Geolocation（街道级，WGS-84）→ 转 GCJ-02
 * - 失败时降级到 IP 定位（城市级矩形中心）
 * - 返回统一坐标系 [lng, lat]（GCJ-02，与 AMap 一致）
 *
 * 抽出原因：原本这段链路埋在 MapContainer.vue（渲染组件）里，
 * dashboard 的数据拉取要穿过地图组件、经 template ref 拿坐标，
 * 渲染与数据获取被耦死。提到独立模块后：
 * - 渲染（地图）与数据获取（store）各调各的，不再互相依赖
 * - 坐标转换 / 兜底链可单测，不用挂载地图组件
 *
 * 坐标转换依赖外部 AMap，通过 CoordConverter 端口注入：
 * 生产由 AMap 提供，测试用 in-memory 实现 —— 一个端口、两个 adapter。
 */

/** 坐标转换端口：把 WGS-84 转 GCJ-02，以及 IP 城市级定位 */
export interface CoordConverter {
  /** WGS-84 → GCJ-02；转换失败时降级返回原始坐标（实现内处理，不抛错） */
  fromGps(lng: number, lat: number): Promise<[number, number]>;
  /** IP 兜底定位：成功返回城市级矩形中心 [lng, lat]，失败抛带可读信息的 Error */
  locateByIp(): Promise<[number, number]>;
}

export interface LocateOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * 解析当前位置 [lng, lat]（GCJ-02）。
 *
 * 链路：浏览器 Geolocation (WGS-84) → CoordConverter.fromGps → GCJ-02
 *      失败 → CoordConverter.locateByIp (GCJ-02 城市级) → 抛错
 * 桌面 Mac / 关 Wi-Fi 时 CoreLocation 必失败，IP 兜底仍是核心路径。
 *
 * @throws Error 浏览器与 IP 定位都失败时抛出，含可读原因
 */
export async function resolveCurrentPosition(
  converter: CoordConverter,
  options: LocateOptions = {},
): Promise<[number, number]> {
  const {
    enableHighAccuracy = false,
    timeout = 10_000,
    maximumAge = 60_000,
  } = options;

  // GeolocationPositionError → 可读标签
  const labelGeoError = (err: GeolocationPositionError): string => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return '用户拒绝授权';
      case err.POSITION_UNAVAILABLE:
        return '位置不可用(可能关 Wi-Fi / 关 macOS 定位服务)';
      case err.TIMEOUT:
        return '定位超时';
      default:
        return `未知错误 (${err.message || 'code=' + err.code})`;
    }
  };

  const tryIPFallback = async (
    browserReason: string,
  ): Promise<[number, number]> => {
    try {
      return await converter.locateByIp();
    } catch (ipErr) {
      const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
      throw new Error(
        `浏览器定位失败 (${browserReason});IP 定位也失败 (${ipMsg})。` +
          '请检查 macOS 位置服务 / Wi-Fi / 浏览器位置权限,或临时关闭广告拦截扩展',
      );
    }
  };

  if (navigator.geolocation) {
    return new Promise<[number, number]>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const gcj = await converter.fromGps(
            pos.coords.longitude,
            pos.coords.latitude,
          );
          resolve(gcj);
        },
        (err) => {
          void tryIPFallback(labelGeoError(err)).then(resolve, reject);
        },
        { enableHighAccuracy, timeout, maximumAge },
      );
    });
  }

  // 浏览器不支持 Geolocation（罕见），直接走 IP
  return tryIPFallback('浏览器不支持 Geolocation API');
}
