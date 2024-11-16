from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import bleach  # For sanitizing user input to prevent XSS
import re 
from werkzeug.security import check_password_hash
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///appointments.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Initialize CORS and Limiter (for rate limiting)
CORS(app)
limiter = Limiter(get_remote_address, app=app)

# Define the Appointment model
class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    doctor_name = db.Column(db.String(100), nullable=False)
    patient_name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='Scheduled')
    notes = db.Column(db.Text, default='')

# Define a User model for authentication (for doctors and patients)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    user_type = db.Column(db.String(10), nullable=False)  # Can be 'doctor' or 'patient'

# Create default doctor if not exists
def create_default_doctor():
    try:
        doctor_exists = User.query.filter_by(username='doctor').first()
        print(doctor_exists)
        if not doctor_exists:
            default_doctor = User(username='doctor', password=generate_password_hash('doctor'), user_type='doctor')
            db.session.add(default_doctor)
            db.session.commit()
        # else:
        #     db.session.delete(doctor_exists)
        #     db.session.commit()
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Error creating default doctor: {e}")

# Error Handlers for 404 and 500
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'An internal error occurred'}), 500

# Rate-limited route for handling appointments
@app.route('/appointments', methods=['GET', 'POST'])
@limiter.limit("50 per minute")  # Apply rate-limiting (50 requests per minute per IP)
def manage_appointments():
    try:
        if request.method == 'GET':
            appointments = Appointment.query.all()
            return jsonify([
                {
                    'id': appointment.id,
                    'doctor_name': appointment.doctor_name,
                    'patient_name': appointment.patient_name,
                    'date': appointment.date,
                    'status': appointment.status,
                    'notes': [{'author': 'author_name', 'text': note} for note in appointment.notes.split(',')] if appointment.notes else []
                }
                for appointment in appointments
            ]), 200
        elif request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No input data provided'}), 400
            
            if not all(key in data for key in ('doctor_name', 'patient_name', 'date')):
                return jsonify({'error': 'Missing required fields'}), 400

            # Sanitize the notes field to prevent XSS
            sanitized_notes = bleach.clean(data.get('notes', ''))

            new_appointment = Appointment(
                doctor_name=data['doctor_name'],
                patient_name=data['patient_name'],
                date=data['date'],
                status=data.get('status', 'Scheduled'),
                notes=",".join(sanitized_notes) if sanitized_notes else ''
            )
            db.session.add(new_appointment)
            db.session.commit()
            return jsonify({'message': 'Appointment created!'}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred', 'details': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500

# Add Note to Appointment (with input sanitization)
@app.route('/appointments/<int:appointment_id>/add-note', methods=['POST'])
@limiter.limit("20 per minute") # Apply rate-limiting (20 requests per minute per IP)
def add_note_to_appointment(appointment_id):
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        data = request.get_json()
        if not data or 'note' not in data:
            return jsonify({'error': 'No note provided'}), 400
        
        # Sanitize the note to prevent XSS
        new_note = bleach.clean(data['note'])
        
        new_author = data.get('author', 'unknown')

        if appointment.notes:
            appointment.notes += ',' + new_note
        else:
            appointment.notes = new_note

        db.session.commit()
        return jsonify({'message': 'Note added!'}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred', 'details': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500

# Cancel Appointment (With rate limiting)
@app.route('/appointments/<int:id>/cancel', methods=['PUT'])
@limiter.limit("3 per minute") # Apply rate-limiting (3 requests per minute per IP)
def cancel_appointment(id):
    try:
        appointment = Appointment.query.get(id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        if appointment.status == 'Cancelled':
            return jsonify({'error': 'Appointment is already cancelled'}), 400
        
        appointment.status = 'Cancelled'
        db.session.commit()
        
        return jsonify({"success": True, "message": "Appointment cancelled successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred', 'details': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500




# Dummy user database for illustration
users = {}

# Password validation regex (already provided)
PASSWORD_REGEX = r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'

# Username validation: alphanumeric, not only numeric, and length between 3 and 20 characters
USERNAME_REGEX = r'^[a-zA-Z][a-zA-Z0-9]{2,19}$'  # Starts with a letter, followed by alphanumeric characters

@app.route('/signup', methods=['POST'])
def signup():
    username = request.json.get('username')
    password = request.json.get('password')
    user_type = request.json.get('user_type')

    # Validate input
    if not username or not password or not user_type:
        return jsonify({'error': 'Please provide username, password, and user type'}), 400

    # Validate username format: must be alphanumeric and start with a letter
    if not re.match(USERNAME_REGEX, username):
        return jsonify({'error': 'Username must start with a letter, contain only letters and numbers, and be at least 3 characters long'}), 400

    # Validate user_type
    if user_type not in ['doctor', 'patient']:
        return jsonify({'error': 'Invalid user type'}), 400

    # Validate password format using regex
    if not re.match(PASSWORD_REGEX, password):
        return jsonify({
            'error': 'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.'
        }), 400

    # Check if the username already exists
    if username in users:
        return jsonify({'error': 'Username already exists'}), 400

    # Hash password and store user data
    hashed_password = generate_password_hash(password)
    users[username] = {'password': hashed_password, 'user_type': user_type}

    return jsonify({'message': f'{user_type.capitalize()} signed up successfully'}), 201



# Login route with password validation

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        user_type = data.get('user_type')
        
        if not username or not password or not user_type:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user exists and the password is correct
        if username in users and users[username]['user_type'] == user_type:
            # Use check_password_hash to compare the stored password with the input password
            if check_password_hash(users[username]['password'], password):
                return jsonify({'message': f'{user_type.capitalize()} logged in successfully!'}), 200
            else:
                return jsonify({'error': 'Invalid credentials'}), 401
        else:
            return jsonify({'error': 'User does not exist or incorrect user type'}), 401
        
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500


if __name__ == '__main__':
    with app.app_context():  # Set up the application context
        db.create_all()       # Create tables
        create_default_doctor()  # Ensure the default doctor is created at startup

    app.run(debug=True)

