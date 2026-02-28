import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-8 font-sans transition-colors duration-200">
            <h1 className="text-4xl font-bold text-blue-900 dark:text-blue-400 mb-8">Softrate AI Recruitment</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
                {/* Admin Card */}
                <div
                    onClick={() => navigate('/admin')}
                    className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-8 border-blue-500 transform hover:-translate-y-1 flex flex-col items-center text-center"
                >
                    <div className="text-6xl mb-4">👮</div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Recruiter Portal</h2>
                    <p className="text-gray-500 dark:text-gray-400">Create JD-based AI Assessments & View Results.</p>
                </div>

                {/* Candidate Card */}
                <div
                    onClick={() => navigate('/candidate')}
                    className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-8 border-purple-500 transform hover:-translate-y-1 flex flex-col items-center text-center"
                >
                    <div className="text-6xl mb-4">👩‍💻</div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Candidate Portal</h2>
                    <p className="text-gray-500 dark:text-gray-400">Take AI-Proctored Assessments.</p>
                </div>
            </div>
        </div>
    );
}

export default Home;
