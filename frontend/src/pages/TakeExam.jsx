import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import SecureGuard from "../components/SecureGuard";

const TakeExam = () => {
    const { code } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get Student info from URL parameters (for new window) or location state
    const urlParams = new URLSearchParams(window.location.search);
    const [studentId, setStudentId] = useState(
        urlParams.get('studentId') || location.state?.studentId || null
    );
    const [studentClass, setStudentClass] = useState(
        urlParams.get('studentClass') || location.state?.studentClass || null
    );

    // Load student data from URL params or location state
    useEffect(() => {
        const urlStudentId = urlParams.get('studentId');
        const urlStudentClass = urlParams.get('studentClass');
        
        if (urlStudentId && urlStudentClass) {
            // Data from URL (new window mode)
            setStudentId(urlStudentId);
            setStudentClass(urlStudentClass);
            return;
        }
        
        if (location.state?.studentId && location.state?.studentClass) {
            // Data from location state (same window mode)
            setStudentId(location.state.studentId);
            setStudentClass(location.state.studentClass);
            return;
        }

        // If no student data found, redirect to join page
        navigate(`/join/${code}`);
    }, [code, navigate, location.state]);

    // --- STATE MANAGEMENT ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const isSubmittingRef = useRef(false); // Track if we're submitting to prevent beforeunload warning
    
    // Exam Data
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDuration, setQuizDuration] = useState(60); // Duration in minutes
    const [timeRemaining, setTimeRemaining] = useState(null); // Time remaining in seconds
    const [questions, setQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // Format: { 0: "Answer A", 1: "My written answer" }

    const [quizStatus, setQuizStatus] = useState(null);
    const [quizSchedule, setQuizSchedule] = useState(null);
    const [examStartTime, setExamStartTime] = useState(null);
    const [sessionToken, setSessionToken] = useState(null);
    const [quizId, setQuizId] = useState(null);
    const [isPaused, setIsPaused] = useState(false);

    // --- REAL-TIME SESSION TRACKING ---
    const startRealtimeSession = async (qId, totalQs, timeRemainingSecs) => {
        try {
            const res = await api.post('/api/realtime/session/start', {
                student_identifier: studentId,
                student_class: studentClass,
                quiz_id: qId,
                total_questions: totalQs,
                time_remaining_seconds: timeRemainingSecs
            });
            setSessionToken(res.session_token);
        } catch (err) {
            console.error('Failed to start session tracking:', err);
        }
    };

    const updateRealtimeSession = async () => {
        if (!sessionToken) return;
        
        try {
            const response = await api.post('/api/realtime/session/update', {
                session_token: sessionToken,
                current_question_index: currentQIndex,
                questions_answered: Object.keys(answers).length,
                time_remaining_seconds: timeRemaining
            });
            
            // Check if session is paused
            if (response.status === 'PAUSED') {
                setIsPaused(true);
            } else if (response.status === 'ACTIVE') {
                setIsPaused(false);
            }
        } catch (err) {
            console.error('Failed to update session:', err);
        }
    };

    const endRealtimeSession = async () => {
        if (!sessionToken) return;
        
        try {
            await api.post('/api/realtime/session/end', {
                session_token: sessionToken
            });
        } catch (err) {
            console.error('Failed to end session:', err);
        }
    };

    // Update session every 2 seconds (heartbeat) for faster monitoring
    useEffect(() => {
        if (!sessionToken || !quizStatus || quizStatus !== 'ACTIVE') return;
        
        // Send immediate heartbeat on mount
        updateRealtimeSession();
        
        const interval = setInterval(() => {
            updateRealtimeSession();
        }, 2000);
        
        return () => clearInterval(interval);
    }, [sessionToken, currentQIndex, answers, timeRemaining, quizStatus]);

    // --- 1. FETCH EXAM DATA ---
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const res = await api.get(`/api/exam/start?code=${code}`);
                
                // Normalize status (handle case variations)
                const normalizedStatus = res.quiz.status ? res.quiz.status.toUpperCase().trim() : 'INACTIVE';
                setQuizStatus(normalizedStatus);
                setQuizSchedule({
                    start_time: res.quiz.start_time,
                    end_time: res.quiz.end_time
                });

                // Only set error if quiz is ACTIVE but has no questions
                // If quiz is not active, it's normal to have no questions (waiting room)
                if (normalizedStatus === 'ACTIVE') {
                    if (res.questions && res.questions.length > 0) {
                        // Check if shuffle is enabled
                        const description = res.quiz.description || '';
                        const shouldShuffle = description.includes('[SHUFFLE:true]');
                        
                        let questionsToSet = res.questions;
                        if (shouldShuffle) {
                            // Fisher-Yates shuffle algorithm
                            questionsToSet = [...res.questions];
                            for (let i = questionsToSet.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [questionsToSet[i], questionsToSet[j]] = [questionsToSet[j], questionsToSet[i]];
                            }
                        }
                        
                        setQuestions(questionsToSet);
                        setQuizTitle(res.quiz.title);
                        setQuizDuration(res.quiz.duration_minutes || 60);
                        setQuizId(res.quiz.id);
                        
                        // Set exam start time and calculate time remaining
                        if (!examStartTime) {
                            const startTime = Date.now();
                            setExamStartTime(startTime);
                            setTimeRemaining((res.quiz.duration_minutes || 60) * 60); // Convert to seconds
                            
                            // Start real-time session tracking
                            startRealtimeSession(res.quiz.id, questionsToSet.length, (res.quiz.duration_minutes || 60) * 60);
                        }
                        
                        setError(null); // Clear any previous errors
                    } else {
                        setError("This quiz is active but has no questions. Please contact the teacher.");
                    }
                } else {
                    // Quiz is not active - clear error, questions will be empty (waiting room)
                    setError(null);
                    setQuestions([]);
                    setQuizTitle(res.quiz.title || '');
                }
            } catch (err) {
                console.error("Exam Load Error:", err);
                setError(err.message || "Failed to load exam. Please check your connection or code.");
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchExam();
        }

        // Poll every 10 seconds to check if quiz becomes active
        const interval = setInterval(() => {
            if (quizStatus !== 'ACTIVE') {
                fetchExam();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [code, quizStatus]);

    // --- COUNTDOWN TIMER ---
    useEffect(() => {
        if (!examStartTime || timeRemaining === null || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Auto-submit when time runs out
                    submitExam(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [examStartTime, timeRemaining]);

    // Format time remaining as MM:SS
    const formatTime = (seconds) => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // --- 2. HANDLERS ---
    const handleAnswer = (val) => {
        setAnswers({ ...answers, [currentQIndex]: val });
    };

    const nextQuestion = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(currentQIndex + 1);
        }
    };

    // Removed prevQuestion - students cannot go back

    // --- 3. SUBMIT EXAM TO AI ---
    const submitExam = async (isAutoSubmit = false) => {
        if (!isAutoSubmit && !window.confirm("Are you sure you want to finish the exam?")) return;

        setIsSubmitting(true);
        isSubmittingRef.current = true; // Mark as submitting to prevent beforeunload warning
        
        // End real-time session
        await endRealtimeSession();

        try {
            // Format answers for the backend API
            // Maps the array index back to the specific Question ID from the database
            const formattedAnswers = questions.map((q, index) => ({
                question_id: q.id,
                value: answers[index] || "" // Send empty string if skipped
            }));

            const payload = {
                student_identifier: studentId,
                student_class: studentClass,
                answers: formattedAnswers
            };

            const res = await api.post('/api/exam/submit', payload);
            
            // Navigate to results page if enabled
            if (res.show_results && res.student_id) {
                // Close the secure exam window and open results in parent/new window
                if (window.opener) {
                    // Opened as popup - open results in parent window
                    window.opener.location.href = `/exam-results?student_id=${res.student_id}`;
                    // Close the secure exam window
                    setTimeout(() => window.close(), 500);
                } else {
                    // Same window - navigate to results
                    window.location.href = `/exam-results?student_id=${res.student_id}`;
                }
            } else {
                // Results not available, show alert and close
                if (!isAutoSubmit) {
                    alert(`Exam Submitted Successfully!\nYour Score: ${res.final_score}%`);
                }
                
                // Close the window if it was opened as a popup
                if (window.opener) {
                    window.close();
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            console.error("Submission Error:", err);
            if (!isAutoSubmit) {
                alert("Failed to submit exam. Please try again.");
            }
            setIsSubmitting(false);
            isSubmittingRef.current = false; // Reset if submission fails
        }
    };

    // Handle page unload - end session immediately for real-time monitoring
    useEffect(() => {
        if (!sessionToken) return;

        const handlePageUnload = () => {
            // End session immediately when page closes/unloads
            // Use sendBeacon for reliable delivery even if page is closing
            try {
                const payload = JSON.stringify({
                    session_token: sessionToken
                });
                
                // Use sendBeacon with proper content type header
                const blob = new Blob([payload], { type: 'application/json' });
                // Use same API base URL as the rest of the app
                const url = `http://localhost/quiz_platform/backend/api/realtime/session/end`;
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(url, blob);
                } else {
                    // Fallback: synchronous XMLHttpRequest (older browsers)
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', url, false); // false = synchronous
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(payload);
                }
            } catch (err) {
                // Silent fail - page is closing anyway
            }
        };

        // Handle multiple unload events for maximum compatibility
        window.addEventListener('beforeunload', handlePageUnload);
        window.addEventListener('pagehide', handlePageUnload);
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                handlePageUnload();
            }
        });

        return () => {
            window.removeEventListener('beforeunload', handlePageUnload);
            window.removeEventListener('pagehide', handlePageUnload);
            // Note: visibilitychange listener doesn't need cleanup
        };
    }, [sessionToken]);

    // Handle window close - auto-submit exam
    useEffect(() => {
        if (!studentId || !questions.length) return;

        const handleBeforeUnload = async (e) => {
            // Don't show warning if we're submitting normally
            if (isSubmittingRef.current) {
                return; // Allow navigation/close without warning
            }
            
            // If exam is active, warn user before closing
            if (quizStatus === 'ACTIVE' && questions.length > 0) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue
                
                // Submit synchronously using sendBeacon
                try {
                    const formattedAnswers = questions.map((q, index) => ({
                        question_id: q.id,
                        value: answers[index] || ""
                    }));

                    const payload = JSON.stringify({
                        student_identifier: studentId,
                        student_class: studentClass,
                        answers: formattedAnswers
                    });

                    // Use sendBeacon for reliable submission on window close
                    const blob = new Blob([payload], { type: 'application/json' });
                    navigator.sendBeacon(`${window.location.origin}/quiz_platform/backend/api/exam/submit`, blob);
                } catch (err) {
                    console.error('Error auto-submitting on close:', err);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [quizStatus, questions, answers, studentId, studentClass]);

    // --- 4. RENDER STATES ---

    // A. Security Blocked View
    if (isBlocked) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#222831] text-[#EEEEEE]">
                <div className="bg-[#393E46] p-10 rounded-lg shadow-2xl text-center border-t-4 border-red-600">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">EXAM TERMINATED</h1>
                    <p className="text-lg">Security violation detected (Tab Switching).</p>
                    <button onClick={() => navigate('/')} className="mt-8 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    // B. Loading View
    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#222831] text-[#00ADB5]">
                <svg className="animate-spin h-12 w-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="text-xl font-bold animate-pulse">Loading Secure Environment...</div>
            </div>
        );
    }

    // C. Error View
    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#222831] text-[#EEEEEE]">
                <div className="bg-[#393E46] p-8 rounded shadow-lg text-center border-l-4 border-red-500 max-w-md">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">Unable to Start</h1>
                    <p className="mb-6 text-gray-300">{error}</p>
                    <button onClick={() => navigate('/')} className="text-[#00ADB5] font-bold hover:underline">
                        &larr; Go Back
                    </button>
                </div>
            </div>
        );
    }

    // D. Waiting Room (Quiz not active yet)
    if (quizStatus !== 'ACTIVE') {
        const now = new Date();
        const startTime = quizSchedule?.start_time ? new Date(quizSchedule.start_time) : null;
        const endTime = quizSchedule?.end_time ? new Date(quizSchedule.end_time) : null;

        let message = "The quiz has not started yet. Please wait for the teacher to activate it.";
        let showCountdown = false;

        if (startTime && now < startTime) {
            message = "Quiz is scheduled to start soon.";
            showCountdown = true;
        } else if (endTime && now > endTime) {
            message = "This quiz has ended.";
        }

        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#0EA5E9] to-[#0284C7]">
                <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md mx-4">
                    {/* Animated Loading Icon */}
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 border-8 border-[#E5E7EB] rounded-full"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 border-8 border-[#0EA5E9] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <svg className="h-24 w-24 mx-auto text-[#0EA5E9] relative z-10 opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    
                    <h1 className="text-2xl font-bold text-[#111827] mb-2">Waiting Room</h1>
                    <p className="text-[#6B7280] mb-6">{message}</p>
                    
                    {/* Student Info */}
                    <div className="bg-[#F9FAFB] p-4 rounded-lg mb-6 text-left">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[#6B7280]">Student:</span>
                            <span className="font-semibold text-[#111827]">{studentId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#6B7280]">Class:</span>
                            <span className="font-semibold text-[#111827]">{studentClass}</span>
                        </div>
                    </div>

                    {showCountdown && startTime && (
                        <div className="bg-[#0EA5E9] bg-opacity-10 p-4 rounded-lg mb-6 border-2 border-[#0EA5E9]">
                            <p className="text-sm text-[#6B7280] mb-2">Scheduled Start Time:</p>
                            <p className="text-lg font-bold text-[#0EA5E9]">{startTime.toLocaleString()}</p>
                        </div>
                    )}
                    
                    {/* Animated Dots */}
                    <div className="flex items-center justify-center gap-2 text-sm text-[#6B7280]">
                        <span>Checking status</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-[#0EA5E9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-[#0EA5E9] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-[#0EA5E9] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQIndex];

    // E. Paused Exam Overlay
    if (isPaused) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
                <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md mx-4">
                    {/* Paused Icon */}
                    <div className="mb-6">
                        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    
                    <h1 className="text-3xl font-bold text-[#111827] mb-2">Exam Paused</h1>
                    <p className="text-[#6B7280] mb-6">Your exam has been paused by the teacher. Please wait for it to be resumed.</p>
                    
                    {/* Student Info */}
                    <div className="bg-[#F9FAFB] p-4 rounded-lg mb-6 text-left">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[#6B7280]">Student:</span>
                            <span className="font-semibold text-[#111827]">{studentId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#6B7280]">Class:</span>
                            <span className="font-semibold text-[#111827]">{studentClass}</span>
                        </div>
                    </div>
                    
                    {/* Progress Info */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                        <p className="text-sm text-blue-600 mb-1">Your Progress:</p>
                        <p className="text-lg font-bold text-blue-800">
                            Question {currentQIndex + 1} of {questions.length}
                        </p>
                        <div className="w-full bg-blue-200 h-2 rounded-full mt-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* Animated Dots */}
                    <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
                        <span>Waiting for teacher to resume</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // D. Main Exam Interface
    return (
        <div className="h-screen flex flex-col bg-[#EEEEEE]">
            {/* Security Component */}
            <SecureGuard studentId={studentId} sessionToken={sessionToken} onBlock={() => setIsBlocked(true)} isSubmitting={isSubmitting} />

            {/* Top Bar */}
            <div className={`h-16 text-white flex justify-between items-center px-6 shadow-md z-10 ${
                isPaused ? 'bg-orange-600' : 'bg-[#222831]'
            }`}>
                <div>
                    <h1 className={`font-bold text-lg tracking-wide ${isPaused ? 'text-white' : 'text-[#00ADB5]'}`}>
                        {quizTitle}
                    </h1>
                    <span className="text-xs text-gray-400">Code: {code}</span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Pause Indicator */}
                    {isPaused && (
                        <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="text-sm font-bold">PAUSED</span>
                        </div>
                    )}
                    
                    {/* Countdown Timer */}
                    {timeRemaining !== null && (
                        <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg border-2 ${
                            timeRemaining < 300 ? 'bg-red-900 border-red-500 text-red-200 animate-pulse' : 
                            timeRemaining < 600 ? 'bg-yellow-900 border-yellow-500 text-yellow-200' : 
                            isPaused ? 'bg-white bg-opacity-20 border-white text-white' :
                            'bg-[#393E46] border-[#00ADB5] text-[#00ADB5]'
                        }`}>
                            ⏱ {formatTime(timeRemaining)}
                        </div>
                    )}
                    <div className="text-right hidden md:block">
                        <div className="text-gray-300 text-sm">{studentId}</div>
                        <div className="text-gray-400 text-xs">{studentClass}</div>
                    </div>
                    <div className={`px-3 py-1 rounded font-mono font-bold border ${
                        isPaused ? 'bg-white bg-opacity-20 text-white border-white' : 
                        'bg-[#393E46] text-[#00ADB5] border-gray-600'
                    }`}>
                        {isPaused ? 'PAUSED' : 'LIVE EXAM'}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation (Hidden on small screens) */}
                <div className="w-64 bg-[#393E46] text-white p-4 hidden md:block overflow-y-auto border-r border-gray-700">
                    <h3 className="text-[#00ADB5] font-bold mb-4 text-xs uppercase tracking-wider">Question Map</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((_, idx) => (
                            <div 
                                key={idx}
                                className={`h-10 w-10 rounded font-bold text-sm flex items-center justify-center transition duration-200
                                    ${currentQIndex === idx ? 'bg-[#00ADB5] text-white shadow-lg scale-105' : 
                                      answers[idx] ? 'bg-blue-900 text-blue-200 border border-blue-700' : 
                                      idx < currentQIndex ? 'bg-gray-700 text-gray-400' : 'bg-[#222831] text-gray-500'}
                                    ${idx <= currentQIndex ? '' : 'opacity-50 cursor-not-allowed'}`}
                                title={idx > currentQIndex ? 'Answer current question first' : ''}
                            >
                                {idx + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Question Area */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto flex justify-center bg-[#EEEEEE]">
                    <div className="w-full max-w-2xl pb-8">
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-300 h-2 rounded-full mb-6 overflow-hidden">
                            <div 
                                className="bg-[#00ADB5] h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                            ></div>
                        </div>

                        {/* Question Card */}
                        <div className="bg-white p-5 md:p-8 rounded-lg shadow-lg border-t-8 border-[#222831]">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[#00ADB5] font-bold text-sm tracking-wide bg-teal-50 px-2 py-1 rounded">
                                    QUESTION {currentQIndex + 1} OF {questions.length}
                                </span>
                                <span className="text-gray-400 text-xs font-mono">
                                    {currentQ.type.replace('_', ' ')}
                                </span>
                            </div>
                            
                            <h2 className="text-lg md:text-xl font-bold text-[#222831] mb-5 leading-snug break-words">
                                {currentQ.question_text}
                            </h2>

                            {/* Render Options based on Type */}
                            {currentQ.type === 'MCQ' ? (
                                <div className="space-y-2.5">
                                    {currentQ.options && currentQ.options.map((opt, i) => (
                                        <button 
                                            key={i}
                                            type="button"
                                            onClick={(e) => {
                                                if (isPaused) return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleAnswer(opt);
                                            }}
                                            disabled={isPaused}
                                            className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all duration-200 flex items-center group text-sm md:text-base
                                                ${answers[currentQIndex] === opt 
                                                    ? 'border-[#00ADB5] bg-teal-50 text-[#222831] font-bold shadow-sm' 
                                                    : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700'}
                                                ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className={`flex items-center justify-center w-7 h-7 mr-3 rounded-full text-xs transition
                                                ${answers[currentQIndex] === opt ? 'bg-[#00ADB5] text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <span className="break-words flex-1">{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : currentQ.type === 'TRUE_FALSE' ? (
                                <div className="space-y-2.5">
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            if (isPaused) return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleAnswer('True');
                                        }}
                                        disabled={isPaused}
                                        className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all duration-200 flex items-center group
                                            ${answers[currentQIndex] === 'True' 
                                                ? 'border-[#00ADB5] bg-teal-50 text-[#222831] font-bold shadow-sm' 
                                                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700'}
                                            ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className={`flex items-center justify-center w-7 h-7 mr-3 rounded-full text-xs transition
                                            ${answers[currentQIndex] === 'True' ? 'bg-[#00ADB5] text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>
                                            T
                                        </span>
                                        True
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            if (isPaused) return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleAnswer('False');
                                        }}
                                        disabled={isPaused}
                                        className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all duration-200 flex items-center group
                                            ${answers[currentQIndex] === 'False' 
                                                ? 'border-[#00ADB5] bg-teal-50 text-[#222831] font-bold shadow-sm' 
                                                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700'}
                                            ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className={`flex items-center justify-center w-7 h-7 mr-3 rounded-full text-xs transition
                                            ${answers[currentQIndex] === 'False' ? 'bg-[#00ADB5] text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>
                                            F
                                        </span>
                                        False
                                    </button>
                                </div>
                            ) : (
                                <textarea 
                                    className="w-full h-40 p-3 md:p-4 border-2 border-gray-300 rounded-lg focus:border-[#00ADB5] focus:ring-4 focus:ring-teal-100 outline-none text-[#222831] text-sm md:text-base resize-none"
                                    placeholder="Type your detailed answer here..."
                                    value={answers[currentQIndex] || ''}
                                    onChange={(e) => handleAnswer(e.target.value)}
                                    disabled={isPaused}
                                />
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 mb-6">
                            {currentQIndex === questions.length - 1 ? (
                                <button 
                                    onClick={submitExam}
                                    disabled={isSubmitting || isPaused}
                                    className={`w-full sm:w-auto px-6 md:px-8 py-3 bg-[#00ADB5] text-white font-bold rounded-lg shadow-lg hover:brightness-110 flex items-center justify-center gap-2 transition transform hover:scale-105
                                        ${isSubmitting || isPaused ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            GRADING...
                                        </>
                                    ) : isPaused ? (
                                        "EXAM PAUSED"
                                    ) : (
                                        "SUBMIT EXAM"
                                    )}
                                </button>
                            ) : (
                                <button 
                                    onClick={nextQuestion}
                                    disabled={isPaused}
                                    className={`w-full sm:w-auto px-6 md:px-8 py-3 bg-[#222831] text-white font-bold rounded-lg hover:bg-black shadow-md transition
                                        ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isPaused ? "EXAM PAUSED" : "Next Question →"}
                                </button>
                            )}
                            {/* Question counter for mobile */}
                            <div className="text-sm text-gray-600 text-center sm:text-right">
                                {currentQIndex + 1} / {questions.length}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeExam;