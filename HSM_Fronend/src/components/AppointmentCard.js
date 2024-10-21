// src/components/AppointmentCard.js
import React, { useState, useEffect } from 'react';

const AppointmentCard = ({ appointment, onCancel, onSubmitNote }) => {
    const [note, setNote] = useState('');
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        if (appointment.notes) {
            setNotes(appointment.notes.map(note => ({
                text: note.text,
                author: note.author === 'Doctor' ? 'Doctor' : 'Patient',
            })));
        }
    }, [appointment.notes]);

    const handleNoteChange = (e) => {
        setNote(e.target.value);
    };

    const handleNoteSubmit = async () => {
        if (note.trim() === "") return;

        const newNote = {
            text: note,
            author: 'Patient', // Assuming the patient is adding the note
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
                onCancel(appointment.id); // Call the onCancel function passed as a prop
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
            <p>Patient: {appointment.patient_name}</p>
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
