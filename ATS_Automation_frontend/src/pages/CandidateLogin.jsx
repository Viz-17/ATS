import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CandidateLogin() {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        university: '',
        password: '',
        assessmentId: '1' // Default generic ID for now
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = isSignUp ? "http://localhost:8000/auth/signup" : "http://localhost:8000/auth/login";
        const payload = isSignUp ? {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            university: formData.university
        } : {
            email: formData.email,
            password: formData.password
        };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Authentication Failed");
            }

            if (isSignUp) {
                alert("Account Created! Please Sign In now.");
                setIsSignUp(false); // Switch to Login
            } else {
                // Login Success
                localStorage.setItem("candidate_name", data.name);
                localStorage.setItem("candidate_email", data.email);
                localStorage.setItem("candidate_university", data.university || "");
                localStorage.setItem("assessment_id", formData.assessmentId); // Persist selection if needed

                navigate('/candidate/dashboard');
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border dark:border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {isSignUp ? "Candidate Registration" : "Welcome Back"}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        {isSignUp ? "Join the smartest hiring platform." : "Sign in to continue your assessment."}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg mb-4 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                    <button
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isSignUp ? 'bg-white dark:bg-gray-600 text-purple-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => { setIsSignUp(true); setError(''); }}
                    >
                        Sign Up
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isSignUp ? 'bg-white dark:bg-gray-600 text-purple-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => { setIsSignUp(false); setError(''); }}
                    >
                        Sign In
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">University / College Name</label>
                            <input
                                type="text"
                                required
                                className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Harvard University"
                                value={formData.university}
                                onChange={e => setFormData({ ...formData, university: e.target.value })}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors mt-4 flex justify-center items-center"
                    >
                        {loading ? <span className="animate-spin mr-2">...</span> : isSignUp ? "Create Account & Start" : "Login & Continue"}
                    </button>

                </form>
                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>Protected by Softrate Anti-Cheat</p>
                </div>
            </div>
        </div>
    );
}

export default CandidateLogin;
