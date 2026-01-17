import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdPerson, MdClass } from 'react-icons/md';
import api from '../utils/api';
import Swal from 'sweetalert2';

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
                }).then(() => navigate('/join'));
            } finally {
                setFetchingQuiz(false);
            }
        };
        fetchQuizInfo();
    }, [code, navigate]);

    const handleJoin = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!studentId.trim() || !studentClass.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please fill in all fields',
                confirmButtonColor: '#0EA5E9'
            });
            return false;
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
                return false;
            }
        }

        setLoading(true);
        
        try {
            // Check if student already submitted this quiz
            const checkResponse = await api.get(`/api/exam/check-submission?code=${code}&student_id=${encodeURIComponent(studentId.trim())}`);
            
            if (checkResponse.already_submitted) {
                setLoading(false);
                await Swal.fire({
                    icon: 'warning',
                    title: 'Already Submitted',
                    text: 'You have already submitted this quiz. You cannot take it again.',
                    confirmButtonColor: '#0EA5E9'
                });
                return false;
            }
        } catch (err) {
            // If check fails, continue (don't block student)
            console.error('Error checking submission:', err);
        }
        
        // Navigate to exam page normally (same window) with student data in state
        setLoading(false);
        navigate(`/exam/${code}`, {
            state: {
                studentId: studentId.trim(),
                studentClass: studentClass.trim()
            }
        });
        
        return false;
    };

    if (fetchingQuiz) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#0EA5E9] to-[#0284C7]">
                <div className="text-white text-center">
                    <svg className="animate-spin h-12 w-12 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg font-semibold">Loading quiz...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] p-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                {/* Header */}
                <div className="text-center mb-5">
                    <div className="inline-block p-3 bg-[#0EA5E9] bg-opacity-10 rounded-full mb-3">
                        <MdPerson className="text-4xl text-[#0EA5E9]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827] mb-1">Join Quiz</h1>
                    <p className="text-sm text-[#6B7280] mb-2">Enter your details to start</p>
                    <div className="inline-block bg-[#F9FAFB] px-3 py-1.5 rounded-lg">
                        <span className="text-xs text-[#6B7280]">Quiz Code:</span>
                        <span className="ml-2 font-mono font-bold text-[#0EA5E9] text-base">{code}</span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleJoin} className="space-y-4">
                    {/* Student ID */}
                    <div>
                        <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                            Student ID / Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <MdPerson className="text-[#6B7280] text-lg" />
                            </div>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-10 outline-none transition-all text-[#111827] text-sm"
                                placeholder="Enter your student ID or name"
                                required
                            />
                        </div>
                    </div>

                    {/* Class/Section */}
                    <div>
                        <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                            Class / Section
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <MdClass className="text-[#6B7280] text-lg" />
                            </div>
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-10 outline-none transition-all text-[#111827] text-sm"
                                placeholder="e.g., Grade 10-A"
                                required
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#0EA5E9] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-[#0284C7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Joining...
                            </span>
                        ) : (
                            'Start Quiz'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-4 text-center text-xs text-[#6B7280]">
                    <p>Make sure you have a stable internet connection</p>
                </div>
            </div>
        </div>
    );
};

export default JoinExam;
