# backend/watchlist/ — Flask Backend (LEGACY)

> **LEGACY** — Original Flask application. Being replaced by FastAPI in `backend/app/`. **DO NOT add new features here.**

## Overview

Original Flask API at `/api/*`. Still serves production traffic but gradually being migrated to FastAPI.

## Structure

```
watchlist/
├── api/                # RESTful API routes (v1)
│   ├── book.py        # Books CRUD
│   ├── auth.py        # Authentication
│   └── ...
├── api_v1/            # Legacy API routes
├── models.py          # SQLAlchemy 1.x models (legacy style)
├── extensions.py     # Flask extensions (db, login, mongo, mail)
├── templates/         # Legacy Jinja2 templates
└── media/            # User-uploaded files
```

## Entry Point

- **Dev:** Run via Flask dev server (port `:5050`)
- **WSGI:** `backend/wsgi.py` — production entry

## Key Patterns

### Flask-SQLAlchemy (1.x style)
```python
class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    user_id = db.Column(db.Integer, ForeignKey("user.id"))
```

### Flask-Login
```python
from flask_login import login_required, current_user

@api_bp.route("/books")
@login_required
def get_books():
    books = Book.query.filter_by(user_id=current_user.id).all()
    return jsonify([{"id": b.id, "title": b.title} for b in books])
```

### PyMongo (MongoDB)
```python
mongo.db.message_board.insert_one({
    "review": "...",
    "user_id": current_user.id,
    "created_at": datetime.utcnow()
})
```

## Status

- **Deprecated** — New features go in `backend/app/` (FastAPI)
- Still functional — serves as fallback during migration
- Do NOT add new features here
- MongoDB integration for message_board and posts
- Flask-Login for authentication

## Migration Notes

- Migrate to FastAPI in `backend/app/` for new features
- Keep Flask running until FastAPI migration complete
- Reference old logic in `api/` folder for feature parity
