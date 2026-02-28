import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('generator'); // 'generator', 'analytics', 'manager'

    // --- Shared State ---
    const [savedTests, setSavedTests] = useState([]);
    const [candidates, setCandidates] = useState([]);

    // --- Generator State ---
    const [role, setRole] = useState("");
    const [jd, setJd] = useState("");
    const [generatedTest, setGeneratedTest] = useState(null);
    const [genLoading, setGenLoading] = useState(false);

    // --- Analytics State ---
    const [filters, setFilters] = useState({ university: '', search: '' });
    const [selectedCandidate, setSelectedCandidate] = useState(null); // For detailed view
    const [activeCompare, setActiveCompare] = useState([]); // List of IDs to compare
    const [compareResult, setCompareResult] = useState(null);
    const [compareLoading, setCompareLoading] = useState(false);

    // --- DB Manager State ---
    const [managerMode, setManagerMode] = useState('assessments'); // 'assessments' or 'candidates'
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [editingTest, setEditingTest] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (!token) {
            navigate('/admin');
            return;
        }
        fetchAssessments();
        if (activeTab === 'analytics' || activeTab === 'manager') fetchCandidates();
    }, [activeTab]);

    const fetchAssessments = () => {
        fetch("http://localhost:8000/assessments")
            .then(res => res.json())
            .then(data => setSavedTests(data))
            .catch(err => console.error(err));
    };

    const fetchCandidates = () => {
        fetch("http://localhost:8000/candidates")
            .then(res => res.json())
            .then(data => setCandidates(data))
            .catch(err => console.error(err));
    };

    // --- GENERATOR LOGIC ---
    const handleGenerate = async () => {
        setGenLoading(true);
        try {
            const response = await fetch("http://localhost:8000/generate-assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role_title: role, jd_text: jd }),
            });
            const data = await response.json();
            setGeneratedTest(data);
            alert("Assessment Generated & Saved Successfully");
            fetchAssessments();
        } catch (error) {
            alert("Failed to generate assessment");
        }
        setGenLoading(false);
    };

    // --- ANALYTICS LOGIC ---
    const filteredCandidates = candidates.filter(c => {
        const matchUni = filters.university ? (c.university || "").toLowerCase().includes(filters.university.toLowerCase()) : true;
        const matchSearch = filters.search ? (c.name.toLowerCase().includes(filters.search.toLowerCase()) || c.email.toLowerCase().includes(filters.search.toLowerCase())) : true;
        return matchUni && matchSearch;
    });

    // Comparison Logic
    const toggleCompare = (id) => {
        if (activeCompare.includes(id)) {
            setActiveCompare(activeCompare.filter(cid => cid !== id));
        } else {
            if (activeCompare.length >= 3) {
                alert("Select max 3 candidates to compare.");
                return;
            }
            setActiveCompare([...activeCompare, id]);
        }
    };

    const runComparison = async () => {
        setCompareLoading(true);
        try {
            const response = await fetch("http://localhost:8000/admin/compare-candidates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: activeCompare }),
            });
            const data = await response.json();
            setCompareResult(data.comparison);
        } catch (error) {
            alert("Comparison failed.");
        }
        setCompareLoading(false);
    };

    // Stats
    const totalC = candidates.length;
    const qualifiedC = candidates.filter(c => c.status === 'Qualified').length;
    const passRate = totalC > 0 ? Math.round((qualifiedC / totalC) * 100) : 0;

    // Sort Candidates: Skill Score (Final) vs Pedigree (ATS)
    // Let's create a sorted view if user clicks headers, but for now default.

    // --- DB MANAGER LOGIC ---
    // Assessment Management
    const handleEditSelect = async (id) => {
        setSelectedTestId(id);
        try {
            const response = await fetch(`http://localhost:8000/assessments/${id}`);
            const data = await response.json();
            setEditingTest(data);
        } catch (err) { console.error(err); }
    };

    const handleSaveChanges = async () => {
        if (!editingTest || !selectedTestId) return;
        try {
            const response = await fetch(`http://localhost:8000/assessments/${selectedTestId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingTest),
            });
            if (response.ok) {
                alert("Changes Saved");
                fetchAssessments();
            } else alert("Failed to save changes.");
        } catch (err) { console.error(err); alert("Error saving."); }
    };

    const handleDeleteAssessment = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Delete this assessment?")) return;
        try {
            await fetch(`http://localhost:8000/assessments/${id}`, { method: 'DELETE' });
            fetchAssessments();
            if (selectedTestId === id) { setSelectedTestId(null); setEditingTest(null); }
        } catch (err) { alert("Failed to delete"); }
    };

    // Candidate Management
    const handleDeleteCandidate = async (id) => {
        if (!window.confirm("PERMANENTLY DELETE this candidate? This cannot be undone.")) return;
        try {
            await fetch(`http://localhost:8000/candidate/${id}`, { method: 'DELETE' });
            fetchCandidates();
            if (selectedCandidate && selectedCandidate.id === id) setSelectedCandidate(null);
            alert("Candidate Deleted.");
        } catch (err) { console.error(err); alert("Failed to delete candidate."); }
    };

    const handleLogout = () => {
        localStorage.removeItem("admin_token");
        navigate('/admin');
    };


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 font-sans transition-colors duration-200">
            {/* Header & Tabs */}
            <div className="max-w-7xl mx-auto mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Recruiter Command Center</h1>
                        <p className="text-gray-500 text-sm">Automated Hiring & Intelligence Dashboard</p>
                    </div>
                    <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-medium border border-red-200 dark:border-red-900 px-4 py-2 rounded-lg bg-red-50 dark:bg-gray-800 transition-colors">
                        Logout
                    </button>
                </div>

                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-max">
                    {['generator', 'analytics', 'manager'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab
                                ? 'bg-white dark:bg-gray-600 text-purple-600 shadow-sm transform scale-105'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                        >
                            {tab === 'manager' ? 'Database' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT: GENERATOR */}
            {activeTab === 'generator' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-6 dark:text-gray-200 flex items-center gap-2">
                            ⚡ Generate Assessment
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Role Title</label>
                                <input type="text" className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    placeholder="e.g. Senior Frontend Engineer" value={role} onChange={e => setRole(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Description</label>
                                <textarea className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl h-40 focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-all"
                                    placeholder="Paste full JD here..." value={jd} onChange={e => setJd(e.target.value)} />
                            </div>
                            <button onClick={handleGenerate} disabled={genLoading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all transform hover:-translate-y-1">
                                {genLoading ? "🤖 AI Generating..." : "Generate & Save"}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border dark:border-gray-700 min-h-[500px]">
                        {!generatedTest ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <div className="text-6xl mb-4">📄</div>
                                <p className="font-medium">AI-Generated Assessment Preview</p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">{generatedTest.role}</h3>
                                    <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">✅ SAVED</span>
                                </div>
                                <div className="space-y-4">{generatedTest.questions.map((q, idx) => (
                                    <div key={idx} className="p-5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-purple-600 uppercase">Question {idx + 1}</span>
                                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">{q.difficulty || 'Medium'}</span>
                                        </div>
                                        <p className="text-gray-800 dark:text-gray-200 font-medium">{q.text}</p>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 text-xs font-bold uppercase">Total Candidates</h3>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totalC}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 text-xs font-bold uppercase">Qualified</h3>
                            <p className="text-3xl font-bold text-green-600 mt-1">{qualifiedC}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 text-xs font-bold uppercase">Pass Rate</h3>
                            <p className="text-3xl font-bold text-blue-600 mt-1">{passRate}%</p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="text-purple-200 text-xs font-bold uppercase">Actions</h3>
                            <button disabled={activeCompare.length < 2} onClick={runComparison} className="mt-2 w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all">
                                {compareLoading ? "Analyzing..." : `Compare (${activeCompare.length})`}
                            </button>
                        </div>
                    </div>

                    {/* DYNAMIC CHARTS SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* University Distribution Chart */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase">University Distribution (Filtered)</h3>
                            <div className="flex items-end space-x-4 h-40 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
                                {Object.entries(filteredCandidates.reduce((acc, c) => {
                                    const uni = c.university || "Unknown";
                                    acc[uni] = (acc[uni] || 0) + 1;
                                    return acc;
                                }, {})).map(([uni, count], i, arr) => {
                                    const max = Math.max(...Object.values(arr.reduce((a, [_, v]) => ({ ...a, v }), { v: 0 }))); // Simplified max calculation
                                    const height = max > 0 ? (count / 10) * 100 : 0; // Keeping scaling simple, assuming relative. Actually let's do real relative.
                                    const realMax = Math.max(...arr.map(([_, c]) => c));
                                    const pct = realMax > 0 ? (count / realMax) * 100 : 0;

                                    return (
                                        <div key={uni} className="flex flex-col items-center group w-16 flex-shrink-0">
                                            <div className="w-full relative group">
                                                <div className="absolute bottom-full mb-1 text-xs font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                                                <div className="w-8 mx-auto bg-blue-500 rounded-t-lg transition-all duration-500 hover:bg-blue-600" style={{ height: `${pct * 0.8}px`, minHeight: '4px' }}></div>
                                            </div>
                                            <div className="mt-2 text-[10px] text-gray-500 truncate w-full text-center" title={uni}>{uni.substring(0, 8)}...</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Status Distribution */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase">Status Breakdown</h3>
                            <div className="space-y-4">
                                {['Qualified', 'In Progress', 'Rejected', 'Disqualified'].map(status => {
                                    const count = filteredCandidates.filter(c =>
                                        status === 'In Progress' ? (c.status !== 'Qualified' && c.status !== 'Rejected' && c.status !== 'Disqualified') : c.status === status
                                    ).length;
                                    const pct = filteredCandidates.length > 0 ? (count / filteredCandidates.length) * 100 : 0;
                                    const color = status === 'Qualified' ? 'bg-green-500' : status === 'Rejected' ? 'bg-red-500' : status === 'Disqualified' ? 'bg-red-800' : 'bg-blue-500';

                                    return (
                                        <div key={status}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-bold text-gray-600 dark:text-gray-400">{status}</span>
                                                <span className="text-gray-500">{count} ({Math.round(pct)}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Comparison Result Section */}
                    {compareResult && (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-purple-100 dark:border-purple-900 border-l-4 border-l-purple-500">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">🤖 AI Comparative Analysis</h3>
                                <button onClick={() => setCompareResult(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-line">
                                {compareResult}
                            </div>
                        </div>
                    )}

                    {/* Filters & Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-end">
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">University</label>
                                    <input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                        placeholder="Filter..." value={filters.university} onChange={e => setFilters({ ...filters, university: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
                                    <input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                        placeholder="Name..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-10">Select</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ATS Score</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Skill Score</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredCandidates.map(c => (
                                    <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${activeCompare.includes(c.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                                        <td className="p-6">
                                            <input type="checkbox"
                                                checked={activeCompare.includes(c.id)}
                                                onChange={() => toggleCompare(c.id)}
                                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-gray-900 dark:text-white">{c.name}</div>
                                            <div className="text-xs text-gray-500">{c.university}</div>
                                        </td>
                                        <td className="p-6 text-sm text-gray-600 dark:text-gray-300">{c.role}</td>
                                        <td className="p-6">
                                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{c.ats_score}</div>
                                            <div className="text-[10px] text-gray-400 uppercase">Pedigree</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-lg font-bold text-purple-600">{c.final_score}</div>
                                            {c.final_score !== 'N/A' && <div className="w-16 h-1 bg-gray-200 rounded-full mt-1"><div className="h-1 bg-purple-500 rounded-full" style={{ width: `${c.final_score}%` }}></div></div>}
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'Qualified' ? 'bg-green-100 text-green-700' :
                                                c.status === 'Rejected' || c.status === 'Disqualified' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <button
                                                onClick={() => setSelectedCandidate(c)}
                                                className="text-xs border border-gray-300 hover:border-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded transition-colors"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCandidates.length === 0 && (
                                    <tr><td colSpan="7" className="p-12 text-center text-gray-400">No candidates found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Candidate Details Modal - ENHANCED */}
                    {selectedCandidate && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative border dark:border-gray-700">
                                <button onClick={() => setSelectedCandidate(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-2xl font-bold transition-colors">&times;</button>

                                {/* Header */}
                                <div className="mb-8 border-b dark:border-gray-700 pb-6">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedCandidate.name}</h2>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedCandidate.status === 'Qualified' ? 'bg-green-100 text-green-700' :
                                            selectedCandidate.status === 'Rejected' || selectedCandidate.status === 'Disqualified' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {selectedCandidate.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{selectedCandidate.role}</span>
                                        <span>•</span>
                                        <span>{selectedCandidate.email}</span>
                                        <span>•</span>
                                        <span>{selectedCandidate.university}</span>
                                    </p>
                                </div>

                                {/* Skills & Scores Visualization */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Performance Overview</h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Resume Check', score: selectedCandidate.stage_scores?.resume?.score || 0, color: 'bg-blue-500' },
                                                { label: 'Psychometric', score: selectedCandidate.stage_scores?.stage_2?.score || 0, color: 'bg-purple-500' },
                                                { label: 'Resume Tech', score: selectedCandidate.stage_scores?.stage_3?.score || 0, color: 'bg-indigo-500' },
                                                { label: 'Final Assessment', score: selectedCandidate.stage_scores?.final?.score || 0, color: 'bg-green-500' }
                                            ].map((item, idx) => (
                                                <div key={idx}>
                                                    <div className="flex justify-between text-xs font-bold mb-1 dark:text-gray-300">
                                                        <span>{item.label}</span>
                                                        <span>{item.score}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                                        <div className={`h-2.5 rounded-full shadow-sm transition-all duration-1000 ${item.color}`} style={{ width: `${item.score}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl flex flex-col justify-center">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Key Insights</h3>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                                                <span className="text-green-700 dark:text-green-400 font-bold text-xs uppercase block mb-1">Top Strength</span>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {(() => {
                                                        const s = selectedCandidate.stage_scores;
                                                        const scores = [
                                                            { n: 'Resume', v: s?.resume?.score || 0 },
                                                            { n: 'Psychometric', v: s?.stage_2?.score || 0 },
                                                            { n: 'Technical', v: s?.stage_3?.score || 0 },
                                                            { n: 'Core Skills', v: s?.final?.score || 0 }
                                                        ];
                                                        const max = scores.reduce((prev, current) => (prev.v > current.v) ? prev : current);
                                                        return max.v > 0 ? `${max.n} (${max.v}%)` : "Not enough data";
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                                                <span className="text-red-700 dark:text-red-400 font-bold text-xs uppercase block mb-1">Needs Focus</span>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {(() => {
                                                        const s = selectedCandidate.stage_scores;
                                                        const scores = [
                                                            { n: 'Resume', v: s?.resume?.score || 100 }, // Default 100 to avoid finding 0s if missing
                                                            { n: 'Psychometric', v: s?.stage_2?.score || 100 },
                                                            { n: 'Technical', v: s?.stage_3?.score || 100 },
                                                            { n: 'Core Skills', v: s?.final?.score || 100 }
                                                        ];
                                                        // Filter only if score exists (really < 100 implies we tried?)
                                                        // Simplified: just find min
                                                        const min = scores.reduce((prev, current) => (prev.v < current.v) ? prev : current);
                                                        // If all are 100 (defaults), say None
                                                        if (min.v === 100) return "N/A";
                                                        return `${min.n} (${min.v}%)`;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Feedback */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Detailed Feedback Analysis</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { title: "📄 Resume Screening", data: selectedCandidate.stage_scores?.resume },
                                            { title: "🧠 Psychometric Profile", data: selectedCandidate.stage_scores?.stage_2 },
                                            { title: "💻 Technical Interview", data: selectedCandidate.stage_scores?.stage_3 },
                                            { title: "🏆 Final Assessment", data: selectedCandidate.stage_scores?.final }
                                        ].map((card, i) => (
                                            card.data && (
                                                <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-bold text-gray-700 dark:text-gray-300">{card.title}</h4>
                                                        <span className="font-mono font-bold text-purple-600">{card.data.score || 0}/100</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                        {card.data.feedback || "No feedback recorded."}
                                                    </p>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>

                                {
                                    /* 
                                     * DELETE BUTTON REMOVED as per request.
                                     * Use DB Manager tab for deletions if strictly necessary.
                                     */
                                }
                                {/* <div className="flex justify-end pt-8 mt-4 border-t dark:border-gray-700">
                                    <button onClick={() => handleDeleteCandidate(selectedCandidate.id)} className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-red-700 shadow-md transition-all hover:scale-105">
                                        Delete Candidate
                                    </button>
                                </div> */}

                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: DB MANAGER */}
            {activeTab === 'manager' && (
                <div className="max-w-7xl mx-auto">
                    <div className="flex space-x-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-max">
                        <button
                            onClick={() => setManagerMode('assessments')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${managerMode === 'assessments' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}
                        >
                            Assessments
                        </button>
                        <button
                            onClick={() => setManagerMode('candidates')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${managerMode === 'candidates' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}
                        >
                            Candidates
                        </button>
                    </div>

                    {managerMode === 'assessments' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 p-4">
                                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Select Assessment</h3>
                                <div className="space-y-2">
                                    {savedTests.map(t => (
                                        <div key={t.id} onClick={() => handleEditSelect(t.id)}
                                            className={`p-3 border rounded cursor-pointer transition-colors flex justify-between items-center ${selectedTestId === t.id ? 'bg-purple-50 border-purple-500 dark:bg-purple-900 dark:border-purple-400' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100'}`}>
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.role_title}</span>
                                            <button onClick={(e) => handleDeleteAssessment(t.id, e)} className="text-gray-400 hover:text-red-500 px-2">Delete</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 p-6">
                                {!editingTest ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400"><p>Select assessment to edit</p></div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-xl font-bold dark:text-white">Editing: {editingTest.role}</h2>
                                            <button onClick={handleSaveChanges} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md">Save Changes</button>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Role Title</label>
                                            <input type="text" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                value={editingTest.role} onChange={e => setEditingTest({ ...editingTest, role: e.target.value })} />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Questions Schema (JSON)</label>
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-600 space-y-4">
                                                {editingTest.questions.map((q, idx) => (
                                                    <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded border dark:border-gray-700 shadow-sm relative group">
                                                        <span className="absolute top-2 right-2 text-xs font-mono text-gray-400">ID: {q.id}</span>
                                                        <div className="mb-2">
                                                            <label className="text-xs text-gray-500">Question Text</label>
                                                            <textarea className="w-full text-sm p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" rows={2}
                                                                value={q.text}
                                                                onChange={e => {
                                                                    const newQs = [...editingTest.questions];
                                                                    newQs[idx].text = e.target.value;
                                                                    setEditingTest({ ...editingTest, questions: newQs });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {managerMode === 'candidates' && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 dark:bg-gray-900 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {candidates.map(c => (
                                        <tr key={c.id}>
                                            <td className="p-4 font-mono text-xs">{c.id}</td>
                                            <td className="p-4 text-gray-900 dark:text-white font-medium">{c.name}</td>
                                            <td className="p-4 text-gray-500">{c.email}</td>
                                            <td className="p-4 text-gray-500">{c.role}</td>
                                            <td className="p-4">
                                                <button onClick={() => handleDeleteCandidate(c.id)} className="text-red-600 hover:text-red-800 font-bold text-xs border border-red-200 px-3 py-1 rounded">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {candidates.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No candidates found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
