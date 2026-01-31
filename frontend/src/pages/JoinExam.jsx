import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Swal from 'sweetalert2';

// Icons
const UserIcon = () => (
    <svg className="h-5 w-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const ClassIcon = () => (
    <svg className="h-5 w-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const JoinExam = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [studentId, setStudentId] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [loading, setLoading] = useState(false);
    const [quizInfo, setQuizInfo] = useState(null);
    const [fetchingQuiz, setFetchingQuiz] = useState(true);

    // Fetch quiz info to get required class
    useEffect(() => {
        const fetchQuizInfo = async () => {
            try {
                const res = await api.get(`/api/exam/start?code=${code}`);
                setQuizInfo(res.quiz);
            } catch (err) {
                console.error('Error fetching quiz:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Quiz Not Found',
                    text: 'Invalid quiz code or quiz not available',
                    confirmButtonColor: '#0EA5E9'
                }).then(() => navigate('/'));
            } finally {
                setFetchingQuiz(false);
            }
        };
        fetchQuizInfo();
    }, [code, navigate]);

    const handleJoin = async (e) => {
        e.preventDefault();
        
        if (!studentId.trim() || !studentClass.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please fill in all fields',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }

        // Validate class if quiz has a class requirement
        if (quizInfo?.class && quizInfo.class.trim()) {
            const requiredClass = quizInfo.class.trim().toLowerCase();
            const enteredClass = studentClass.trim().toLowerCase();
            
            if (requiredClass !== enteredClass) {
                Swal.fire({
                    icon: 'error',
                    title: 'Class Mismatch',
                    html: `<p>This quiz is only for class: <strong>${quizInfo.class}</strong></p><p>You entered: <strong>${studentClass}</strong></p>`,
                    confirmButtonColor: '#0EA5E9'
                });
                return;
            }
        }

        setLoading(true);
        
        try {
            // Check if student already submitted this quiz or was blocked
            const checkResponse = await api.get(`/api/exam/check-submission?code=${code}&student_id=${encodeURIComponent(studentId.trim())}`);
            
            // ALWAYS block if student was terminated/blocked (security violations)
            if (checkResponse.is_blocked) {
                setLoading(false);
                await Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: checkResponse.message || 'Your exam was terminated due to security violations. You cannot retake this exam.',
                    confirmButtonColor: '#DC2626'
                });
                return;
            }
            
            // Check if already submitted
            if (checkResponse.already_submitted) {
                // If retakes are NOT allowed, block the student
                if (!checkResponse.allow_retake) {
                    setLoading(false);
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Already Submitted',
                        html: `
                            <p>You have already submitted this quiz.</p>
                            ${checkResponse.previous_score ? `<p class="mt-2"><strong>Your Score: ${Math.round(checkResponse.previous_score)}%</strong></p>` : ''}
                            <p class="mt-2 text-sm text-gray-600">Retakes are not allowed for this quiz.</p>
                        `,
                        confirmButtonColor: '#0EA5E9'
                    });
                    return;
                }
                
                // Retakes ARE allowed - show confirmation dialog
                const result = await Swal.fire({
                    icon: 'info',
                    title: 'Retake Quiz?',
                    html: `
                        <p>You have already submitted this quiz.</p>
                        ${checkResponse.previous_score ? `<p class="mt-2"><strong>Previous Score: ${Math.round(checkResponse.previous_score)}%</strong></p>` : ''}
                        <p class="mt-3 text-sm text-gray-600">The teacher has enabled retakes for this quiz.</p>
                        <p class="mt-1 text-sm text-gray-600"><strong>Note:</strong> Your new score will replace your previous score.</p>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Retake Quiz',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#0EA5E9',
                    cancelButtonColor: '#6B7280'
                });
                
                if (!result.isConfirmed) {
                    setLoading(false);
                    return;
                }
                // If confirmed, continue to join the exam
            }
        } catch (err) {
            // If check fails, continue (don't block student)
            console.error('Error checking submission:', err);
        }
        
        // Navigate to exam page with student data
        setLoading(false);
        navigate(`/exam/${code}`, {
            state: {
                studentId: studentId.trim(),
                studentClass: studentClass.trim()
            }
        });
    };

    if (fetchingQuiz) {
        return (
            <div className="h-screen w-full relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute h-full w-full bg-white">
                    <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
                </div>
                
                <div className="relative z-10 h-full flex items-center justify-center">
                    <div className="text-center">
                        <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#0EA5E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-lg font-semibold text-[#111827]">Loading quiz...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute h-full w-full bg-white">
                <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 h-full flex items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    
                    {/* Left Side - Quiz Info (Hidden on mobile, shown on large screens) */}
                    <div className="hidden lg:block space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="bg-[#0EA5E9] text-white p-2 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-[#111827]">QuizAI</h1>
                            </div>
                            <h2 className="text-3xl font-bold text-[#111827] leading-tight">
                                {quizInfo?.title || 'Join Quiz'}
                            </h2>
                            <p className="text-[#6B7280] text-lg">
                                Enter your details to start the quiz. Make sure you have a stable internet connection.
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
                                <span className="text-[#374151]">Secure exam environment</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
                                <span className="text-[#374151]">Real-time monitoring</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
                                <span className="text-[#374151]">Auto-save answers</span>
                            </div>
                        </div>

                        {/* Quiz Code Display */}
                        <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                            <div className="text-center">
                                <p className="text-sm text-[#6B7280] mb-1">Quiz Code</p>
                                <p className="text-2xl font-mono font-bold text-[#0EA5E9]">{code}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Join Form */}
                    <div className="w-full max-w-sm mx-auto lg:mx-0">
                        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-[#E5E7EB]">
                            {/* Mobile Header with Quiz Info */}
                            <div className="lg:hidden text-center mb-6">
                                <div className="flex items-center justify-center space-x-2 mb-3">
                                    <div className="bg-[#0EA5E9] text-white p-2 rounded-lg">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h1 className="text-lg font-bold text-[#111827]">QuizAI</h1>
                                </div>
                                {quizInfo?.title && (
                                    <h2 className="text-xl font-bold text-[#111827] mb-2">{quizInfo.title}</h2>
                                )}
                                {/* Mobile Quiz Code */}
                                <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB] mb-4">
                                    <p className="text-xs text-[#6B7280] mb-1">Quiz Code</p>
                                    <p className="text-xl font-mono font-bold text-[#0EA5E9]">{code}</p>
                                </div>
                            </div>

                            {/* Desktop Header */}
                            <div className="hidden lg:block text-center mb-6">
                                <div className="bg-[#0EA5E9] bg-opacity-10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-[#111827] mb-2">Join Quiz</h3>
                                <p className="text-[#6B7280]">Enter your details to begin</p>
                            </div>

                            {/* Mobile Simple Header */}
                            <div className="lg:hidden text-center mb-4">
                                <h3 className="text-lg font-bold text-[#111827] mb-1">Enter Your Details</h3>
                                <p className="text-sm text-[#6B7280]">Fill in the form to start the quiz</p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleJoin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#374151] mb-1">
                                        Student ID
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <UserIcon />
                                        </div>
                                        <input
                                            type="text"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition text-sm md:text-base"
                                            placeholder="Enter your student ID"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#374151] mb-1">
                                        Class / Section
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <ClassIcon />
                                        </div>
                                        <input
                                            type="text"
                                            value={studentClass}
                                            onChange={(e) => setStudentClass(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition text-sm md:text-base"
                                            placeholder={quizInfo?.class || "e.g., Grade 10-A"}
                                            required
                                        />
                                    </div>
                                    {quizInfo?.class && (
                                        <p className="text-xs text-[#6B7280] mt-1">
                                            Required class: <span className="font-semibold">{quizInfo.class}</span>
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#0EA5E9] text-white font-medium py-3 rounded-lg hover:bg-[#0284C7] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Joining...
                                        </div>
                                    ) : (
                                        "Start Quiz"
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="mt-4 text-center text-xs text-[#6B7280]">
                                <p className="lg:hidden">Ensure stable internet connection</p>
                                <p className="hidden lg:block">Ensure stable internet connection before starting</p>
                            </div>

                            {/* Mobile Features List */}
                            <div className="lg:hidden mt-4 pt-4 border-t border-[#E5E7EB]">
                                <div className="grid grid-cols-1 gap-2 text-xs text-[#6B7280]">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-[#0EA5E9] rounded-full"></div>
                                        <span>Secure exam environment</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-[#0EA5E9] rounded-full"></div>
                                        <span>Real-time monitoring</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-[#0EA5E9] rounded-full"></div>
                                        <span>Auto-save answers</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinExam;
