import React, { useState } from 'react';
import AppointmentCard from './AppointmentCard';

const PatientDashboard = ({ appointments, onCancel, onSubmitNote, onBookAppointment }) => {
    const [newAppointment, setNewAppointment] = useState({ date: '', note: '' });

    const handleInputChange = (e) => {
        setNewAppointment({ ...newAppointment, [e.target.name]: e.target.value });
    };

    const handleBookAppointmentClick = async () => {
        // Check if both date and note are provided
        if (!newAppointment.date || !newAppointment.note) {
            alert('Please fill in both the date and note fields.');
            return;
        }

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
            onBookAppointment(createdAppointment); // Pass the created appointment to App.js
            setNewAppointment({ date: '', note: '' }); // Reset the form fields after booking

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
