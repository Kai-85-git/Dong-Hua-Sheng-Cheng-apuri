from database import db
from datetime import datetime

class Animation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.String(500), nullable=False)
    video_url = db.Column(db.String(1000), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __init__(self, prompt, video_url=None, created_at=None):
        self.prompt = prompt
        self.video_url = video_url
        if created_at:
            self.created_at = created_at
