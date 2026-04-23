from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Contest(db.Model):
    __tablename__ = "contests"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    source = db.Column(db.String(100), default="")
    description = db.Column(db.Text, default="")
    category = db.Column(db.String(50), default="ai")  # ai, meme, video, web3
    deadline = db.Column(db.DateTime, nullable=True)
    prize = db.Column(db.String(100), default="")
    url = db.Column(db.String(500), default="")
    image_url = db.Column(db.String(500), default="")
    pinned = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default="active")  # active, ended, saved
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "source": self.source,
            "description": self.description,
            "category": self.category,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "prize": self.prize,
            "url": self.url,
            "image_url": self.image_url,
            "pinned": self.pinned,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    url = db.Column(db.String(500), default="")
    image_url = db.Column(db.String(500), default="")
    tags = db.Column(db.String(200), default="")
    featured = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "url": self.url,
            "image_url": self.image_url,
            "tags": self.tags,
            "featured": self.featured,
            "order": self.order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SiteConfig(db.Model):
    __tablename__ = "site_config"

    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text, default="")
