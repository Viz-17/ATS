import React from 'react';
import { useNavigate } from 'react-router-dom';

function SubmissionSuccess() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-green-50 dark:bg-gray-900 flex items-center justify-center p-4 font-sans transition-colors duration-200">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl text-center max-w-md animate-bounce-in border dark:border-gray-700">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-green-700 dark:text-green-500 mb-2">Assessment Submitted!</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    Thank you for completing the test. Your responses have been recorded and will be evaluated by our AI Engine.
                </p>
                <button
                    onClick={() => navigate('/candidate/application')}
                    className="bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl dark:bg-green-700 dark:hover:bg-green-600"
                >
                    Return to Status
                </button>
            </div>
        </div>
    );
}

export default SubmissionSuccess;
