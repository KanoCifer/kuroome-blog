export interface AMapSecurityConfig {
  securityJsCode: string;
}

export interface AMapMarker {
  position: [number, number];
  content?: string;
  offset?: unknown;
}

export interface AMapPolyline {
  setPath: (path: [number, number][]) => void;
  setMap: (map: AMapMapInstance | null) => void;
}

export interface AMapDrivingResult {
  routes: Array<{
    distance: number;
    time: number;
    steps: Array<{
      path: [number, number][];
    }>;
  }>;
}

export interface AMapDriving {
  search: (
    start: [number, number],
    end: [number, number],
    callback: (status: string, result: AMapDrivingResult | string) => void,
  ) => void;
  clear: () => void;
}

export interface AMapMapInstance {
  addControl: (control: unknown) => void;
  on: (event: 'click', handler: (e: unknown) => void) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setMapStyle: (style: string) => void;
  add: (overlay: unknown) => void;
  remove: (overlay: unknown) => void;
  setFitView: () => void;
  destroy: () => void;
  off: (event: 'click', handler: (e: unknown) => void) => void;
}

export interface AMapTileLayerInstance {
  setMap: (mapInstance: AMapMapInstance | null) => void;
}

export interface AMapMarkerInstance {
  on: (event: 'click', handler: () => void) => void;
  setMap: (mapInstance: AMapMapInstance | null) => void;
}

export interface AMapGeolocationInstance {
  getCurrentPosition: (
    callback: (status: string, result: unknown) => void,
  ) => void;
}

export interface AMapCitySearchInstance {
  getLocalCity: (callback: (status: string, result: unknown) => void) => void;
}

export interface AMapNamespace {
  Geolocation: new (options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    buttonPosition?: string;
    buttonOffset?: unknown;
  }) => AMapGeolocationInstance;
  CitySearch: new () => AMapCitySearchInstance;
  Map: new (
    container: HTMLDivElement,
    options: {
      viewMode: '2D' | '3D';
      zoom: number;
      center: [number, number];
      layers?: unknown[];
      mapStyle?: string;
    },
  ) => AMapMapInstance;
  TileLayer: {
    Satellite: new () => AMapTileLayerInstance;
  };
  Marker: new (options: {
    position: [number, number];
    content?: string;
    offset?: unknown;
  }) => AMapMarkerInstance;
  Polyline: new (options: {
    path: [number, number][];
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    lineJoin?: string;
    lineCap?: string;
  }) => AMapPolyline;
  Driving: new (options?: {
    map?: AMapMapInstance;
    policy?: number;
    showTraffic?: boolean;
  }) => AMapDriving;
  ToolBar: new (opts?: unknown) => unknown;
  Scale: new () => unknown;
  Pixel: new (x: number, y: number) => unknown;
  DrivingPolicy: {
    LEAST_TIME: number;
    LEAST_FEE: number;
    LEAST_DISTANCE: number;
    REAL_TRAFFIC: number;
  };
}
