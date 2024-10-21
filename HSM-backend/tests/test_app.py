import pytest
from flask import Flask
from unittest.mock import patch
from app import app, db, Appointment, User  # Ensure correct import of your app and models

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # Use an in-memory database
    with app.app_context():
        db.create_all()  # Create tables
        yield app.test_client()
        db.drop_all()  # Clean up after tests


def test_post_appointment_success(client):
    data = {
        'doctor_name': 'Dr. Smith',
        'patient_name': 'John Doe',
        'date': '2024-10-20',
        'notes': ['Follow-up']
    }
    response = client.post('/appointments', json=data)
    assert response.status_code == 201
    assert response.json['message'] == 'Appointment created!'


def test_post_appointment_missing_fields(client):
    data = {
        'doctor_name': 'Dr. Smith'
    }
    response = client.post('/appointments', json=data)
    assert response.status_code == 400
    assert response.json['error'] == 'Missing required fields'


def test_cancel_appointment_success(client):
    new_appointment = Appointment(doctor_name="Dr. Smith", patient_name="John Doe", date="2024-10-20")
    db.session.add(new_appointment)
    db.session.commit()

    response = client.put(f'/appointments/{new_appointment.id}/cancel')
    assert response.status_code == 200
    assert response.json['message'] == 'Appointment cancelled successfully'

def test_cancel_appointment_not_found(client):
    response = client.put('/appointments/999/cancel')
    assert response.status_code == 404
    assert response.json['error'] == 'Appointment not found'

def test_cancel_appointment_already_cancelled(client):
    new_appointment = Appointment(doctor_name="Dr. Smith", patient_name="John Doe", date="2024-10-20", status='Cancelled')
    db.session.add(new_appointment)
    db.session.commit()

    response = client.put(f'/appointments/{new_appointment.id}/cancel')
    assert response.status_code == 400
    assert response.json['error'] == 'Appointment is already cancelled'

def test_add_note_to_appointment_success(client):
    new_appointment = Appointment(doctor_name="Dr. Smith", patient_name="John Doe", date="2024-10-20")
    db.session.add(new_appointment)
    db.session.commit()

    data = {'note': 'New note', 'author': 'Admin'}
    response = client.post(f'/appointments/{new_appointment.id}/add-note', json=data)
    assert response.status_code == 200
    assert response.json['message'] == 'Note added!'

def test_add_note_to_appointment_not_found(client):
    data = {'note': 'New note', 'author': 'Admin'}
    response = client.post('/appointments/999/add-note', json=data)
    assert response.status_code == 404
    assert response.json['error'] == 'Appointment not found'

def test_add_note_to_appointment_no_note_provided(client):
    new_appointment = Appointment(doctor_name="Dr. Smith", patient_name="John Doe", date="2024-10-20")
    db.session.add(new_appointment)
    db.session.commit()

    data = {'author': 'Admin'}
    response = client.post(f'/appointments/{new_appointment.id}/add-note', json=data)
    assert response.status_code == 400
    assert response.json['error'] == 'No note provided'

def test_signup_success(client):
    data = {
        'username': 'new_user',
        'password': 'password',
        'user_type': 'patient'
    }
    response = client.post('/signup', json=data)
    assert response.status_code == 201
    assert response.json['message'] == 'User registered successfully!'

def test_signup_username_already_exists(client):
    data = {
        'username': 'existing_user',
        'password': 'password',
        'user_type': 'patient'
    }
    client.post('/signup', json=data)  # Register the user first

    response = client.post('/signup', json=data)  # Try to register again
    assert response.status_code == 400
    assert response.json['error'] == 'Username already exists'

def test_signup_missing_fields(client):
    data = {
        'username': 'new_user'
    }
    response = client.post('/signup', json=data)
    assert response.status_code == 400
    assert response.json['error'] == 'Missing required fields'

def test_login_success(client):
    data = {
        'username': 'doctor',
        'password': 'doctor',
        'user_type': 'doctor'
    }
    client.post('/signup', json=data)  # Register the user first
    response = client.post('/login', json=data)
    assert response.status_code == 200
    assert response.json['message'] == 'Doctor logged in successfully!'

def test_login_invalid_credentials(client):
    data = {
        'username': 'doctor',
        'password': 'wrongpassword',
        'user_type': 'doctor'
    }
    response = client.post('/login', json=data)
    assert response.status_code == 401
    assert response.json['error'] == 'Invalid credentials'

def test_login_unregistered_user(client):
    data = {
        'username': 'unregistered_user',
        'password': 'password',
        'user_type': 'doctor'
    }
    response = client.post('/login', json=data)
    assert response.status_code == 401
    assert response.json['error'] == 'Invalid credentials'

def test_login_missing_fields(client):
    data = {
        'username': 'doctor'
    }
    response = client.post('/login', json=data)
    assert response.status_code == 400
    assert response.json['error'] == 'Missing required fields'


if __name__ == '__main__':
    pytest.main()
