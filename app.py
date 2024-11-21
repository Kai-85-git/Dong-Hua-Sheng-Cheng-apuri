import os
from flask import Flask, render_template, jsonify, request, flash, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
import requests
from datetime import datetime

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

app.secret_key = os.environ.get("FLASK_SECRET_KEY", "development_key")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

db.init_app(app)

LUMA_API_ENDPOINT = "https://api.lumalabs.ai/dream-machine/v1/generations"
LUMA_API_KEY = os.environ.get("LUMA_API_KEY")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_animation():
    prompt = request.form.get('prompt')
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    try:
        # Call LUMA API to generate animation
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {LUMA_API_KEY}",
            "content-type": "application/json"
        }
        
        response = requests.post(
            LUMA_API_ENDPOINT,
            headers=headers,
            json={"prompt": prompt}
        )
        
        # Log the API response for debugging
        app.logger.debug(f"LUMA API Response Status: {response.status_code}")
        app.logger.debug(f"LUMA API Response Headers: {response.headers}")
        
        if response.status_code == 200:
            data = response.json()
            app.logger.debug(f"LUMA API Response Data: {data}")
            
            # Extract relevant information from the response
            generation_id = data.get('id')
            status = data.get('status', 'unknown')
            video_url = data.get('url')  # Adjust based on actual API response structure
            
            # Save to history only if we have a video URL
            if video_url:
                new_animation = Animation(
                    prompt=prompt,
                    video_url=video_url,
                    created_at=datetime.utcnow()
                )
                db.session.add(new_animation)
                db.session.commit()
            
            # Return complete response data to frontend
            return jsonify({
                'success': True,
                'generation_id': generation_id,
                'status': status,
                'video_url': video_url,
                'prompt': prompt,
                'raw_response': data  # Include full response for debugging
            })
        else:
            error_data = response.json() if response.content else {'message': 'No response content'}
            app.logger.error(f"LUMA API Error: {error_data}")
            return jsonify({
                'success': False,
                'error': error_data.get('message', 'Failed to generate animation'),
                'status_code': response.status_code
            }), response.status_code
            
    except Exception as e:
        app.logger.error(f"Generation Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/history')
def history():
    animations = Animation.query.order_by(Animation.created_at.desc()).all()
    return render_template('history.html', animations=animations)

with app.app_context():
    from models import Animation
    db.create_all()
