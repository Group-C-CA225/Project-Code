import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import TeacherLayout from '../components/TeacherLayout';
import Swal from 'sweetalert2';
import { MdPeople, MdTrendingUp, MdQuiz, MdContentCopy, MdPlayArrow, MdStop, MdSchedule, MdAdd, MdEdit, MdDelete, MdMonitor } from 'react-icons/md';
import AnimatedCounter from '../components/AnimatedCounter';

// Unified Color System
const colors = {
    primary: '#0EA5E9',      // Brand teal
    primaryHover: '#0284C7', // Darker teal for hover
    success: '#10B981',      // Green for success
    error: '#EF4444',        // Red for errors
    textPrimary: '#111827',  // Dark gray for main text
    textSecondary: '#6B7280',// Medium gray for secondary text
    bgLight: '#F9FAFB',      // Light background
    bgCard: '#FFFFFF',       // Card background
    border: '#E5E7EB',       // Border color
    sidebarDark: '#1F2937'   // Sidebar dark
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = () => {
        api.get('/api/analytics/dashboard').then(res => setStats(res));
    };

    // Export all quizzes to CSV
    const exportAllQuizzesToCSV = (quizzes) => {
        if (!quizzes || quizzes.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Data',
                text: 'No quizzes to export',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }

        const headers = ['Quiz Title', 'Status', 'Class', 'Access Code', 'Attempts', 'Created Date'];
        const rows = quizzes.map(q => [
            q.title,
            q.status,
            q.class || 'N/A',
            q.access_code,
            q.attempt_count || 0,
            new Date(q.created_at).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `quizzes_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        Swal.fire({
            icon: 'success',
            title: 'Exported!',
            text: 'Quizzes exported successfully',
            timer: 1500,
            showConfirmButton: false
        });
    };

    if (!stats) return <TeacherLayout><div className="p-10 text-center">Loading Analytics...</div></TeacherLayout>;

    return (
        <TeacherLayout>
            <div className="p-8 bg-[#F9FAFB] min-h-screen">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#111827]">Overview</h1>
                        <p className="text-[#6B7280]">Welcome back, Teacher.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/create-quiz')}
                        className="bg-[#0EA5E9] text-white px-6 py-3 rounded-lg shadow-sm hover:bg-[#0284C7] font-semibold transition-all duration-200 flex items-center gap-2"
                    >
                        <MdAdd className="text-xl" />
                        Create New Quiz
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Total Students" value={stats.total_students || 0} icon={MdPeople} />
                    <StatCard title="Avg Class Score" value={`${stats.avg_score || 0}%`} icon={MdTrendingUp} />
                    <StatCard title="Total Quizzes" value={stats.recent_quizzes?.length || 0} icon={MdQuiz} />
                </div>

                {/* Recent Quizzes Table */}
                <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] overflow-hidden">
                    <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
                        <h2 className="text-xl font-bold text-[#111827]">Recent Quizzes</h2>
                        <button
                            onClick={() => exportAllQuizzesToCSV(stats.recent_quizzes)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export All to CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-[#E5E7EB]">
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Quiz Title</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Class</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Schedule</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Attempts</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_quizzes && stats.recent_quizzes.length > 0 ? (
                                    stats.recent_quizzes.map(quiz => (
                                        <QuizRow key={quiz.id} quiz={quiz} navigate={navigate} onUpdate={fetchDashboard} />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-[#6B7280]">
                                            No quizzes found. Create your first quiz to get started!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </TeacherLayout>
    );
};

const StatCard = ({ title, value, icon: Icon }) => {
    // Extract number and suffix from value
    const valueStr = String(value);
    // Use parseFloat to properly handle decimals, then remove non-numeric suffix
    const numericValue = parseFloat(valueStr.replace(/[^0-9.]/g, '')) || 0;
    // Extract suffix (everything that's not a number or decimal point)
    const suffix = valueStr.replace(/[0-9.]/g, '');

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-[#E5E7EB]">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-[#6B7280] text-xs uppercase font-semibold tracking-wider mb-2">{title}</p>
                    <p className="text-3xl font-bold text-[#111827]">
                        <AnimatedCounter end={numericValue} duration={1500} suffix={suffix} />
                    </p>
                </div>
                <div className="bg-[#0EA5E9] bg-opacity-10 p-4 rounded-full">
                    <Icon className="text-3xl text-[#0EA5E9]" />
                </div>
            </div>
        </div>
    );
};

const QuizRow = ({ quiz, navigate, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuButtonRef = useState(null);
    const isActive = quiz.status === 'ACTIVE';
    const studentUrl = `${window.location.origin}/join/${quiz.access_code}`;

    const toggleMenu = (e) => {
        if (!showMenu) {
            const rect = e.currentTarget.getBoundingClientRect();
            const dropdownHeight = 280; // Approximate height of dropdown menu
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Check if there's enough space below, otherwise open upward
            const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            
            setMenuPosition({
                top: openUpward 
                    ? rect.top + window.scrollY - dropdownHeight - 8 
                    : rect.bottom + window.scrollY + 8,
                left: rect.right + window.scrollX - 224 // 224px = w-56
            });
        }
        setShowMenu(!showMenu);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(studentUrl);
        Swal.fire({
            icon: 'success',
            title: 'Link Copied!',
            text: 'Student link copied to clipboard',
            timer: 1500,
            showConfirmButton: false
        });
    };

    const duplicateQuiz = async (quizId) => {
        const result = await Swal.fire({
            title: 'Duplicate Quiz?',
            text: 'This will create a copy of this quiz with all questions',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0EA5E9',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Duplicate',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await api.post(`/api/quiz/${quizId}/duplicate`);
                Swal.fire({
                    icon: 'success',
                    title: 'Duplicated!',
                    text: 'Quiz has been duplicated successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
                onUpdate();
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Duplicate',
                    text: err.message || 'Could not duplicate quiz',
                    confirmButtonColor: '#0EA5E9'
                });
            }
        }
    };

    const deleteQuiz = async () => {
        const result = await Swal.fire({
            title: 'Delete Quiz?',
            text: 'This will permanently delete the quiz and all submissions. This cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/api/quiz/${quiz.id}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Quiz has been deleted',
                    timer: 1500,
                    showConfirmButton: false
                });
                onUpdate();
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Delete',
                    text: err.message || 'Could not delete quiz',
                    confirmButtonColor: '#0EA5E9'
                });
            }
        }
    };

    const toggleQuizStatus = async () => {
        setLoading(true);
        try {
            const newStatus = isActive ? 'INACTIVE' : 'ACTIVE';
            await api.post('/api/quiz/toggle-status', { quiz_id: quiz.id, status: newStatus });
            
            Swal.fire({
                icon: 'success',
                title: isActive ? 'Quiz Stopped' : 'Quiz Started',
                text: isActive ? 'Students can no longer access this quiz' : 'Students can now take this quiz',
                timer: 1500,
                showConfirmButton: false
            });
            onUpdate();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Failed',
                text: err.message || 'Could not update quiz status',
                confirmButtonColor: '#00ADB5'
            });
        } finally {
            setLoading(false);
        }
    };

    const scheduleQuiz = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Schedule Quiz',
            html: `
                <style>
                    .schedule-container {
                        padding: 0 20px;
                        max-width: 100%;
                    }
                    .schedule-field {
                        margin-bottom: 20px;
                        text-align: left;
                    }
                    .schedule-label {
                        display: block;
                        font-size: 14px;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 8px;
                    }
                    .schedule-input {
                        width: 100%;
                        padding: 10px 12px;
                        font-size: 14px;
                        border: 2px solid #E5E7EB;
                        border-radius: 8px;
                        outline: none;
                        transition: border-color 0.2s;
                        box-sizing: border-box;
                    }
                    .schedule-input:focus {
                        border-color: #0EA5E9;
                    }
                    .schedule-note {
                        margin-top: 16px;
                        padding: 12px;
                        background: #EFF6FF;
                        border-left: 4px solid #0EA5E9;
                        border-radius: 6px;
                        font-size: 12px;
                        color: #1E40AF;
                        text-align: left;
                    }
                </style>
                <div class="schedule-container">
                    <div class="schedule-field">
                        <label class="schedule-label">Start Time</label>
                        <input type="datetime-local" id="start_time" class="schedule-input">
                    </div>
                    <div class="schedule-field">
                        <label class="schedule-label">End Time</label>
                        <input type="datetime-local" id="end_time" class="schedule-input">
                    </div>
                    <div class="schedule-note">
                        <strong>📅 Note:</strong> Students can only access the quiz during this time period.
                    </div>
                </div>
            `,
            width: '450px',
            padding: '20px',
            focusConfirm: false,
            confirmButtonColor: '#0EA5E9',
            confirmButtonText: 'Schedule',
            cancelButtonText: 'Cancel',
            showCancelButton: true,
            buttonsStyling: true,
            customClass: {
                popup: 'swal-schedule-popup',
                confirmButton: 'swal-schedule-confirm',
                cancelButton: 'swal-schedule-cancel'
            },
            preConfirm: () => {
                const startTime = document.getElementById('start_time').value;
                const endTime = document.getElementById('end_time').value;
                
                if (!startTime || !endTime) {
                    Swal.showValidationMessage('⚠️ Please select both start and end times');
                    return false;
                }
                
                if (new Date(startTime) >= new Date(endTime)) {
                    Swal.showValidationMessage('⚠️ End time must be after start time');
                    return false;
                }
                
                return {
                    start_time: startTime,
                    end_time: endTime
                };
            }
        });

        if (formValues && formValues.start_time && formValues.end_time) {
            try {
                await api.post('/api/quiz/schedule', { 
                    quiz_id: quiz.id, 
                    ...formValues 
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Quiz Scheduled!',
                    confirmButtonColor: '#00ADB5'
                });
                onUpdate();
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Schedule',
                    text: err.message || 'Something went wrong',
                    confirmButtonColor: '#00ADB5'
                });
            }
        }
    };

    return (
        <tr className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
            <td className="px-6 py-4 font-semibold text-[#111827]">{quiz.title}</td>
            <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-[#10B981] bg-opacity-10 text-[#10B981]' : 'bg-gray-100 text-[#6B7280]'
                }`}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
            </td>
            <td className="px-6 py-4">
                <span className="bg-[#EFF6FF] text-[#1E40AF] px-3 py-1 rounded text-sm font-medium">
                    {quiz.class || 'N/A'}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-[#6B7280]">
                {quiz.start_time ? (
                    <div>
                        <div>Start: {new Date(quiz.start_time).toLocaleString()}</div>
                        <div>End: {new Date(quiz.end_time).toLocaleString()}</div>
                    </div>
                ) : (
                    <span className="text-gray-400">Not scheduled</span>
                )}
            </td>
            <td className="px-6 py-4 text-[#111827] font-medium">{quiz.attempt_count}</td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    {/* Primary Action: View Analytics */}
                    <button 
                        onClick={() => navigate(`/analytics/${quiz.id}`)}
                        className="px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284C7] transition-all font-medium text-sm flex items-center gap-1"
                    >
                        View
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Quick Actions: Start/Stop & Monitor */}
                    <button
                        onClick={toggleQuizStatus}
                        disabled={loading}
                        className={`px-3 py-2 rounded-lg transition-all font-medium text-sm flex items-center gap-1 ${
                            isActive 
                                ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]' 
                                : 'bg-[#10B981] text-white hover:bg-[#059669]'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isActive ? (
                            <>
                                <MdStop className="text-base" />
                                Stop
                            </>
                        ) : (
                            <>
                                <MdPlayArrow className="text-base" />
                                Start
                            </>
                        )}
                    </button>

                    {isActive && (
                        <button
                            onClick={() => navigate(`/monitor/${quiz.id}`)}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm flex items-center gap-1"
                        >
                            <MdMonitor className="text-base" />
                            Monitor
                        </button>
                    )}

                    {/* More Actions Dropdown */}
                    <div>
                        <button
                            onClick={toggleMenu}
                            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                            title="More actions"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                        </button>
                    </div>
                    
                    {/* Dropdown Menu - Fixed Position Portal */}
                    {showMenu && (
                        <>
                            <div 
                                className="fixed inset-0 z-[9998]" 
                                onClick={() => setShowMenu(false)}
                            />
                            <div 
                                className="fixed w-56 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 z-[9999]"
                                style={{
                                    top: `${menuPosition.top}px`,
                                    left: `${menuPosition.left}px`
                                }}
                            >
                                <button
                                    onClick={() => { copyLink(); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                >
                                    <MdContentCopy className="text-[#0EA5E9] text-base" />
                                    <span>Copy Student Link</span>
                                </button>
                                <button
                                    onClick={() => { scheduleQuiz(); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                >
                                    <MdSchedule className="text-[#0EA5E9] text-base" />
                                    <span>Schedule Quiz</span>
                                </button>
                                <button
                                    onClick={() => { navigate(`/edit-quiz/${quiz.id}`); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                >
                                    <MdEdit className="text-purple-600 text-base" />
                                    <span>Edit Quiz</span>
                                </button>
                                <button
                                    onClick={() => { duplicateQuiz(quiz.id); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Duplicate Quiz</span>
                                </button>
                                <div className="border-t border-gray-200 my-1" />
                                <button
                                    onClick={() => { deleteQuiz(); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                >
                                    <MdDelete className="text-base" />
                                    <span>Delete Quiz</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default Dashboard;