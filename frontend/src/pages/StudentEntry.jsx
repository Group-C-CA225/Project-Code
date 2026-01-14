import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentEntry = () => {
    const [code, setCode] = useState('');
    const [studentId, setStudentId] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if(code && studentId && studentClass) {
            navigate(`/exam/${code}`, { 
                state: { 
                    studentId: studentId,
                    studentClass: studentClass
                } 
            });
        }
    };

    return (
        <div className="h-screen bg-brand-dark flex items-center justify-center text-brand-light">
            <div className="w-full max-w-md p-8 bg-brand-gray rounded-xl shadow-2xl border-t-4 border-brand-teal">
                <h1 className="text-3xl font-bold text-center mb-2">Join Exam</h1>
                <p className="text-center text-gray-400 mb-8">Enter your access details</p>
                
                <form onSubmit={handleJoin} className="space-y-6">
                    <div>
                        <label className="block text-sm text-brand-teal mb-1">Access Code</label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-3 bg-brand-dark border border-gray-600 rounded text-white focus:border-brand-teal outline-none uppercase tracking-widest text-center font-mono"
                            placeholder="ABC123"
                            value={code} 
                            onChange={e => setCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-brand-teal mb-1">Student ID</label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-3 bg-brand-dark border border-gray-600 rounded text-white focus:border-brand-teal outline-none"
                            placeholder="S12345"
                            value={studentId} 
                            onChange={e => setStudentId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-brand-teal mb-1">Class/Section</label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-3 bg-brand-dark border border-gray-600 rounded text-white focus:border-brand-teal outline-none"
                            placeholder="10-A"
                            value={studentClass} 
                            onChange={e => setStudentClass(e.target.value)}
                        />
                    </div>
                    <button className="w-full py-4 bg-brand-teal text-white font-bold rounded hover:brightness-110 transition">
                        START EXAM
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentEntry;