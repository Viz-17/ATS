import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function JobBoard() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [statusData, setStatusData] = useState(null); // { current_stage, assessment_id }
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null); // For Modal

    const candidateName = localStorage.getItem("candidate_name") || "Candidate";
    const candidateEmail = localStorage.getItem("candidate_email");

    useEffect(() => {
        if (!candidateEmail) {
            navigate('/candidate');
            return;
        }

        // Block Back Button (Session Security)
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
            alert("Please use the Logout button to exit.");
        };
        window.addEventListener('popstate', handlePopState);

        Promise.all([fetchJobs(), fetchStatus()]).then(() => setLoading(false));

        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const fetchJobs = () => {
        fetch("http://localhost:8000/assessments")
            .then(res => res.json())
            .then(data => {
                setJobs(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    const fetchStatus = () => {
        // Fetch ALL applications to determine global status
        return fetch(`http://localhost:8000/candidate/applications/${candidateEmail}`)
            .then(res => res.json())
            .then(data => {
                // data is list of { assessment_id, status, current_stage }
                setStatusData(data);
            })
            .catch(err => console.error(err));
    };

    const getJobStatus = (jobId) => {
        if (!statusData) return "Not Applied";
        // data is array
        const app = Array.isArray(statusData) ? statusData.find(a => a.assessment_id === jobId) : null;
        if (!app) return "Not Applied";

        if (app.status === "Qualified") return "Qualified";
        if (app.status === "Rejected") return "Rejected";
        if (app.status === "Disqualified") return "Disqualified";
        if (app.status === "Hired") return "Hired";

        // For Incomplete
        if (app.current_stage === -1) return "Disqualified"; // fallback legacy
        return "In Progress";
    };

    const isAnyQualified = () => {
        if (!statusData || !Array.isArray(statusData)) return false;
        return statusData.some(a => a.status === "Qualified" || a.status === "Hired");
    }

    const handleApply = async (jobId, jobRole) => {
        const app = Array.isArray(statusData) ? statusData.find(a => a.assessment_id === jobId) : null;

        // If already applied (any status), just navigate to dashboard to view results/continue
        if (app) {
            localStorage.setItem("assessment_id", jobId);
            navigate('/candidate/application');
            return;
        }

        // Validation handled by backend mainly, but rapid feedback here
        if (isAnyQualified()) {
            alert("You have already Qualified for a position. You cannot apply for more.");
            return;
        }



        const confirmMsg = app
            ? `Resume application for ${jobRole}?`
            : `Start application for ${jobRole}?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            const response = await fetch("http://localhost:8000/candidate/select-job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: candidateEmail,
                    assessment_id: jobId
                }),
            });

            if (response.ok) {
                localStorage.setItem("assessment_id", jobId); // Update local context
                navigate('/candidate/application'); // Go to Pipeline
            } else {
                const data = await response.json();
                alert(`Application Failed: ${data.detail}`);
            }
        } catch (error) {
            console.error(error);
            alert("Error starting application.");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/candidate');
    };

    if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-white">Loading Jobs...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans p-8">
            <div className="max-w-6xl mx-auto relative">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Open Roles</h1>
                        <p className="text-gray-600 dark:text-gray-400">Welcome, {candidateName}. Select a role to begin the assessment challenge.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-red-500 font-medium hover:text-red-700 border border-red-200 dark:border-red-900 px-4 py-2 rounded-lg"
                    >
                        Logout
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col hover:shadow-xl transition-shadow">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{job.role_title}</h3>
                            <div className="flex-1 mb-6">
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                                    {job.jd_text || "No description available."}
                                </p>
                                {job.jd_text && job.jd_text.length > 100 && (
                                    <button
                                        onClick={() => setSelectedJob(job)}
                                        className="text-purple-600 hover:text-purple-800 text-sm font-bold mt-2"
                                    >
                                        Read More
                                    </button>
                                )}
                            </div>
                            <div className="mt-auto flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getJobStatus(job.id) === "Qualified" ? "bg-green-100 text-green-800" :
                                        getJobStatus(job.id) === "Disqualified" ? "bg-red-100 text-red-800" :
                                            getJobStatus(job.id) === "In Progress" ? "bg-blue-100 text-blue-800" :
                                                "bg-gray-100 text-gray-800"
                                        }`}>
                                        {getJobStatus(job.id)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleApply(job.id, job.role_title)}
                                    className={`w-full text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${getJobStatus(job.id) === "Qualified" ? "bg-green-600 hover:bg-green-700" :
                                        getJobStatus(job.id) === "Rejected" || getJobStatus(job.id) === "Disqualified" ? "bg-gray-600 hover:bg-gray-700" :
                                            "bg-purple-600 hover:bg-purple-700"
                                        }`}
                                >
                                    {getJobStatus(job.id) === "Not Applied" ? "Apply Now" :
                                        getJobStatus(job.id) === "Qualified" ? "View Results" :
                                            getJobStatus(job.id) === "Rejected" || getJobStatus(job.id) === "Disqualified" ? "View Analysis" : "Continue Application"}
                                </button>
                            </div>
                        </div>
                    ))}

                    {jobs.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            No open roles found. Please check back later.
                        </div>
                    )}
                </div>

                {/* JD Modal */}
                {selectedJob && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 shadow-2xl relative">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xl font-bold"
                            >
                                &times;
                            </button>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{selectedJob.role_title}</h2>
                            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {selectedJob.jd_text}
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default JobBoard;
