import type { ServerStatusData } from '../types';

interface ServerStatusCardProps {
  status: ServerStatusData | null;
}

interface MeterRowProps {
  label: string;
  percent: number;
  details: string;
  color: string;
}

function MeterRow({ label, percent, details, color }: MeterRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-card-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{details}</span>
      </div>
      <div className="bg-secondary h-3 w-full rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(0, Math.min(percent, 100))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export function ServerStatusCard({ status }: ServerStatusCardProps) {
  const cpu = status?.cpuPercent ?? 0;
  const mem = status?.memoryUsagePercent ?? 0;
  const disk = status?.diskUsagePercent ?? 0;

  return (
    <article className="border-border/60 bg-background/85 rounded-3xl border p-3.5 shadow-sm">
      <h3 className="text-foreground text-base font-semibold">
        Server Status Snapshot
      </h3>
      <p className="text-muted-foreground mt-1 text-xs">
        Resource overview with one-click refresh
      </p>

      <div className="mt-4 space-y-4">
        <MeterRow
          label="CPU"
          percent={cpu}
          details={`${cpu.toFixed(1)}% · ${status?.cpuCores ?? 0} cores`}
          color="#f59e0b"
        />
        <MeterRow
          label="Memory"
          percent={mem}
          details={`${status?.memoryUsedMb ?? 0} / ${status?.memoryTotalMb ?? 0} MB`}
          color="#8b5cf6"
        />
        <MeterRow
          label="Disk"
          percent={disk}
          details={`${status?.diskUsedGb ?? 0} / ${status?.diskTotalGb ?? 0} GB`}
          color="#3b82f6"
        />
      </div>
    </article>
  );
}
