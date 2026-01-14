import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import TeacherLayout from '../components/TeacherLayout';

const QuizAnalytics = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/api/analytics/quiz?id=${id}`).then(res => setData(res));
    }, [id]);

    const exportToCSV = () => {
        if (!data || !data.students || data.students.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = ['Student ID', 'Score (%)', 'Status', 'Finished At'];
        const rows = data.students.map(s => [
            s.student_identifier,
            s.final_score || 0,
            s.status,
            s.finished_at ? new Date(s.finished_at).toLocaleString() : 'N/A'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${data.quiz_title.replace(/[^a-z0-9]/gi, '_')}_results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (!data) {
        return (
            <TeacherLayout>
                <div className="p-10 text-center">Loading...</div>
            </TeacherLayout>
        );
    }

    const chartData = Object.keys(data.distribution).map(key => ({
        grade: key,
        count: data.distribution[key]
    }));

    return (
        <TeacherLayout>
            <div className="bg-brand-light text-brand-dark p-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-500 hover:text-brand-teal mb-4"
                >
                    ← Back to Dashboard
                </button>

                <div className="flex justify-between items-end mb-8">
                    <h1 className="text-3xl font-bold text-brand-dark">
                        {data.quiz_title}
                        <span className="text-brand-teal font-light"> Analytics</span>
                    </h1>
                    <button
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export to CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-lg col-span-2">
                        <h3 className="text-lg font-bold mb-4 text-gray-600">Score Distribution</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="grade" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#f0f0f0' }} />
                                    <Bar dataKey="count" fill="#00ADB5" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={entry.grade === 'F' ? '#ef4444' : '#00ADB5'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-brand-dark text-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-brand-teal font-bold mb-4">AI Insights</h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex justify-between border-b border-gray-700 pb-2">
                                <span>Top Performer:</span>
                                <span className="font-bold text-brand-teal">
                                    {data.students[0]
                                        ? `${data.students[0].student_identifier} (${data.students[0].final_score}%)`
                                        : 'N/A'}
                                </span>
                            </li>

                            <li className="flex justify-between border-b border-gray-700 pb-2">
                                <span>Pass Rate:</span>
                                <span className="font-bold text-green-400">
                                    {data.students.length > 0
                                        ? Math.round(
                                              (data.students.filter(s => s.final_score >= 60).length /
                                                  data.students.length) *
                                                  100
                                          )
                                        : 0}
                                    %
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Student list */}
                <div className="bg-white rounded-lg shadow-lg mt-8 overflow-hidden">
                    <div className="p-6 border-b bg-gray-50">
                        <h3 className="font-bold text-lg">Student Submissions</h3>
                    </div>

                    <table className="w-full text-left">
                        <thead className="text-sm text-gray-500 border-b">
                            <tr>
                                <th className="p-4">Student ID</th>
                                <th className="p-4">Score</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Submitted At</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.students.map(student => (
                                <tr key={student.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-bold">{student.student_identifier}</td>

                                    <td className="p-4">
                                        <span
                                            className={`px-2 py-1 rounded font-bold text-sm ${
                                                student.final_score >= 60
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {student.final_score}%
                                        </span>
                                    </td>

                                    <td className="p-4 text-sm text-gray-500">{student.status}</td>

                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(student.finished_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </TeacherLayout>
    );
};

export default QuizAnalytics;
