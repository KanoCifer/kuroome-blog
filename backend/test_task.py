import asyncio
import contextlib
import datetime
import os
import signal
import sys
from pathlib import Path

from app.tasks.aps_tasks import run_migration_job
from app.tasks.broker import broker
from app.tasks.scheduler import redis_schedule_source


async def _start_taskiq_processes(
    project_root: Path,
) -> list[asyncio.subprocess.Process]:
    env = os.environ.copy()
    worker_cmd = [
        sys.executable,
        "-m",
        "taskiq",
        "worker",
        "app.tasks.broker:broker",
        "--fs-discover",
    ]
    scheduler_cmd = [
        sys.executable,
        "-m",
        "taskiq",
        "scheduler",
        "app.tasks.scheduler:scheduler",
        "--fs-discover",
    ]

    print("[Taskiq] Starting worker and scheduler subprocesses...")
    worker = await asyncio.create_subprocess_exec(
        *worker_cmd,
        cwd=str(project_root),
        env=env,
    )
    scheduler_proc = await asyncio.create_subprocess_exec(
        *scheduler_cmd,
        cwd=str(project_root),
        env=env,
    )
    print("[Taskiq] Worker and scheduler subprocesses started.")
    return [worker, scheduler_proc]


async def _stop_taskiq_processes(
    processes: list[asyncio.subprocess.Process],
) -> None:
    if not processes:
        return

    for proc in processes:
        with contextlib.suppress(ProcessLookupError):
            proc.send_signal(signal.SIGTERM)

    for proc in processes:
        with contextlib.suppress(Exception):
            await asyncio.wait_for(proc.wait(), timeout=10)
        if proc.returncode is None:
            with contextlib.suppress(ProcessLookupError):
                proc.kill()
            with contextlib.suppress(Exception):
                await proc.wait()


async def test():
    # 启动 broker，然后拉起 scheduler/worker 子进程
    project_root = Path(__file__).resolve().parent
    await broker.startup()
    taskiq_processes = await _start_taskiq_processes(project_root)

    try:
        print("Testing dynamic scheduling...")
        await redis_schedule_source.startup()
        await run_migration_job.schedule_by_interval(
            redis_schedule_source,
            datetime.timedelta(seconds=5),
        )

        # 等待 15 秒，看定时任务是否触发
        print("Waiting 15 seconds for scheduled task...")
        await asyncio.sleep(15)
    finally:
        with contextlib.suppress(Exception):
            await redis_schedule_source.shutdown()
        await _stop_taskiq_processes(taskiq_processes)
        await broker.shutdown()


if __name__ == "__main__":
    asyncio.run(test())
