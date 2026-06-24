# Logging Plan — structlog + JSON

Logging orchestration plan. The binding rules live in [logging.md](logging.md);
this document records the architecture decisions and the migration from loguru.

## Goal

Single source of truth for logs, emitted as structured JSON, with uniform
rendering across application code and third-party frameworks (uvicorn, taskiq,
sqlalchemy). Three-file routing by noise source, cross-module correlation via
`trace_id`, and a tightened DB persistence gate.

## Architecture

```
structlog.get_logger()  ──wrap_for_formatter──▶  stdlib logging (root)
                                                     │
        ┌────────────────┬──────────────┬───────────┴───────────┬──────────────┐
        ▼                ▼              ▼                       ▼              ▼
   stderr          app_info.log   app_error.log          app_access.log     _DBHandler
 Console/JSON      _InfoFilter    _ErrorFilter           _AccessFilter      _db_enqueue
                                                          (uvicorn.access
                                                           / persist_to)
   shared_processors (run once per record, no side effects):
     add_log_level, add_log_level_number, add_logger_name, TimeStamper,
     format_exc_info, CallsiteParameterAdder, _add_trace_id
```

- `structlog.configure(processors=[filter_by_level, *shared, wrap_for_formatter])`
  routes every `logger.*` call into stdlib logging. `ProcessorFormatter` then
  renders it once per handler.
- Foreign loggers (`uvicorn`, `uvicorn.error`, `uvicorn.access`, `taskiq`,
  `sqlalchemy.engine`) have their handlers cleared and `propagate=True`, so
  they flow to root and get the **same** JSON treatment. This replaces the old
  loguru `InterceptHandler` and its `name`→`origin` workaround.
- `dev.py` passes `log_config=None` to `uvicorn.run` so uvicorn does not re-apply
  its own logging config on startup. Production (gunicorn) must ensure the
  equivalent — the app import already wires propagation, so any deploy that
  imports `app.main` inherits the root configuration.

## Phases (each independently mergeable)

1. **Engine swap** — rewrite `app/core/logger.py` to structlog + stdlib
   `ProcessorFormatter`; add `structlog`, drop `loguru` from `pyproject.toml`;
   `dev.py` `log_config=None`. After this: JSON logs on stderr + three files,
   `trace_id` present, DB persist gated. System fully usable.
2. **Docs** — update `logging.md` §1/§7/§9 to structlog; this plan record.

## Resolved gotchas (load-bearing, do not regress)

1. **`filter_by_level` breaks foreign records.** It must NOT be in
   `shared_processors` / `foreign_pre_chain`: foreign records have no structlog
   wrapper logger, so the processor receives `logger=None` and raises
   `AttributeError`. Keep it only in `structlog.configure`'s own processor list
   (structlog records); foreign records are level-filtered by the stdlib
   handler's `setLevel`.
2. **`ProcessorFormatter` does not catch `DropEvent`** (structlog 26.x). Routing
   cannot be done by a processor raising `DropEvent` — it propagates and trips
   `logging.handleError`. Use `logging.Filter` on each handler instead. Filters
   run before `format`, at which point a structlog record's `record.msg` is still
   the event_dict (dict), so `persist_to` is readable; foreign records use
   `record.name` and `record.levelno`.
3. **`logging.getLevelName("WARNING")` (str→int) is deprecated** on Python 3.14.
   Use `getattr(logging, level_name, logging.WARNING)`.
4. **DB enqueue must run exactly once per record.** It lives only as the
   `_DBHandler`'s terminal processor, never in `shared_processors` — otherwise
   foreign records would enqueue once per handler.
5. **`persist=True` on INFO now actually persists.** The old loguru sink set
   `level=DB_LOG_LEVEL` (WARNING), so `persist=True` on INFO was silently
   filtered out — a latent bug contradicting rule §7. The new `_DBHandler` sits
   at INFO level and `_db_enqueue` enforces the gate (`persist` OR
   level ≥ `DB_LOG_LEVEL`), honoring the documented intent. This is an
   intentional behavior change; the existing `persist=True` call sites
   (`admin.py`, `main.py`) now persist as their authors expected.

## Verification

- `uv run ruff check .` clean on touched files.
- `uv run pytest test -q` → 18 passed (warnings are pre-existing
  Pydantic/slowapi deprecations).
- Isolated routing test (`SAVE_LOGS=true LOG_PATH=...`): `app_info.log` holds
  only INFO..WARNING business traces, `app_error.log` only ERROR+,
  `app_access.log` only `uvicorn.access` + `persist_to=access` — no cross-leak.
- DB gate test (stubbed `log_task`): plain INFO not enqueued; `persist=True`
  INFO and WARNING+ enqueued; `persist` stripped from `extra`.

## Rollback

Pure code swap, no data migration. Revert `app/core/logger.py`, `dev.py`,
`pyproject.toml` (restore `loguru`). Call sites were never touched, so nothing
else needs reverting.
