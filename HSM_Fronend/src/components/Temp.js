/*LoginPage Starts here*/

import React, { useState } from 'react';
import axios from 'axios';

const LoginPage = ({ onLogin }) => {
    const [userType, setUserType] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [signup, setSignup] = useState(false);

    const handleUserTypeChange = (type) => {
        setUserType(type);
        setUsername('');
        setPassword('');
        setSignup(false);
    };

    const handleLogin = async () => {
        if (!username || !password || !userType) {
            alert('Please fill in all fields and select a user type.');
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:5000/login', {
                username,
                password,
            });

            if (response.status === 200) {
                // Store the username and userType in local storage
                localStorage.setItem('username', username);
                localStorage.setItem('userType', userType);
                onLogin(userType); // Pass the userType to the parent component
                alert(response.data.message); // Display success message
            }
        } catch (error) {
            console.error('Error logging in:', error);
            alert(error.response?.data?.message || 'Login failed');
        }
    };

    const handleSignup = async () => {
        if (!username || !password) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:5000/signup', {
                username,
                password,
                user_type: userType || 'patient', // Default to 'patient' if userType not set
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


/*LoginPage Ends*/

/*App.js starts here */

// App.js
// src/App.js
import React, { useState, useEffect } from 'react';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import LoginPage from './components/LoginPage';
import axios from 'axios';
import './styles/App.css'; // Ensure you import your CSS file

const App = () => {
    const [appointments, setAppointments] = useState([]);
    const [userType, setUserType] = useState(null);

    useEffect(() => {
        // Check if user is logged in
        const storedUserType = localStorage.getItem('userType');
        if (storedUserType) {
            setUserType(storedUserType);
        }

        // Fetch appointments on initial load
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

    const handleLogout = () => {
        localStorage.removeItem('username');
        localStorage.removeItem('userType');
        setUserType(null); // Reset user type
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
                patient_name: localStorage.getItem('username'), // Use stored username
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

    // Filter appointments for the logged-in patient
    const filteredAppointments =
        userType === 'patient'
            ? appointments.filter((appointment) => appointment.patient_name === localStorage.getItem('username'))
            : appointments;

    return (
        <div className="App">
            <h1>Hospital Management System</h1>
            <div className="logout-container">
                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>

            {userType === 'doctor' ? (
                <DoctorDashboard
                    appointments={filteredAppointments}
                    onCancel={handleCancelAppointment}
                    onSubmitNote={handleSubmitNote}
                />
            ) : (
                <PatientDashboard
                    appointments={filteredAppointments}
                    onCancel={handleCancelAppointment}
                    onSubmitNote={handleSubmitNote}
                    onBookAppointment={handleBookAppointment}
                />
            )}
        </div>
    );
};

export default App;

/*App.js Ends Here */

/* AppointmentsCard.js Starts here */
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
/*AppointmentCars.js Ends here */

/*PatientDashboard.js starts here */
// src/components/PatientDashboard.js
import React, { useState } from 'react';
import AppointmentCard from './AppointmentCard';

const PatientDashboard = ({ appointments, onCancel, onSubmitNote, onBookAppointment }) => {
    const [newAppointment, setNewAppointment] = useState({ date: '', note: '' });

    const handleInputChange = (e) => {
        setNewAppointment({ ...newAppointment, [e.target.name]: e.target.value });
    };

    const handleBookAppointmentClick = async () => {
        try {
            const patientName = localStorage.getItem('username'); // Get the logged-in patient's name
            const appointmentData = {
                doctor_name: "Dr. Jane Smith",  
                patient_name: patientName, // Use the logged-in patient's name
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

    return (
        <div className="dashboard">
            <h2>Patient's Appointments</h2>

            {appointments && appointments.length > 0 ? (
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


/*PatientDashboard.js ends here */

/*DoctorDashboard.js starts here*/
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


/*Doctor Dashboard Ends here*/

