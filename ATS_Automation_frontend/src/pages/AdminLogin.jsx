import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e) => {
        e.preventDefault();
        if (email === "admin@softrate.com" && password === "admin") {
            localStorage.setItem("admin_token", "authenticated");
            navigate('/admin/dashboard');
        } else {
            alert("Invalid Credentials! (Try: admin@softrate.com / admin)");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 font-sans transition-colors duration-200">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">Admin Portal</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center text-sm">Secure Access for Recruiters</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            placeholder="admin@softrate.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            placeholder="•••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-lg"
                    >
                        Login to Dashboard
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={() => navigate('/')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                        ← Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;
