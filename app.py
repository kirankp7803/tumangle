from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
import re

app = Flask(__name__, static_folder='dist')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

DATABASE = os.getenv('DB_PATH', 'database.sqlite')

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
                password_hash TEXT NOT NULL
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
    data = request.json
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
        return jsonify({"message": "User created successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400
    except Exception as err:
        print(err)
        return jsonify({"error": "Database error"}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    try:
        with get_db() as conn:
            user = conn.execute('SELECT * FROM users WHERE email = ?',
                                (email,)).fetchone()
        
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

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    global waiting_users
    sid = request.sid
    print(f"Client disconnected: {sid}")
    
    if sid in waiting_users:
        waiting_users.remove(sid)
    
    if sid in active_matches:
        partner_sid = active_matches[sid]
        emit('partner-disconnected', room=partner_sid)
        if partner_sid in active_matches:
            del active_matches[partner_sid]
        del active_matches[sid]

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
            del active_matches[partner_sid]
        del active_matches[sid]
        
    emit('disconnected', {'message': 'You left the chat'}, room=sid)

@socketio.on('send-chat-message')
def handle_message(data):
    sid = request.sid
    if sid in active_matches:
        partner_sid = active_matches[sid]
        emit('receive-chat-message', data, room=partner_sid)
    # Also send back to self for confirmation (or let frontend handle it)
    emit('receive-chat-message', data, room=sid)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3000, debug=False)
