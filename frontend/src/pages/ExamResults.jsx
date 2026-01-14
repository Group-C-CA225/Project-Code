import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { MdCheckCircle, MdCancel, MdCheck, MdClose } from 'react-icons/md';

const ExamResults = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const studentId = searchParams.get('student_id');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);

    useEffect(() => {
        if (!studentId) {
            setError('Student ID is required');
            setLoading(false);
            return;
        }

        fetchResults();
    }, [studentId]);

    const fetchResults = async () => {
        try {
            const res = await api.get(`/api/exam/results?student_id=${studentId}`);
            setResults(res);
            setError(null);
        } catch (err) {
            console.error('Error fetching results:', err);
            setError(err.message || 'Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your results...</p>
                </div>
            </div>
        );
    }

    if (error || !results) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
                    <MdCancel className="text-red-500 text-6xl mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Results</h2>
                    <p className="text-gray-600 mb-6">{error || 'Results not available'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284C7] transition"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const correctCount = results.results.filter(r => r.is_correct).length;
    const totalQuestions = results.results.length;
    const scorePercentage = parseFloat(results.final_score) || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#E5E7EB] py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-t-4 border-[#0EA5E9]">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Exam Results</h1>
                        <p className="text-gray-600">{results.quiz_title}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-[#0EA5E9]">{scorePercentage.toFixed(1)}%</div>
                            <div className="text-sm text-gray-600 mt-1">Final Score</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-green-600">{correctCount}</div>
                            <div className="text-sm text-gray-600 mt-1">Correct Answers</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-gray-700">{totalQuestions}</div>
                            <div className="text-sm text-gray-600 mt-1">Total Questions</div>
                        </div>
                    </div>

                    <div className="text-center text-sm text-gray-500">
                        Student: {results.student_identifier} {results.student_class ? `(${results.student_class})` : ''}
                    </div>
                </div>

                {/* Questions Results */}
                <div className="space-y-4">
                    {results.results.map((result, index) => (
                        <div
                            key={result.question_id}
                            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
                                result.is_correct ? 'border-green-500' : 'border-red-500'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-[#0EA5E9] text-white px-3 py-1 rounded-full text-sm font-bold">
                                            Q{index + 1}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {result.type.replace('_', ' ')}
                                        </span>
                                        {result.is_correct ? (
                                            <MdCheckCircle className="text-green-500 text-2xl" />
                                        ) : (
                                            <MdCancel className="text-red-500 text-2xl" />
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                        {result.question_text}
                                    </h3>
                                </div>
                                <div className="text-right ml-4">
                                    <div className={`text-2xl font-bold ${
                                        result.is_correct ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {parseFloat(result.points_earned || 0).toFixed(0)}/{result.points}
                                    </div>
                                    <div className="text-xs text-gray-500">points</div>
                                </div>
                            </div>

                            {/* Student Answer */}
                            <div className="mb-3">
                                <div className="text-sm font-semibold text-gray-700 mb-1">Your Answer:</div>
                                <div className={`p-3 rounded-lg ${
                                    result.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                }`}>
                                    {result.type === 'MCQ' || result.type === 'TRUE_FALSE' ? (
                                        <div className="font-medium">{result.student_answer || 'Not answered'}</div>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{result.student_answer || 'Not answered'}</div>
                                    )}
                                </div>
                            </div>

                            {/* Correct Answer (if wrong) */}
                            {!result.is_correct && (
                                <div className="mb-3">
                                    <div className="text-sm font-semibold text-gray-700 mb-1">Correct Answer:</div>
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                        {result.type === 'MCQ' || result.type === 'TRUE_FALSE' ? (
                                            <div className="font-medium text-blue-800">{result.correct_answer}</div>
                                        ) : (
                                            <div className="whitespace-pre-wrap text-blue-800">{result.correct_answer}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/thank-you')}
                        className="px-8 py-3 bg-[#0EA5E9] text-white font-semibold rounded-lg hover:bg-[#0284C7] transition shadow-lg"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamResults;
