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

    const clearInputs = () => {
        setUsername('');
        setPassword('');
    };

    const handleLogin = async () => {
        if (!username || !password || !userType) {
            alert('Please fill in all fields and select a user type.');
            clearInputs();
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:5000/login', {
                username,
                password,
                user_type: userType, // Include userType in the request
            });

            if (response.status === 200) {
                // Store the username and userType in local storage
                localStorage.setItem('username', username);
                localStorage.setItem('userType', userType);
                onLogin(userType); // Pass the userType to the parent component
                alert(response.data.message); // Display success message
                clearInputs(); // Clear the form inputs after successful login
            }
        } catch (error) {
            console.error('Error logging in:', error);
            alert(error.response.data.error);
            clearInputs(); // Clear the form inputs after login failure
        }
    };

    const handleSignup = async () => {
        if (!username || !password || !userType) {
            alert('Please fill in all fields and select a user type.');
            clearInputs();
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:5000/signup', {
                username,
                password,
                user_type: userType, // Include userType in the request
            });

            if (response.status === 201) {
                alert('Signup successful! You can now log in.');
                setSignup(false); // Hide signup form after successful signup
                clearInputs(); // Clear the form inputs after successful signup
            }
        } catch (error) {
            console.error('Error signing up:', error);
            alert(error.response.data.error);
            clearInputs(); // Clear the form inputs after signup failure
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
