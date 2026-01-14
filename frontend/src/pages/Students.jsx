import { useEffect, useState } from 'react';
import TeacherLayout from '../components/TeacherLayout';
import Swal from 'sweetalert2';
import api from '../utils/api';
import { MdSearch, MdPeople, MdTrendingUp } from 'react-icons/md';
import AnimatedCounter from '../components/AnimatedCounter';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch students
            const studentsRes = await api.get('/api/students/list');
            setStudents(studentsRes.students || []);

            // Fetch quizzes to get classes
            const dashboardRes = await api.get('/api/analytics/dashboard');
            const quizzes = dashboardRes.recent_quizzes || [];
            
            // Extract unique classes from quizzes
            const uniqueClasses = [...new Set(
                quizzes
                    .map(q => q.class)
                    .filter(c => c && c.trim() !== '')
            )].sort();
            
            setClasses(uniqueClasses);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Failed to Load Data',
                text: err.message || 'Could not fetch data',
                confirmButtonColor: '#0EA5E9'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.student_identifier?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = !classFilter || s.student_class === classFilter;
        return matchesSearch && matchesClass;
    });

    return (
        <TeacherLayout>
            <div className="p-8 bg-[#F9FAFB] min-h-screen">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#111827]">Students</h1>
                        <p className="text-[#6B7280]">Manage and monitor student performance</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] text-xl" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none w-full"
                            />
                        </div>
                        <select
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none bg-white"
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <StatCard 
                        title="Total Students" 
                        value={students.length} 
                        icon={MdPeople}
                    />
                    <StatCard 
                        title="Avg Performance" 
                        value={`${students.length > 0 ? Math.round(students.reduce((acc, s) => acc + (s.avg_score || 0), 0) / students.length) : 0}%`}
                        icon={MdTrendingUp}
                    />
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">Loading students...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-[#E5E7EB]">
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Student ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Quizzes Taken</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#111827] bg-[#F9FAFB]">Avg Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition">
                                            <td className="px-6 py-4 font-semibold text-[#111827]">{student.student_identifier}</td>
                                            <td className="px-6 py-4 text-[#6B7280]">{student.quizzes_taken || 0}</td>
                                            <td className="px-6 py-4">
                                                {student.avg_score ? (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                        student.avg_score >= 80 ? 'bg-[#10B981] bg-opacity-10 text-[#10B981]' :
                                                        student.avg_score >= 60 ? 'bg-[#F59E0B] bg-opacity-10 text-[#F59E0B]' :
                                                        'bg-[#EF4444] bg-opacity-10 text-[#EF4444]'
                                                    }`}>
                                                        {student.avg_score}%
                                                    </span>
                                                ) : (
                                                    <span className="text-[#6B7280]">N/A</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                                                No students found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
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

export default Students;
