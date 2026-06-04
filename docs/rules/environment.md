# Environment & Key Files

## Key Files

- Backend entry: `backend/app/main.py`
- Frontend entry: `frontend/src/main.ts`
- React entry: `react-app/src/main.tsx`
- Config: `config/` (migration config: `mcporter.json`)
- Core modules: `03_Core_Modules.md` (API documentation)
- Changelog: `react-app/src/data/changelog.json` (also `frontend/src/data/changelog.json`)

## Required Env Vars

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/readinglist
SECRET_KEY=your-secret-key
```

See `backend/.env`, `frontend/.env`, `react-app/.env` for full list.
