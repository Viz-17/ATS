import React, { useState } from 'react';

function ResumeUpload({ onComplete }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const email = localStorage.getItem("candidate_email");

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return alert("Please select a PDF file first.");

        setLoading(true);
        const formData = new FormData();
        formData.append("email", email);
        formData.append("assessment_id", localStorage.getItem("assessment_id"));
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:8000/upload-resume", {
                method: "POST",
                body: formData, // No JSON headers for multipart/form-data
            });
            const data = await response.json();

            if (data.result.status === "Shortlisted") {
                alert(`Success! Moving to Level 2.`);
            } else {
                alert(`Application Rejected.`);
            }
            onComplete();

        } catch (error) {
            console.error(error);
            alert("Upload failed.");
        }
        setLoading(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold dark:text-white mb-4">Level 1: Resume Screening</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload your resume (PDF) for our AI to analyze.
                <br /><span className="text-xs text-purple-500">Tip: Ensure it contains relevant keywords for better scoring.</span>
            </p>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer relative bg-gray-50 dark:bg-gray-900">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                    <div className="text-4xl text-gray-400">PDF</div>
                    <div className="font-bold text-gray-700 dark:text-gray-300">
                        {file ? file.name : "Click or Drag PDF Here"}
                    </div>
                    <p className="text-xs text-gray-500">Max size: 5MB</p>
                </div>
            </div>

            <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-lg"
            >
                {loading ? "Analyzing Resume..." : "Upload & Analyze"}
            </button>
        </div>
    );
}

export default ResumeUpload;
