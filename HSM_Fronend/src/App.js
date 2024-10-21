import React, { useState, useEffect } from 'react';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import LoginPage from './components/LoginPage';
import axios from 'axios';

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
        fetchAppointments();
    }, []);

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

    const handleLogin = (type) => {
        setUserType(type);
    };

    const handleLogout = () => {
        localStorage.removeItem('username');
        localStorage.removeItem('userType');
        setUserType(null); // Reset user type
    };

    const handleCancelAppointment = async (id) => {
        setAppointments((prevAppointments) =>
            prevAppointments.map((appointment) =>
                appointment.id === id ? { ...appointment, status: 'Cancelled' } : appointment
            )
        );
        
    };

    const handleSubmitNote = async (id, newNote) => {
        const author = userType === 'doctor' ? 'Doctor' : 'Patient'; // Determine the author based on user type
        try {
            // Send both the note text and the author to the backend
            await axios.post(`http://127.0.0.1:5000/appointments/${id}/add-note`, {
                note: newNote.text,
                author: author // Include the author
            });

            // Update the appointments state with the new note
            setAppointments((prevAppointments) =>
                prevAppointments.map((appointment) =>
                    appointment.id === id
                        ? {
                            ...appointment,
                            notes: [...appointment.notes, { author: author, text: newNote.text }] // Update note structure to include author
                        }
                        : appointment
                )
            );
            return true;
        } catch (error) {
            console.error('Error submitting note:', error);
            return false;
        }
    };

    const handleBookAppointment = async (newAppointment) => {
        try {
            // Fetch appointments after a new appointment is created
            await fetchAppointments();
        } catch (error) {
            console.error('Error fetching appointments after booking:', error);
        }
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
            <div className="header">
                <h1>Hospital Management System</h1>
                <div className="logout-container">
                    <button className="logout-button" onClick={handleLogout}>Logout</button>
                </div>
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
