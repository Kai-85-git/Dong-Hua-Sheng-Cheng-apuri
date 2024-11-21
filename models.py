from app import db
from datetime import datetime

class Animation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.String(500), nullable=False)
    video_url = db.Column(db.String(1000))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
