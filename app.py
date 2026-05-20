from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import sqlite3
import os
import re
import uuid

load_dotenv()

app = Flask(__name__, static_folder='dist')
app.secret_key = os.getenv('SECRET_KEY', 'default-secret-key')
CORS(app, origins=r"https?://(localhost:\d+|127\.0\.0\.1:\d+|tumangle\.site|tumangle\.vercel\.app)", supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

UPLOAD_FOLDER = 'uploads/avatars'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

DATABASE = os.getenv('DB_PATH', 'database.sqlite')
API_KEY = os.getenv('API_KEY')
print(f"DEBUG: Loaded API_KEY: {API_KEY}")

def require_api_key(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not API_KEY:
            return f(*args, **kwargs) # Skip if not configured
        
        request_key = request.headers.get('X-API-Key')
        if request_key == API_KEY:
            return f(*args, **kwargs)
        else:
            return jsonify({"error": "Invalid or missing API Key"}), 403
    return decorated_function


def get_db():
    # Ensure directory exists if it's in a subfolder
    db_dir = os.path.dirname(DATABASE)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                bio TEXT,
                gender TEXT,
                avatar_url TEXT
            )
        ''')
        conn.commit()

# Validation functions
def is_valid_email(email):
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def is_valid_password(password):
    return password and len(password) >= 8

def is_valid_name(name):
    return name and len(name.strip()) >= 2

init_db()

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json or {}
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')
    
    if not email or not password or not name:
        return jsonify({"error": "All fields are required"}), 400
    
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    if not is_valid_password(password):
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    if not is_valid_name(name):
        return jsonify({"error": "Name must be at least 2 characters"}), 400
    
    try:
        password_hash = generate_password_hash(password)
        with get_db() as conn:
            conn.execute('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
                         (email, name, password_hash))
            conn.commit()
            
            # Get the user to return
            user = conn.execute('SELECT id, email, name FROM users WHERE email = ?', (email,)).fetchone()
            
        return jsonify({"message": "User created successfully", "user": dict(user)}), 201
    except sqlite3.IntegrityError as e:
        return jsonify({"error": f"Database integrity error: {str(e)}"}), 400
    except Exception as err:
        print(err)
        return jsonify({"error": str(err)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    try:
        with get_db() as conn:
            user = conn.execute('SELECT * FROM users WHERE email = ?',
                                (email,)).fetchone()
        
        print(f"Login attempt for: {email}")
        print(f"Found user in DB: {user['email'] if user else 'None'}")
        
        if user and check_password_hash(user['password_hash'], password):
            user_dict = dict(user)
            if 'password_hash' in user_dict:
                del user_dict['password_hash']
            return jsonify({"message": "Login successful", "user": user_dict}), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    except Exception as err:
        print(err)
        return jsonify({"error": "Database error"}), 500

@app.route('/update-profile', methods=['POST'])
def update_profile():
    data = request.json or {}
    user_id = data.get('id')
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    bio = data.get('bio')
    gender = data.get('gender')
    avatar_url = data.get('avatar_url')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    try:
        with get_db() as conn:
            # Check if email is being changed and if it's already taken
            if email:
                existing_user = conn.execute('SELECT id FROM users WHERE email = ? AND id != ?', (email, user_id)).fetchone()
                if existing_user:
                    return jsonify({"error": "Email is already taken"}), 400

            # Prepare update query
            updates = []
            params = []
            if name:
                updates.append("name = ?")
                params.append(name)
            if email:
                updates.append("email = ?")
                params.append(email)
            if password:
                if len(password) < 8:
                    return jsonify({"error": "Password must be at least 8 characters"}), 400
                updates.append("password_hash = ?")
                params.append(generate_password_hash(password))
            
            updates.append("bio = ?")
            params.append(bio)
            updates.append("gender = ?")
            params.append(gender)
            updates.append("avatar_url = ?")
            params.append(avatar_url)
            
            params.append(user_id)
            
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
            conn.execute(query, params)
            conn.commit()
            
            user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
            user_dict = dict(user)
            if 'password_hash' in user_dict:
                del user_dict['password_hash']
                
        return jsonify({"message": "Profile updated", "user": user_dict}), 200
    except Exception as err:
        print(err)
        return jsonify({"error": str(err)}), 500

@app.route('/upload-avatar', methods=['POST'])
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add a unique prefix to avoid collisions
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Return the public URL for the file
        return jsonify({"url": f"/uploads/avatars/{unique_filename}"}), 200
    else:
        return jsonify({"error": "File type not allowed"}), 400

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# SocketIO Matchmaking Logic
waiting_users = []
active_matches = {} # sid -> partner_sid
online_count = 0

@socketio.on('connect')
def handle_connect():
    global online_count
    online_count += 1
    print(f"Client connected: {request.sid}. Online: {online_count}")
    emit('update-online-count', {'count': online_count}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    global waiting_users, online_count
    sid = request.sid
    online_count -= 1
    print(f"Client disconnected: {sid}. Online: {online_count}")
    emit('update-online-count', {'count': online_count}, broadcast=True)
    
    if sid in waiting_users:
        waiting_users.remove(sid)
    
    if sid in active_matches:
        partner_sid = active_matches[sid]
        emit('partner-disconnected', room=partner_sid)
        if partner_sid in active_matches:
            active_matches.pop(partner_sid, None)
        active_matches.pop(sid, None)

@socketio.on('find-random-partner')
def handle_find_partner(data):
    global waiting_users
    sid = request.sid
    
    # If user was already in a match, leave it
    if sid in active_matches:
        handle_leave()

    if waiting_users:
        partner_sid = waiting_users.pop(0)
        active_matches[sid] = partner_sid
        active_matches[partner_sid] = sid
        
        # Notify both users
        emit('partner-found', {'partner': partner_sid}, room=sid)
        emit('partner-found', {'partner': sid}, room=partner_sid)
    else:
        if sid not in waiting_users:
            waiting_users.append(sid)
        emit('searching', {'message': 'Waiting for a partner...'})

@socketio.on('leave-chat')
def handle_leave():
    global waiting_users
    sid = request.sid
    
    if sid in waiting_users:
        waiting_users.remove(sid)
    
    if sid in active_matches:
        partner_sid = active_matches[sid]
        emit('partner-disconnected', room=partner_sid)
        if partner_sid in active_matches:
            active_matches.pop(partner_sid, None)
        active_matches.pop(sid, None)
        
    emit('disconnected', {'message': 'You left the chat'}, room=sid)

@socketio.on('send-chat-message')
def handle_message(data):
    sid = request.sid
    if sid in active_matches:
        partner_sid = active_matches[sid]
        emit('receive-chat-message', data, room=partner_sid)
    # Also send back to self for confirmation
    emit('receive-chat-message', data, room=sid)

@socketio.on('signal-partner')
def handle_signal(data):
    sid = request.sid
    if sid in active_matches:
        partner_sid = active_matches[sid]
        emit('signal-partner', data, room=partner_sid)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8001, debug=False)
