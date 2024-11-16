//src/components/DoctorDashboard.js
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
