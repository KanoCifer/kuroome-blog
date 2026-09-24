package monitor

import (
	"context"
	"math"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/mem"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

type SystemMetrics struct {
	visitor   *postgres.VisitorRepo
	version   string
	startTime time.Time
}

func NewSystemMetrics(visitor *postgres.VisitorRepo, version string) *SystemMetrics {
	return &SystemMetrics{visitor: visitor, version: version, startTime: time.Now()}
}

func (s *SystemMetrics) GetStatusDetail(ctx context.Context) (dto.StatusDetailResponse, error) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	cpuCountL, _ := cpu.Counts(true)
	cpuCountP, _ := cpu.Counts(false)
	cpuPercent := 0.0
	if p, err := cpu.Percent(0, false); err == nil && len(p) > 0 {
		cpuPercent = math.Round(p[0])
	}
	loadAvg := &load.AvgStat{}
	if la, err := load.Avg(); err == nil {
		loadAvg = la
	}
	cpuInfo, _ := cpu.Info()
	vm, _ := mem.VirtualMemory()
	sysInfo := dto.SystemInfoResponse{SystemTime: time.Now().Format("2006/01/02 15:04:05"), SystemTimezone: "GMT+8",
		OsName: runtime.GOOS, OsVersion: runtime.GOARCH, KernelVersion: runtime.GOARCH, CpuModel: cpuInfo[0].ModelName,
		CpuCountPhysical: cpuCountP, CpuCountLogical: cpuCountL,
		LoadAverage: map[string]float64{"1m": math.Round(loadAvg.Load1*100) / 100, "5m": math.Round(loadAvg.Load5*100) / 100, "15m": math.Round(loadAvg.Load15*100) / 100},
		CpuPercent:  cpuPercent, MemoryUsagePercent: round2(vm.UsedPercent), MemoryUsedBytes: vm.Used, MemoryTotalBytes: vm.Total}
	dbOk := true
	if err := s.visitor.Ping(ctx); err != nil {
		dbOk = false
	}
	svcInfo := dto.ServiceInfoResponse{Runtime: runtime.Version() + " " + runtime.GOOS + "/" + runtime.GOARCH, GoVersion: runtime.Version(),
		Goroutines: runtime.NumGoroutine(), GcCount: m.NumGC, StartTime: s.startTime.Unix(), HeapMemoryBytes: m.Alloc, TotalMemoryBytes: m.TotalAlloc,
		DbOk: dbOk, ApiOk: true}
	verInfo := dto.VersionInfoResponse{RepoURL: "https://github.com/KanoCifer/kuroome-blog", CurrentVersion: s.version}
	return dto.StatusDetailResponse{Version: verInfo, Service: svcInfo, System: sysInfo}, nil
}

func (s *SystemMetrics) GetServerStatus() (dto.ServerStatusResponse, error) {
	cpuPercents, err := cpu.Percent(time.Second, false)
	if err != nil {
		return dto.ServerStatusResponse{}, err
	}
	var cpuPercent float64
	if len(cpuPercents) > 0 {
		cpuPercent = cpuPercents[0]
	}
	cpuCores, err := cpu.Counts(true)
	if err != nil {
		return dto.ServerStatusResponse{}, err
	}
	vm, err := mem.VirtualMemory()
	if err != nil {
		return dto.ServerStatusResponse{}, err
	}
	du, err := disk.Usage("/")
	if err != nil {
		return dto.ServerStatusResponse{}, err
	}
	return dto.ServerStatusResponse{CPUPercent: math.Round(cpuPercent), CPUCores: cpuCores, MemTotal: int(math.Round(float64(vm.Total) / 1024 / 1024)), MemUsed: int(math.Round(float64(vm.Used) / 1024 / 1024)), MemUsage: round2(vm.UsedPercent), DiskTotal: round2(float64(du.Total) / 1024 / 1024 / 1024), DiskUsed: round2(float64(du.Used) / 1024 / 1024 / 1024), DiskUsage: round2(du.UsedPercent)}, nil
}

func (s *SystemMetrics) StreamServerStatus(ctx context.Context) (<-chan dto.ServerStatusResponse, error) {
	ch := make(chan dto.ServerStatusResponse)
	go func() {
		defer close(ch)
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				status, err := s.GetServerStatus()
				if err != nil {
					continue
				}
				select {
				case ch <- status:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	return ch, nil
}

func round2(x float64) float64 { return math.Round(x*100) / 100 }
