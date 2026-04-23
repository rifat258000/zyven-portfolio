import os
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Ensure data/ directory exists for SQLite
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

SECRET_KEY = os.environ.get("SECRET_KEY", "zyven-portfolio-secret-change-me-2026")
ADMIN_PASSWORD_HASH = generate_password_hash(os.environ.get("ADMIN_PASSWORD", "zyven@admin2026"))
SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(DATA_DIR, 'app.db')}"
SQLALCHEMY_TRACK_MODIFICATIONS = False
