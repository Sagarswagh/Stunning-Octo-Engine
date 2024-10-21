from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from flask_cors import CORS

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///appointments.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Allow CORS for all routes
CORS(app)

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
        if not doctor_exists:
            default_doctor = User(username='doctor', password='doctor', user_type='doctor')
            db.session.add(default_doctor)
            db.session.commit()
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Error creating default doctor: {e}")

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'An internal error occurred'}), 500

@app.route('/appointments', methods=['GET', 'POST'])
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
            
            new_appointment = Appointment(
                doctor_name=data['doctor_name'],
                patient_name=data['patient_name'],
                date=data['date'],
                status=data.get('status', 'Scheduled'),
                notes=",".join(data['notes']) if data.get('notes') else ''
            )
            db.session.add(new_appointment)
            db.session.commit()
            return jsonify({'message': 'Appointment created!'}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred', 'details': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500

@app.route('/appointments/<int:appointment_id>/add-note', methods=['POST'])
def add_note_to_appointment(appointment_id):
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        data = request.get_json()
        if not data or 'note' not in data:
            return jsonify({'error': 'No note provided'}), 400
        
        new_note = data['note']
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

@app.route('/appointments/<int:id>/cancel', methods=['PUT'])
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

@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        user_type = data.get('user_type')
        
        if not username or not password or not user_type:
            return jsonify({'error': 'Missing required fields'}), 400
        
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400
        
        new_user = User(username=username, password=password, user_type=user_type)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully!'}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred', 'details': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500

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
        
        user = User.query.filter_by(username=username, password=password, user_type=user_type).first()
        if user:
            return jsonify({'message': f'{user.user_type.capitalize()} logged in successfully!'}), 200
        
        return jsonify({'error': 'Invalid credentials'}), 401
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred', 'details': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_default_doctor()
    
    app.run(debug=True)