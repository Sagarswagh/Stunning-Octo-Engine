/* App starts*/
// App.js
// App.js
import React, { useState, useEffect } from 'react';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import LoginPage from './components/LoginPage'; // Import the LoginPage
import axios from 'axios';

const App = () => {
    const [appointments, setAppointments] = useState([]);
    const [userType, setUserType] = useState(null); // 'doctor' or 'patient'

    // Fetch appointments on initial load
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const response = await fetch('http://127.0.0.1:5000/appointments');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setAppointments(data);
            } catch (error) {
                console.error('Error fetching appointments:', error);
            }
        };

        fetchAppointments();
    }, []);

    const handleLogin = (type) => {
        setUserType(type);
    };

    const handleCancelAppointment = async (id) => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/appointments/${id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error('Failed to cancel appointment');
            }
    
            const data = await response.json();
    
            if (data.success) {
                // Update appointments to set the status of the cancelled appointment
                setAppointments(
                    appointments.map((appointment) =>
                        appointment.id === id ? { ...appointment, status: 'Cancelled' } : appointment
                    )
                );
            } else {
                console.error('Error cancelling appointment:', data.message);
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
        }
    };

    const handleSubmitNote = async (id, newNote) => {
        try {
            await axios.post(`http://127.0.0.1:5000/appointments/${id}/add-note`, { note: newNote.text });
            setAppointments((prevAppointments) =>
                prevAppointments.map((appointment) =>
                    appointment.id === id
                        ? { ...appointment, notes: [...appointment.notes, newNote] }
                        : appointment
                )
            );
            return true;
        } catch (error) {
            console.error('Error submitting note:', error);
            return false;
        }
    };

    const handleBookAppointment = (newAppointment) => {
        const newId = appointments.length + 1;
        setAppointments([
            ...appointments,
            {
                id: newId,
                doctor_name: 'Dr. Jane Smith',
                date: newAppointment.date,
                status: 'Scheduled',
                notes: [{ author: 'Patient', text: newAppointment.note }],
                isDoctor: false,
            },
        ]);
    };

    // Show the login page if the user has not selected a user type
    if (!userType) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <div className="App">
            <h1>Hospital Management System</h1>

            {userType === 'doctor' ? (
                // Pass all appointments to the DoctorDashboard without filtering
                <DoctorDashboard
                    appointments={appointments} // All appointments passed to DoctorDashboard
                    onCancel={handleCancelAppointment}
                    onSubmitNote={handleSubmitNote}
                />
            ) : (
                // Filter appointments for patient view
                <PatientDashboard
                    appointments={appointments.filter((appointment) => !appointment.isDoctor)}
                    onCancel={handleCancelAppointment}
                    onSubmitNote={handleSubmitNote}
                    onBookAppointment={handleBookAppointment}
                />
            )}
        </div>
    );
};

export default App;


/*App.js ends*/

/*doctor Dashboard starts*/

import React from 'react';
import AppointmentCard from './AppointmentCard';

const DoctorDashboard = ({ appointments, onCancel, onSubmitNote }) => {
    return (
        <div className="dashboard">
            <h2>Doctor's Appointments</h2>
            {appointments.length > 0 ? (
                appointments.map((appointment) => (
                    <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onCancel={onCancel}
                        onSubmitNote={onSubmitNote}
                    />
                ))
            ) : (
                <p>No appointments available.</p>
            )}
        </div>
    );
};

export default DoctorDashboard;


/* doctor Dashboard ends */


/*Patient Dashboard starts */

import React, { useState } from 'react';
import AppointmentCard from './AppointmentCard';

const PatientDashboard = ({ appointments, onCancel, onSubmitNote, onBookAppointment }) => {
    const [newAppointment, setNewAppointment] = useState({ date: '', note: '' });

    const handleInputChange = (e) => {
        setNewAppointment({ ...newAppointment, [e.target.name]: e.target.value });
    };

    const handleBookAppointmentClick = async () => {
        try {
            const appointmentData = {
                doctor_name: "Dr. Jane Smith",  
                patient_name: "Patient Name",  
                date: newAppointment.date,
                status: 'Scheduled',
                notes: [newAppointment.note],  
            };

            const response = await fetch('http://127.0.0.1:5000/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentData),
            });

            if (!response.ok) {
                throw new Error('Failed to create appointment');
            }

            const createdAppointment = await response.json();
            onBookAppointment(createdAppointment);
            setNewAppointment({ date: '', note: '' });

        } catch (error) {
            console.error('Error booking appointment:', error);
        }
    };

    const handleAddNote = async (appointmentId, newNote) => {
        await onSubmitNote(appointmentId, newNote);
    };

    const handleCancelAppointment = async (appointmentId) => {
        await onCancel(appointmentId);
    };

    return (
        <div className="dashboard">
            <h2>Patient's Appointments</h2>

            {appointments && appointments.length > 0 ? (
                appointments.map((appointment) => (
                    <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onCancel={handleCancelAppointment}
                        onSubmitNote={handleAddNote}
                    />
                ))
            ) : (
                <p>No appointments available.</p>
            )}

            <div className="appointment-booking">
                <h3>Book a new appointment</h3>
                <input
                    type="date"
                    name="date"
                    value={newAppointment.date}
                    onChange={handleInputChange}
                />
                <input
                    type="text"
                    name="note"
                    placeholder="Add a note"
                    value={newAppointment.note}
                    onChange={handleInputChange}
                />
                <button onClick={handleBookAppointmentClick}>Book Appointment</button>
            </div>
        </div>
    );
};

export default PatientDashboard;


/*Patient Dashboard ends */

/*appointments Dashboard starts */

import React, { useState, useEffect } from 'react';

const AppointmentCard = ({ appointment, onCancel, onSubmitNote }) => {
    const [note, setNote] = useState('');
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        if (appointment.notes) {
            setNotes(appointment.notes.map(note => ({ text: note.text, author: note.author === 'Doctor' ? 'Doctor' : 'Patient' })));
        }
    }, [appointment.notes]);

    const handleNoteChange = (e) => {
        setNote(e.target.value);
    };

    const handleNoteSubmit = async () => {
        if (note.trim() === "") return;

        const newNote = {
            text: note,
            author: appointment.isDoctor ? 'Doctor' : 'Patient',
        };

        const success = await onSubmitNote(appointment.id, newNote);
        if (success) {
            setNotes([...notes, newNote]);
            setNote('');
        } else {
            console.error('Error submitting note');
        }
    };

    const handleCancelAppointment = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/appointments/${appointment.id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error('Failed to cancel appointment');
            }
    
            const data = await response.json();
    
            if (data.success) {
                console.log('Appointment cancelled successfully');
                // Call the onCancel function passed as a prop to update the frontend state
                onCancel(appointment.id);
            } else {
                console.error('Error cancelling appointment:', data.message);
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
        }
    };

    return (
        <div className="appointment-card">
            <h3>Appointment with: {appointment.doctor_name}</h3>
            <p>Date: {appointment.date}</p>
            <p>Status: {appointment.status}</p>

            <div className="notes-section">
                {notes.length > 0 ? (
                    <div>
                        <h4>Notes:</h4>
                        {notes.map((note, index) => (
                            <p key={index}>
                                <strong>{note.author}:</strong> {note.text}
                            </p>
                        ))}
                    </div>
                ) : (
                    <p>No notes available</p>
                )}
            </div>

            <input
                type="text"
                placeholder="Add a note"
                value={note}
                onChange={handleNoteChange}
            />
            <div className="appointment-actions">
                <button className="submit-note" onClick={handleNoteSubmit}>Submit Note</button>
                <button className="cancel-appointment" onClick={handleCancelAppointment}>Cancel Appointment</button>
            </div>
        </div>
    );
};

export default AppointmentCard;


/*appointments Dashboard ends */

/* LoginPage.js*/
// src/components/LoginPage.js
import React, { useState } from 'react';
import axios from 'axios';

const LoginPage = ({ onLogin }) => {
    const [userType, setUserType] = useState(''); // 'doctor' or 'patient'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [signup, setSignup] = useState(false); // Flag to toggle signup form

    const handleUserTypeChange = (type) => {
        setUserType(type);
        setUsername('');
        setPassword('');
        setSignup(false); // Reset signup flag on user type change
    };

    const handleLogin = async () => {
        try {
            const response = await axios.post('http://127.0.0.1:5000/login', {
                username,
                password,
            });

            if (response.status === 200) {
                onLogin(userType); // Redirect to the respective dashboard
                alert(response.data.message); // Display success message
            }
        } catch (error) {
            console.error('Error logging in:', error);
            alert(error.response?.data?.message || 'Login failed');
        }
    };

    const handleSignup = async () => {
        try {
            const response = await axios.post('http://127.0.0.1:5000/signup', {
                username,
                password,
                user_type: userType || 'patient', // Use selected user type
            });

            if (response.status === 201) {
                alert('Signup successful! You can now log in.');
                setSignup(false); // Hide signup form after successful signup
            }
        } catch (error) {
            console.error('Error signing up:', error);
            alert(error.response?.data?.message || 'Signup failed');
        }
    };

    return (
        <div className="login-page">
            <h1>Login</h1>
            <button onClick={() => handleUserTypeChange('doctor')}>Login as Doctor</button>
            <button onClick={() => handleUserTypeChange('patient')}>Login as Patient</button>

            {userType && (
                <div>
                    <h2>{signup ? `${userType.charAt(0).toUpperCase() + userType.slice(1)} Signup` : `${userType.charAt(0).toUpperCase() + userType.slice(1)} Login`}</h2>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {signup ? (
                        <div>
                            <button onClick={handleSignup}>Sign Up</button>
                            <button onClick={() => setSignup(false)}>Back to Login</button>
                        </div>
                    ) : (
                        <div>
                            <button onClick={handleLogin}>Login</button>
                            <button onClick={() => setSignup(true)}>Sign Up</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LoginPage;

/* End of LoginPage.js*/