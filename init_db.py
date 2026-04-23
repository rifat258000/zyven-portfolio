"""Initialize the database with tables and seed data."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db, SiteConfig, Project, Contest
from datetime import datetime, timezone, timedelta

app = create_app()

with app.app_context():
    db.create_all()

    # Seed site config if empty
    if not SiteConfig.query.first():
        defaults = {
            "hero_title": "0x_Zyven",
            "hero_subtitle": "Web3 Creator | Crypto Enthusiast | Builder",
            "about_text": "I'm a passionate Web3 creator and crypto enthusiast exploring the intersection of AI, blockchain, and digital culture. I build tools, track contests, and share insights with the community.",
            "x_username": "@0x_zyven",
            "telegram_username": "@Rifatsync",
            "avatar_url": "",
            "contact_email": "",
        }
        for k, v in defaults.items():
            db.session.add(SiteConfig(key=k, value=v))

    # Seed sample projects if empty
    if not Project.query.first():
        projects = [
            Project(
                title="RifatAI Telegram Bot",
                description="All-in-one Telegram bot with crypto tracking, AI chat, admin tools, wallet monitoring, and 50+ commands.",
                url="https://t.me/RifatAI_bot",
                tags="telegram,bot,crypto,ai",
                featured=True, order=1,
            ),
            Project(
                title="Contest Tracker Dashboard",
                description="Web dashboard for tracking AI, meme, video, and Web3 creator contests across Twitter/X and public sources.",
                url="#contests",
                tags="web3,dashboard,contests",
                featured=True, order=2,
            ),
        ]
        for p in projects:
            db.session.add(p)

    # Seed sample contests if empty
    if not Contest.query.first():
        now = datetime.now(timezone.utc)
        contests = [
            Contest(
                title="Sample AI Art Contest",
                source="@example_ai",
                description="Create an AI-generated artwork on the theme of 'Future Cities'. Top 3 win prizes.",
                category="ai",
                deadline=now + timedelta(days=7),
                prize="$500 + NFT",
                url="https://x.com",
                pinned=True, status="active",
            ),
            Contest(
                title="Sample Meme Challenge",
                source="@meme_master",
                description="Funniest crypto meme wins. Quote tweet with your best meme.",
                category="meme",
                deadline=now + timedelta(days=3),
                prize="100 USDT",
                url="https://x.com",
                status="active",
            ),
        ]
        for c in contests:
            db.session.add(c)

    db.session.commit()
    print("Database initialized successfully!")
