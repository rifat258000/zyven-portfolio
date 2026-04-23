"""Flask application — portfolio + contest tracker."""
import os
import secrets
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, jsonify, request, render_template, session, abort
from flask_cors import CORS
from werkzeug.security import check_password_hash

from models import db, Contest, Project, SiteConfig
import config as cfg


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = cfg.SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = cfg.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    CORS(app)
    return app


app = create_app()


# ── Auth helpers ──────────────────────────────────────────

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin"):
            token = request.headers.get("X-Admin-Token", "")
            if token != session.get("token", ""):
                return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Pages ─────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/admin")
def admin_page():
    return render_template("admin.html")


# ── Auth API ──────────────────────────────────────────────

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    password = data.get("password", "")
    if check_password_hash(cfg.ADMIN_PASSWORD_HASH, password):
        session["admin"] = True
        token = secrets.token_hex(32)
        session["token"] = token
        return jsonify({"ok": True, "token": token})
    return jsonify({"error": "Wrong password"}), 401


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/auth/check")
def auth_check():
    return jsonify({"authenticated": bool(session.get("admin"))})


# ── Site Config API ───────────────────────────────────────

@app.route("/api/config")
def get_config():
    rows = SiteConfig.query.all()
    return jsonify({r.key: r.value for r in rows})


@app.route("/api/config", methods=["PUT"])
@admin_required
def update_config():
    data = request.get_json(silent=True) or {}
    for key, value in data.items():
        row = SiteConfig.query.get(key)
        if row:
            row.value = str(value)
        else:
            db.session.add(SiteConfig(key=key, value=str(value)))
    db.session.commit()
    return jsonify({"ok": True})


# ── Contests API ──────────────────────────────────────────

@app.route("/api/contests")
def list_contests():
    q = Contest.query

    category = request.args.get("category")
    if category and category != "all":
        q = q.filter(Contest.category == category)

    status = request.args.get("status", "active")
    if status == "saved":
        q = q.filter(Contest.status == "saved")
    elif status == "ended":
        q = q.filter(Contest.status == "ended")
    elif status != "all":
        q = q.filter(Contest.status == "active")

    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        q = q.filter(
            db.or_(
                Contest.title.ilike(like),
                Contest.source.ilike(like),
                Contest.description.ilike(like),
            )
        )

    sort = request.args.get("sort", "latest")
    if sort == "deadline":
        q = q.order_by(Contest.pinned.desc(), Contest.deadline.asc().nullslast(), Contest.created_at.desc())
    else:
        q = q.order_by(Contest.pinned.desc(), Contest.created_at.desc())

    contests = q.all()
    return jsonify([c.to_dict() for c in contests])


@app.route("/api/contests/<int:cid>")
def get_contest(cid):
    c = Contest.query.get_or_404(cid)
    return jsonify(c.to_dict())


@app.route("/api/contests", methods=["POST"])
@admin_required
def create_contest():
    data = request.get_json(silent=True) or {}
    c = Contest(
        title=data.get("title", "Untitled"),
        source=data.get("source", ""),
        description=data.get("description", ""),
        category=data.get("category", "ai"),
        prize=data.get("prize", ""),
        url=data.get("url", ""),
        image_url=data.get("image_url", ""),
        pinned=data.get("pinned", False),
        status=data.get("status", "active"),
    )
    if data.get("deadline"):
        try:
            c.deadline = datetime.fromisoformat(data["deadline"].replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            pass
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@app.route("/api/contests/<int:cid>", methods=["PUT"])
@admin_required
def update_contest(cid):
    c = Contest.query.get_or_404(cid)
    data = request.get_json(silent=True) or {}
    for field in ("title", "source", "description", "category", "prize", "url", "image_url", "status"):
        if field in data:
            setattr(c, field, data[field])
    if "pinned" in data:
        c.pinned = bool(data["pinned"])
    if "deadline" in data:
        if data["deadline"]:
            try:
                c.deadline = datetime.fromisoformat(data["deadline"].replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass
        else:
            c.deadline = None
    c.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(c.to_dict())


@app.route("/api/contests/<int:cid>", methods=["DELETE"])
@admin_required
def delete_contest(cid):
    c = Contest.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/contests/<int:cid>/pin", methods=["POST"])
@admin_required
def toggle_pin(cid):
    c = Contest.query.get_or_404(cid)
    c.pinned = not c.pinned
    db.session.commit()
    return jsonify(c.to_dict())


@app.route("/api/contests/<int:cid>/bookmark", methods=["POST"])
@admin_required
def toggle_bookmark(cid):
    c = Contest.query.get_or_404(cid)
    c.status = "saved" if c.status != "saved" else "active"
    db.session.commit()
    return jsonify(c.to_dict())


# ── Projects API ──────────────────────────────────────────

@app.route("/api/projects")
def list_projects():
    projects = Project.query.order_by(Project.order.asc(), Project.created_at.desc()).all()
    return jsonify([p.to_dict() for p in projects])


@app.route("/api/projects", methods=["POST"])
@admin_required
def create_project():
    data = request.get_json(silent=True) or {}
    p = Project(
        title=data.get("title", "Untitled"),
        description=data.get("description", ""),
        url=data.get("url", ""),
        image_url=data.get("image_url", ""),
        tags=data.get("tags", ""),
        featured=data.get("featured", False),
        order=data.get("order", 0),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@app.route("/api/projects/<int:pid>", methods=["PUT"])
@admin_required
def update_project(pid):
    p = Project.query.get_or_404(pid)
    data = request.get_json(silent=True) or {}
    for field in ("title", "description", "url", "image_url", "tags"):
        if field in data:
            setattr(p, field, data[field])
    if "featured" in data:
        p.featured = bool(data["featured"])
    if "order" in data:
        p.order = int(data["order"])
    db.session.commit()
    return jsonify(p.to_dict())


@app.route("/api/projects/<int:pid>", methods=["DELETE"])
@admin_required
def delete_project(pid):
    p = Project.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


# ── Run ───────────────────────────────────────────────────

# Ensure tables exist on startup (works for both dev and production)
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
