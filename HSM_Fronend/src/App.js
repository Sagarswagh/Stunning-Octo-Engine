import React, { useState, useEffect } from 'react';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import LoginPage from './components/LoginPage';
import axios from 'axios';

const App = () => {
    const [appointments, setAppointments] = useState([]);
    const [userType, setUserType] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    let timer; // Define timer outside useEffect

    useEffect(() => {
        const checkAuthStatus = () => {
            const storedUserType = localStorage.getItem('userType');
            const storedUsername = localStorage.getItem('username');
            if (storedUserType && storedUsername) {
                setIsAuthenticated(true);
                setUserType(storedUserType);
            }
        };

        // Check authentication status and fetch appointments
        checkAuthStatus();
        fetchAppointments();

        const resetTimer = () => {
            // Clear previous timer and reset
            if (timer) clearTimeout(timer);
            // Set a new timer for 3 minutes (180000 ms)
            timer = setTimeout(logout, 180000);
        };

        // Event listeners to reset the timer on user activity
        const events = ['click', 'keydown', 'mousemove'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        // Cleanup event listeners on component unmount
        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer));
            clearTimeout(timer);
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    const logout = () => {
        localStorage.removeItem('username');
        localStorage.removeItem('userType');
        setIsAuthenticated(false);
        setUserType(null); // Clear user state
        window.location.href = '/login'; // Redirect to login page
    };

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
