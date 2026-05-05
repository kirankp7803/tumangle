from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sqlite3
import os

app = Flask(__name__, static_folder='dist')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

DATABASE = 'database.sqlite'

def get_db():
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
                password TEXT NOT NULL
            )
        ''')
        conn.commit()

init_db()

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')
    
    try:
        with get_db() as conn:
            conn.execute('INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
                         (email, name, password))
            conn.commit()
        return jsonify({"message": "User created successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    with get_db() as conn:
        user = conn.execute('SELECT * FROM users WHERE email = ? AND password = ?',
                            (email, password)).fetchone()
    
    if user:
        return jsonify({"message": "Login successful", "user": dict(user)}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# SocketIO Matchmaking Logic
waiting_users = []

@socketio.on('find-random-partner')
def handle_find_partner(data):
    global waiting_users
    gender = data.get('gender', 'both')
    
    if waiting_users:
        partner_sid = waiting_users.pop(0)
        # Notify both users
        emit('partner-found', {'partner': partner_sid}, room=request.sid)
        emit('partner-found', {'partner': request.sid}, room=partner_sid)
    else:
        waiting_users.append(request.sid)
        emit('searching', {'message': 'Waiting for a partner...'})

@socketio.on('leave-chat')
def handle_leave():
    global waiting_users
    if request.sid in waiting_users:
        waiting_users.remove(request.sid)
    emit('disconnected', {'message': 'You left the chat'}, room=request.sid)

@socketio.on('send-chat-message')
def handle_message(data):
    emit('receive-chat-message', data, broadcast=True) 

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3000, debug=True)
