from flask import Flask, render_template, request, jsonify
import requests
import os
from datetime import datetime
from database import db

# Initialize Flask app
app = Flask(__name__)

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database with app
db.init_app(app)

# Configure LUMA API
LUMA_API_KEY = os.environ.get('LUMA_API_KEY')
LUMA_API_ENDPOINT = "https://api.lumalabs.ai/dream-machine/v1/generations"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_animation():
    try:
        prompt = request.form.get('prompt')
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'No prompt provided'
            }), 400

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Bearer {LUMA_API_KEY}"
        }
        
        payload = {
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "loop": False
        }
        
        response = requests.post(
            LUMA_API_ENDPOINT,
            headers=headers,
            json=payload
        )
        
        app.logger.debug(f"LUMA API Response: {response.status_code}")
        
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                if not data:
                    raise ValueError("Empty response from API")
                
                app.logger.debug(f"Generation Data: {data}")
                
                generation_id = data.get('id')
                if not generation_id:
                    raise ValueError("No generation ID in response")
                
                return jsonify({
                    'success': True,
                    'generation_id': generation_id,
                    'prompt': prompt,
                    'state': data.get('state', 'queued'),
                    'video_url': None,  # Initially there won't be a video URL
                    'raw_response': data
                })
            except (ValueError, KeyError) as e:
                app.logger.error(f"API Response Processing Error: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f"Invalid API response: {str(e)}"
                }), 500
            
        return jsonify({
            'success': False,
            'error': 'Failed to generate animation',
            'status_code': response.status_code
        }), response.status_code
        
    except Exception as e:
        app.logger.error(f"Generation Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/check-status/<generation_id>')
def check_generation_status(generation_id):
    try:
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {LUMA_API_KEY}"
        }
        
        response = requests.get(
            f"{LUMA_API_ENDPOINT}/{generation_id}",
            headers=headers
        )
        
        app.logger.debug(f"Status Check Response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            app.logger.debug(f"Status Check Data: {data}")
            
            if not data:
                raise ValueError("Empty response from API")
            
            state = data.get('state', 'unknown')
            video_url = None
            
            # Only try to get video_url if assets exists and is not None
            assets = data.get('assets')
            if isinstance(assets, dict):
                video_url = assets.get('video')
            
            # Save to history if completed with video URL
            if state == 'completed' and video_url:
                from models import Animation
                new_animation = Animation(
                    prompt=data.get('request', {}).get('prompt', ''),
                    video_url=video_url,
                    created_at=datetime.utcnow()
                )
                db.session.add(new_animation)
                db.session.commit()
            
            return jsonify({
                'success': True,
                'state': state,
                'video_url': video_url,
                'failure_reason': data.get('failure_reason')
            })
            
        return jsonify({
            'success': False,
            'error': 'Failed to check generation status'
        }), response.status_code
        
    except Exception as e:
        app.logger.error(f"Status Check Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/history')
def history():
    from models import Animation
    animations = Animation.query.order_by(Animation.created_at.desc()).all()
    return render_template('history.html', animations=animations)

# Create tables
with app.app_context():
    from models import Animation
    db.create_all()

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
