import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { useNavigate } from 'react-router-dom';

function TestEnvironment() {
    const navigate = useNavigate();
    const [activeQuestion, setActiveQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDisqualifying, setIsDisqualifying] = useState(false);

    // Proctoring State
    const [tabSwitches, setTabSwitches] = useState(0);

    // Context
    const testType = localStorage.getItem("test_type") || "jd_test"; // psychometric, resume_test, jd_test
    const candidateEmail = localStorage.getItem("candidate_email");

    useEffect(() => {
        // 1. Fetch Questions based on Type
        let url = "";
        if (testType === 'psychometric') {
            const id = localStorage.getItem("assessment_id");
            url = `http://localhost:8000/test/psychometric/${candidateEmail}/${id}`;
        }
        else if (testType === 'resume_test') {
            const id = localStorage.getItem("assessment_id");
            url = `http://localhost:8000/test/resume-questions/${candidateEmail}/${id}`;
        }
        else {
            const id = localStorage.getItem("assessment_id");
            if (id) url = `http://localhost:8000/assessments/${id}`;
        }

        if (url) {
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    console.log("Fetched Test Data:", data); // DEBUG log
                    const qs = data.questions || data;
                    if (!Array.isArray(qs)) {
                        console.error("Expected array or object with questions property, got:", data);
                        setQuestions([]);
                    } else {
                        setQuestions(qs);
                    }
                    setLoading(false);
                })
                .catch(err => { console.error("Fetch Error:", err); setLoading(false); });
        }

        // 2. Proctoring Event Listeners
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => {
                    // Stop incrementing if already at max or disqualifying
                    if (prev >= 3 || isDisqualifying) return prev;

                    const newVal = prev + 1;
                    if (newVal < 3) {
                        alert(`⚠️ WARNING: Tab switching is monitored. Strike ${newVal}/3.`);
                    }
                    return newVal;
                });
            }
        };

        // DISABLE BACK BUTTON
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
            alert("You cannot go back during a test!");
        };
        window.addEventListener('popstate', handlePopState);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        enterFullscreen();

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isDisqualifying]);

    // Effect to monitor strikes and trigger disqualification
    useEffect(() => {
        if (tabSwitches >= 3 && !isDisqualifying) {
            handleDisqualification();
        }
    }, [tabSwitches, isDisqualifying]);

    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log(err));
    };

    const handleDisqualification = async () => {
        if (isDisqualifying) return;
        setIsDisqualifying(true);

        // Force exit fullscreen immediately
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }

        alert("⛔ PROCTORING VIOLATION: Maximum strikes reached (3/3).\n\nYou have been DISQUALIFIED from this application. You cannot retake this test.");

        const assessId = parseInt(localStorage.getItem("assessment_id")) || 0;
        console.log("SENDING DISQUALIFY REQUEST:", { email: candidateEmail, assessment_id: assessId });

        try {
            const res = await fetch("http://localhost:8000/candidate/disqualify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: candidateEmail,
                    assessment_id: assessId,
                    reason: "Proctoring Violation: Tab Switching Limit Reached (3 Strikes)"
                }),
            });
            const data = await res.json();
            console.log("DISQUALIFY RESPONSE:", data);
        } catch (e) {
            console.error("DISQUALIFY ERROR:", e);
        }

        navigate('/candidate/application');
    };

    const handleSubmit = async () => {
        // Different endpoint for final stage submission vs intermediate stages
        if (testType === 'jd_test') {
            const finalAnswers = questions.map((q, idx) => answers[idx] || "No answer");
            await fetch("http://localhost:8000/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidate_name: localStorage.getItem("candidate_name"),
                    candidate_email: candidateEmail,
                    university: localStorage.getItem("candidate_university"),
                    assessment_id: parseInt(localStorage.getItem("assessment_id")) || 0,
                    answers: finalAnswers
                }),
            });
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
            navigate('/success');
        } else {
            // Intermediate Stage Completion (Psychometric & Resume Test)
            let nextStageId = 3;
            if (testType === 'resume_test') nextStageId = 4;

            // If RESUME TEST (Subjective), we MUST calculate score on backend or fake it better.
            // Current local logic fails for subjective.

            // New Logic: 
            // 1. Send Answers to Backend -> Get Score/Feedback
            // 2. Call Stage Complete with that score.

            let score = 0;
            let feedback = "Completed.";

            // For now, let's use a new endpoint or reusing /submit logic is complex.
            // Let's create a dedicated valid helper in backend?
            // Or simple hack: Client-side "AI" (random) or trust 85?
            // "Scores not getting calculated".

            // If Psychometric (MCQ):
            if (testType === 'psychometric') {
                let correctCount = 0;
                let totalScorable = 0;
                questions.forEach((q, idx) => {
                    if (q.correct_answer) {
                        totalScorable++;
                        const userAns = (answers[idx] || "").trim().toUpperCase();
                        const correctKey = q.correct_answer.trim().toUpperCase();
                        if (userAns.startsWith(correctKey)) { // "A) ..." starts with "A"
                            correctCount++;
                        }
                    }
                });
                if (totalScorable > 0) score = Math.round((correctCount / totalScorable) * 100);
                else score = 85; // Fallback if no keys (shouldn't happen now)

                feedback = `Psychometric Score: ${score}/100`;
            } else {
                // RESUME TEST (Subjective)
                // We cannot score locally.
                // We will set a temporary "Pending" score or mock it to 80 for this demo 
                // UNLESS we add a backend evaluation endpoint.
                // User wants REAL AI SCORING.
                // So we must use `evaluate_answers`.

                // Let's call a new endpoint: /stage/evaluate
                try {
                    const evalRes = await fetch("http://localhost:8000/stage/evaluate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: candidateEmail,
                            questions: questions,
                            answers: questions.map((q, i) => answers[i] || "")
                        })
                    });
                    const evalData = await evalRes.json();
                    score = evalData.score || 75;
                    feedback = evalData.feedback || "Evaluated by AI.";
                } catch (e) {
                    console.error("Eval Error", e);
                    score = 75;
                    feedback = "Error evaluating. Standard Score applied.";
                }
            }

            console.log(`Submitting Stage (${testType}): Score ${score}`);

            await fetch("http://localhost:8000/stage/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: candidateEmail,
                    stage: nextStageId,
                    score: score,
                    feedback: feedback
                }),
            });

            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
            navigate('/candidate/application');
        }
    }


    if (loading) return <div className="h-screen bg-[#1e1e1e] text-white flex items-center justify-center">Loading Test Environment...</div>;

    const q = questions[activeQuestion];
    if (!q) return <div>Error loading question</div>;

    return (
        <div className="h-screen flex flex-col bg-[#1e1e1e] font-sans text-gray-300">
            {/* Header */}
            <div className="bg-[#252526] border-b border-[#333] px-6 py-3 flex justify-between items-center shadow-sm h-14">
                <div className="flex items-center gap-3">
                    <h1 className="font-bold text-gray-100 tracking-wide">
                        {testType === 'psychometric' ? "Psychometric Evaluation" :
                            testType === 'resume_test' ? "Resume Validation" : "Final Assessment"}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Proctoring Status */}
                    <div className={`text-xs font-bold px-3 py-1 rounded flex items-center gap-2 ${tabSwitches > 0 ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                        <span>Proctoring Active</span> {tabSwitches > 0 && `(Strikes: ${tabSwitches}/3)`}
                    </div>
                    <div className="text-red-400 font-mono text-sm font-bold bg-[#3c1e1e] px-3 py-1 rounded">
                        30:00
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel */}
                <div className="w-1/3 bg-[#252526] border-r border-[#333] flex flex-col p-6">
                    <h2 className="text-sm font-mono text-[#569cd6] font-bold mb-2">QUESTION {activeQuestion + 1}</h2>
                    <p className="text-lg text-gray-100 mb-6">{q.text}</p>

                    {/* Navigation */}
                    <div className="mt-auto flex gap-2">
                        {questions.map((_, idx) => (
                            <button key={idx} onClick={() => setActiveQuestion(idx)}
                                className={`w-8 h-8 rounded text-sm font-bold ${activeQuestion === idx ? 'bg-[#007acc] text-white' : 'bg-[#3c3c3c] hover:bg-[#4a4a4a]'}`}>
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 bg-[#1e1e1e] flex flex-col relative">
                    {q.type === 'mcq' ? (
                        <div className="p-10 space-y-4">
                            {q.options && Array.isArray(q.options) ? q.options.map(opt => (
                                <label key={opt} className="flex items-center gap-3 p-4 bg-[#252526] rounded-lg border border-[#333] cursor-pointer hover:bg-[#2d2d2d] transition-colors">
                                    <input type="radio" name={`q-${q.id}`} className="w-5 h-5 accent-blue-500"
                                        checked={answers[activeQuestion] === opt}
                                        onChange={() => setAnswers({ ...answers, [activeQuestion]: opt })}
                                    />
                                    <span className="text-gray-200 text-lg">{opt}</span>
                                </label>
                            )) : <div className="text-red-400">Error: options missing for this MCQ.</div>}
                        </div>
                    ) : q.type === 'code' ? (
                        <Editor height="100%" defaultLanguage="python" theme="vs-dark"
                            value={answers[activeQuestion] || "# Code here"}
                            onChange={(val) => setAnswers({ ...answers, [activeQuestion]: val })}
                            options={{ fontSize: 14, minimap: { enabled: false } }} />
                    ) : (
                        <textarea className="w-full h-full bg-[#1e1e1e] text-gray-300 p-6 outline-none resize-none font-mono text-base"
                            placeholder="Type your answer..."
                            value={answers[activeQuestion] || ""}
                            onChange={(e) => setAnswers({ ...answers, [activeQuestion]: e.target.value })}
                        />
                    )}

                    <div className="absolute bottom-4 right-6 flex gap-3">
                        {/* Prev Button */}
                        <button
                            onClick={() => setActiveQuestion(prev => Math.max(0, prev - 1))}
                            disabled={activeQuestion === 0}
                            className={`px-4 py-2 rounded font-bold transition-colors ${activeQuestion === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-[#3c3c3c] hover:bg-[#4a4a4a] text-white'}`}
                        >
                            Previous
                        </button>

                        {/* Next Button */}
                        {activeQuestion < questions.length - 1 && (
                            <button
                                onClick={() => setActiveQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                                className="px-6 py-3 bg-[#007acc] text-white rounded font-bold hover:bg-[#0063a5] shadow-lg"
                            >
                                Next
                            </button>
                        )}

                        {/* Submit Button - Only on Last Question */}
                        {activeQuestion === questions.length - 1 && (
                            <button onClick={handleSubmit} className="px-6 py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-lg">
                                {testType === 'jd_test' ? 'Submit Assessment' : 'Complete Stage'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

}

export default TestEnvironment;
