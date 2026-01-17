import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack, MdPeople, MdTrendingUp, MdCheckCircle, MdAccessTime, MdPause, MdPlayArrow, MdBlock, MdCheck } from 'react-icons/md';
import api from '../utils/api';
import TeacherLayout from '../components/TeacherLayout';

const RealtimeMonitor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchMonitoringData = async () => {
        try {
            const res = await api.get(`/api/realtime/monitor?quiz_id=${id}`);
            setData(res);
            setError(null);
        } catch (err) {
            console.error('Error fetching monitoring data:', err);
            setError(err.message || 'Failed to load monitoring data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitoringData();
        
        // Poll every 1 second for fast real-time updates
        const interval = setInterval(() => {
            fetchMonitoringData();
        }, 1000);

        return () => clearInterval(interval);
    }, [id]);

    const formatTimeAgo = (seconds) => {
        if (seconds < 10) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ago`;
    };

    const formatTimeRemaining = (seconds) => {
        if (!seconds || seconds < 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleGlobalControl = async (action) => {
        setActionLoading(true);
        try {
            const response = await api.post('/api/realtime/control', {
                quiz_id: id,
                action: action
            });
            
            if (response.success) {
                // Refresh data after action
                setTimeout(() => fetchMonitoringData(), 500);
            } else {
                setError(response.message || 'Action failed');
            }
        } catch (err) {
            setError(err.message || 'Failed to perform action');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStudentControl = async (sessionId, action) => {
        setActionLoading(true);
        try {
            const response = await api.post('/api/realtime/control', {
                quiz_id: id,
                session_id: sessionId,
                action: action
            });
            
            if (response.success) {
                // Refresh data after action
                setTimeout(() => fetchMonitoringData(), 500);
            } else {
                setError(response.message || 'Action failed');
            }
        } catch (err) {
            setError(err.message || 'Failed to perform action');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <TeacherLayout>
                <div className="p-10 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9] mx-auto mb-4"></div>
                    Loading real-time data...
                </div>
            </TeacherLayout>
        );
    }

    if (error) {
        return (
            <TeacherLayout>
                <div className="p-10 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mt-4 px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284C7]"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </TeacherLayout>
        );
    }

    return (
        <TeacherLayout>
            <div className="p-8 bg-[#F9FAFB] min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-gray-200 rounded-lg transition"
                        >
                            <MdArrowBack className="text-2xl text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-[#111827]">Real-Time Monitor</h1>
                            <p className="text-[#6B7280]">{data?.quiz_title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Global Control Buttons */}
                        <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-lg p-1">
                            <button
                                onClick={() => handleGlobalControl('pause')}
                                disabled={actionLoading || (data?.total_active || 0) === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                            >
                                <MdPause className="text-lg" />
                                Pause All
                            </button>
                            <button
                                onClick={() => handleGlobalControl('resume')}
                                disabled={actionLoading || (data?.total_active || 0) === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                            >
                                <MdPlayArrow className="text-lg" />
                                Resume All
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-green-50 border-2 border-green-500 px-4 py-2 rounded-lg">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-700 font-semibold">LIVE</span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={MdPeople}
                        title="Active Students"
                        value={data?.total_active || 0}
                        color="blue"
                    />
                    <StatCard
                        icon={MdTrendingUp}
                        title="Avg Progress"
                        value={`${data?.avg_progress || 0}%`}
                        color="purple"
                    />
                    <StatCard
                        icon={MdCheckCircle}
                        title="Completion Rate"
                        value={`${data?.completion_rate || 0}%`}
                        color="green"
                    />
                    <StatCard
                        icon={MdAccessTime}
                        title="Quiz Duration"
                        value={`${data?.quiz_duration || 0} min`}
                        color="orange"
                    />
                </div>

                {/* Active Sessions Table */}
                <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] overflow-hidden">
                    <div className="p-6 border-b border-[#E5E7EB]">
                        <h2 className="text-xl font-bold text-[#111827]">Active Students</h2>
                        <p className="text-sm text-[#6B7280] mt-1">
                            Showing all students currently taking the quiz
                        </p>
                    </div>

                    {data?.active_sessions && data.active_sessions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB]">
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Student
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Class
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Current Question
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Progress
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Time Remaining
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Last Activity
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Violations
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.active_sessions.map((session, index) => {
                                        const progress = (session.questions_answered / session.total_questions) * 100;
                                        const isStale = session.seconds_since_heartbeat > 15;
                                        
                                        return (
                                            <tr
                                                key={session.session_id}
                                                className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition ${
                                                    isStale ? 'opacity-60' : ''
                                                }`}
                                            >
                                                <td className="px-6 py-4 font-semibold text-[#111827]">
                                                    {session.student_identifier}
                                                </td>
                                                <td className="px-6 py-4 text-[#6B7280]">
                                                    <span className="bg-[#EFF6FF] text-[#1E40AF] px-3 py-1 rounded text-sm">
                                                        {session.student_class || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[#111827]">
                                                    <span className="font-mono font-bold">
                                                        Q{session.current_question_index + 1}
                                                    </span>
                                                    <span className="text-[#6B7280] text-sm ml-1">
                                                        / {session.total_questions}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                                            <div
                                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                                    progress >= 100
                                                                        ? 'bg-green-500'
                                                                        : progress >= 50
                                                                        ? 'bg-[#0EA5E9]'
                                                                        : 'bg-yellow-500'
                                                                }`}
                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-semibold text-[#111827] min-w-[45px]">
                                                            {Math.round(progress)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-mono font-bold ${
                                                        session.time_remaining_seconds < 300
                                                            ? 'text-red-600'
                                                            : session.time_remaining_seconds < 600
                                                            ? 'text-orange-600'
                                                            : 'text-[#111827]'
                                                    }`}>
                                                        {formatTimeRemaining(session.time_remaining_seconds)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            isStale ? 'bg-gray-400' : 'bg-green-500'
                                                        }`}></div>
                                                        <span className={`text-sm ${
                                                            isStale ? 'text-gray-500' : 'text-[#6B7280]'
                                                        }`}>
                                                            {formatTimeAgo(session.seconds_since_heartbeat)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {session.violations_count > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-semibold">
                                                                ⚠️ {session.violations_count} Tab Switch{session.violations_count > 1 ? 'es' : ''}
                                                            </span>
                                                            {session.seconds_since_violation !== null && session.seconds_since_violation < 30 && (
                                                                <span className="text-xs text-red-600 font-medium animate-pulse">
                                                                    Just now
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-green-600 font-medium">✓ No violations</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {session.status === 'PAUSED' ? (
                                                            <button
                                                                onClick={() => handleStudentControl(session.session_id, 'resume_student')}
                                                                disabled={actionLoading}
                                                                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
                                                            >
                                                                <MdPlayArrow className="text-sm" />
                                                                Resume
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleStudentControl(session.session_id, 'pause_student')}
                                                                disabled={actionLoading}
                                                                className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
                                                            >
                                                                <MdPause className="text-sm" />
                                                                Pause
                                                            </button>
                                                        )}
                                                        {isStale && (
                                                            <button
                                                                onClick={() => handleStudentControl(session.session_id, 'pause_student')}
                                                                disabled={actionLoading}
                                                                className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
                                                                title="Suspicious activity detected"
                                                            >
                                                                <MdBlock className="text-sm" />
                                                                Block
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            <MdPeople className="text-6xl mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-semibold">No active students</p>
                            <p className="text-sm mt-2">Waiting for students to start the quiz...</p>
                        </div>
                    )}
                </div>
            </div>
        </TeacherLayout>
    );
};

const StatCard = ({ icon: Icon, title, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600'
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB] hover:shadow-md transition">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[#6B7280] text-xs uppercase font-semibold mb-2">{title}</p>
                    <p className="text-3xl font-bold text-[#111827]">{value}</p>
                </div>
                <div className={`p-4 rounded-full ${colorClasses[color]}`}>
                    <Icon className="text-3xl" />
                </div>
            </div>
        </div>
    );
};

export default RealtimeMonitor;
