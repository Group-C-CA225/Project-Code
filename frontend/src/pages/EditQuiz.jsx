import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import Swal from 'sweetalert2';
import TeacherLayout from '../components/TeacherLayout';

const EditQuiz = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(60);
    const [classFilter, setClassFilter] = useState('');
    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [questions, setQuestions] = useState([]);

    // Load quiz data
    useEffect(() => {
        const loadQuiz = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/api/quiz/${id}`);
                const quiz = res.quiz;
                
                setTitle(quiz.title);
                
                // Extract shuffle setting from description
                let desc = quiz.description || '';
                
                const shuffleMatch = desc.match(/\[SHUFFLE:(true|false)\]/);
                if (shuffleMatch) {
                    setShuffleQuestions(shuffleMatch[1] === 'true');
                    desc = desc.replace(/\[SHUFFLE:(true|false)\]/, '');
                }
                
                setDescription(desc.trim());
                setDuration(quiz.duration_minutes || 60);
                setClassFilter(quiz.class || '');
                setShowResults(quiz.show_results_to_students || false);
                
                // Map questions with IDs
                const questionsWithIds = (quiz.questions || []).map(q => ({
                    id: q.id,
                    type: q.type,
                    question_text: q.question_text,
                    options: q.options || (q.type === 'MCQ' ? ['', '', '', ''] : []),
                    correct_answer: q.correct_answer || '',
                    points: q.points || 1
                }));
                
                setQuestions(questionsWithIds);
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Quiz',
                    text: err.message || 'Could not load quiz data',
                    confirmButtonColor: '#0EA5E9'
                }).then(() => navigate('/dashboard'));
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            loadQuiz();
        }
    }, [id, navigate]);

    // Add a new blank question (will be created on save)
    const addQuestion = () => {
        setQuestions([...questions, { 
            id: null, // New question, no ID yet
            type: 'MCQ', 
            question_text: '', 
            options: ['', '', '', ''], 
            correct_answer: '',
            points: 1
        }]);
    };

    // Remove a question (delete from server if it has an ID)
    const removeQuestion = async (index) => {
        const question = questions[index];
        
        if (question.id) {
            // Existing question - delete from server
            const confirmed = await Swal.fire({
                title: 'Delete Question?',
                text: 'This action cannot be undone',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it'
            });

            if (!confirmed.isConfirmed) return;

            try {
                await api.delete(`/api/quiz/${id}/questions/${question.id}`);
                const newQ = [...questions];
                newQ.splice(index, 1);
                setQuestions(newQ);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: 'Question deleted successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Delete',
                    text: err.message || 'Could not delete question',
                    confirmButtonColor: '#0EA5E9'
                });
            }
        } else {
            // New question - just remove from state
            const newQ = [...questions];
            newQ.splice(index, 1);
            setQuestions(newQ);
        }
    };

    // Drag and drop state
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const scrollIntervalRef = useRef(null);

    // Auto-scroll when dragging near edges
    const handleAutoScroll = (e) => {
        const scrollThreshold = 100;
        const scrollSpeed = 10;
        const viewportHeight = window.innerHeight;
        const mouseY = e.clientY;

        // Clear any existing scroll interval
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }

        // Scroll up if near top
        if (mouseY < scrollThreshold) {
            scrollIntervalRef.current = setInterval(() => {
                window.scrollBy(0, -scrollSpeed);
            }, 16);
        }
        // Scroll down if near bottom
        else if (mouseY > viewportHeight - scrollThreshold) {
            scrollIntervalRef.current = setInterval(() => {
                window.scrollBy(0, scrollSpeed);
            }, 16);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index);
        // Add a slight delay to allow the drag image to be created
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedIndex(null);
        setDragOverIndex(null);
        // Clear scroll interval
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        handleAutoScroll(e);
    };

    const handleDragEnter = (e, index) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = (e) => {
        // Only clear if we're leaving the container, not a child element
        if (e.currentTarget === e.target) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        setDragOverIndex(null);
        
        const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
        if (dragIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newQuestions = [...questions];
        const draggedQuestion = newQuestions[dragIndex];
        
        // Remove from old position
        newQuestions.splice(dragIndex, 1);
        // Insert at new position
        newQuestions.splice(dropIndex, 0, draggedQuestion);
        
        setQuestions(newQuestions);
        setDraggedIndex(null);
    };

    // Update specific field in a question
    const updateQuestion = (index, field, value) => {
        const newQ = [...questions];
        newQ[index][field] = value;
        setQuestions(newQ);
    };

    // Update specific option in MCQ
    const updateOption = (qIndex, oIndex, value) => {
        const newQ = [...questions];
        if (!newQ[qIndex].options) {
            newQ[qIndex].options = [];
        }
        newQ[qIndex].options[oIndex] = value;
        setQuestions(newQ);
    };

    // Add option to MCQ
    const addOption = (qIndex) => {
        const newQ = [...questions];
        if (!newQ[qIndex].options) {
            newQ[qIndex].options = [];
        }
        newQ[qIndex].options.push('');
        setQuestions(newQ);
    };

    // Remove option from MCQ
    const removeOption = (qIndex, oIndex) => {
        const newQ = [...questions];
        if (newQ[qIndex].options && newQ[qIndex].options.length > 2) {
            newQ[qIndex].options.splice(oIndex, 1);
            setQuestions(newQ);
        }
    };

    // Save all changes
    const handleSave = async () => {
        if (!title) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Title',
                text: 'Please enter a quiz title',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }

        // Validate all questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            
            // Check question text
            if (!q.question_text || !q.question_text.trim()) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Incomplete Question',
                    html: `<p>Question ${i + 1} is missing the question text.</p>`,
                    confirmButtonColor: '#0EA5E9'
                });
                document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-sm.mb-4')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            
            // Validate MCQ
            if (q.type === 'MCQ') {
                const emptyOptions = (q.options || []).filter(opt => !opt || !opt.trim());
                if (emptyOptions.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Incomplete Question',
                        html: `<p>Question ${i + 1}: All options must be filled in.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-sm.mb-4')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                
                if (!q.correct_answer || !q.correct_answer.trim()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Correct Answer',
                        html: `<p>Question ${i + 1}: Please enter the correct answer.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-sm.mb-4')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                
                const correctAnswerLower = q.correct_answer.trim().toLowerCase();
                const optionsLower = (q.options || []).map(opt => opt.trim().toLowerCase());
                if (!optionsLower.includes(correctAnswerLower)) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Correct Answer',
                        html: `<p>Question ${i + 1}: The correct answer must exactly match one of the options.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-sm.mb-4')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
            
            // Validate TRUE_FALSE
            if (q.type === 'TRUE_FALSE') {
                if (!q.correct_answer || (q.correct_answer !== 'True' && q.correct_answer !== 'False')) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Answer',
                        html: `<p>Question ${i + 1}: Please select True or False.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-sm.mb-4')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
            
            // Validate WRITTEN
            if (q.type === 'WRITTEN') {
                if (!q.correct_answer || !q.correct_answer.trim()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Model Answer',
                        html: `<p>Question ${i + 1}: Please provide a model answer for AI grading.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-sm.mb-4')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }

        try {
            // Update quiz metadata (title, description with shuffle setting, duration, class)
            let descriptionWithSettings = description;
            if (shuffleQuestions) {
                descriptionWithSettings += '[SHUFFLE:true]';
            }
            
            await api.put(`/api/quiz/${id}`, {
                title,
                description: descriptionWithSettings,
                duration_minutes: duration,
                class: classFilter || null,
                show_results_to_students: showResults
            });

            // Save/update each question
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                
                // Validate question
                if (!q.question_text || !q.question_text.trim()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Question',
                        text: `Question ${i + 1} is missing text`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    return;
                }

                const questionData = {
                    type: q.type || 'MCQ',
                    question_text: q.question_text,
                    options: q.type === 'MCQ' || q.type === 'TRUE_FALSE' ? (q.options || []) : null,
                    correct_answer: q.correct_answer || '',
                    points: q.points || 1
                };

                if (q.id) {
                    // Update existing question
                    await api.put(`/api/quiz/${id}/questions/${q.id}`, questionData);
                } else {
                    // Create new question
                    await api.post(`/api/quiz/${id}/questions`, questionData);
                }
            }

            await Swal.fire({
                icon: 'success',
                title: 'Quiz Updated!',
                text: 'All changes have been saved',
                timer: 1500,
                showConfirmButton: false
            });
            
            // Reload to get updated question IDs
            navigate(`/edit-quiz/${id}`);
            window.location.reload(); // Quick reload to refresh data
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Failed to Save',
                text: err.message || 'Could not save changes',
                confirmButtonColor: '#0EA5E9'
            });
        }
    };

    if (loading) {
        return (
            <TeacherLayout>
                <div className="p-8 bg-[#F9FAFB] min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading quiz data...</p>
                    </div>
                </div>
            </TeacherLayout>
        );
    }

    return (
        <TeacherLayout>
            <div className="p-8 bg-[#F9FAFB] min-h-screen">
                <div className="max-w-4xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[#222831]">Edit Quiz</h1>
                            <p className="text-gray-500 mt-1">Update questions and settings</p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>

                    {/* Quiz Settings Card */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB] mb-6">
                        <h2 className="text-xl font-bold text-[#222831] mb-4">Quiz Settings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                                className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full"
                                placeholder="Quiz Title (e.g. Physics Midterm)"
                                value={title} 
                                onChange={e => setTitle(e.target.value)}
                            />
                            <input 
                                className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full"
                                placeholder="Class (e.g. Grade 10A, CS101)"
                                value={classFilter} 
                                onChange={e => setClassFilter(e.target.value)}
                            />
                            <input 
                                type="number"
                                className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full"
                                placeholder="Duration (Minutes)"
                                value={duration} 
                                onChange={e => setDuration(e.target.value)}
                            />
                            <textarea 
                                className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full md:col-span-2 resize-none"
                                placeholder="Instructions for students..."
                                rows="3"
                                value={description} 
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="shuffleQuestions"
                                    checked={shuffleQuestions}
                                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                                    className="w-5 h-5 text-[#0EA5E9] border-gray-300 rounded focus:ring-[#0EA5E9]"
                                />
                                <label htmlFor="shuffleQuestions" className="ml-3 text-sm text-gray-700">
                                    <span className="font-medium">Shuffle question order</span> - Each student sees questions in random order
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="showResults"
                                    checked={showResults}
                                    onChange={(e) => setShowResults(e.target.checked)}
                                    className="w-5 h-5 text-[#0EA5E9] border-gray-300 rounded focus:ring-[#0EA5E9]"
                                />
                                <label htmlFor="showResults" className="ml-3 text-sm text-gray-700">
                                    <span className="font-medium">Allow students to see their results</span> - Students can view detailed results after submission
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    {questions.length === 0 && (
                        <div className="bg-white p-8 rounded-lg shadow-sm border border-[#E5E7EB] text-center text-gray-500 mb-4">
                            No questions yet. Click "Add Question" to get started.
                        </div>
                    )}

                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="relative">
                            {/* Drop indicator line - shows above the card when dragging over */}
                            {dragOverIndex === qIndex && draggedIndex !== qIndex && draggedIndex < qIndex && (
                                <div className="absolute -top-2 left-0 right-0 h-1 bg-[#0EA5E9] rounded-full shadow-lg z-10 animate-pulse">
                                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#0EA5E9] rounded-full"></div>
                                </div>
                            )}
                            
                            <div 
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, qIndex)}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, qIndex)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, qIndex)}
                                className={`bg-white p-6 rounded-lg shadow-sm mb-4 relative border-2 transition-all duration-200 ${
                                    draggedIndex === qIndex 
                                        ? 'border-[#0EA5E9] shadow-xl scale-105 rotate-2' 
                                        : dragOverIndex === qIndex && draggedIndex !== null
                                        ? 'border-[#0EA5E9] bg-blue-50 scale-102 shadow-lg'
                                        : 'border-[#E5E7EB] hover:border-gray-300'
                                }`}
                                style={{ cursor: draggedIndex === qIndex ? 'grabbing' : 'grab' }}
                            >
                                {/* Drag Handle */}
                                <div className="absolute top-4 left-4 text-gray-400 hover:text-[#0EA5E9] transition-colors" title="Drag to reorder">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                                    </svg>
                                </div>

                            {/* Remove Button */}
                            <button 
                                onClick={() => removeQuestion(qIndex)}
                                className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold"
                            >
                                ✕ Remove
                            </button>

                            <div className="flex items-center gap-4 mb-4 ml-8">
                                <span className="bg-[#0EA5E9] text-white font-semibold px-3 py-1 rounded">Q{qIndex + 1}</span>
                                <select 
                                    className="p-2 bg-white rounded-lg border border-[#E5E7EB] focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                    value={q.type}
                                    onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                                >
                                    <option value="MCQ">Multiple Choice</option>
                                    <option value="TRUE_FALSE">True / False</option>
                                    <option value="WRITTEN">Written (AI Graded)</option>
                                </select>
                                {q.id && <span className="text-xs text-gray-400">(Saved)</span>}
                            </div>

                            {/* Question Text */}
                            <input 
                                className="w-full p-3 bg-white rounded-lg border border-[#E5E7EB] mb-4 focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                placeholder="Enter the question here..."
                                value={q.question_text}
                                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                            />

                            {/* Dynamic Inputs based on Type */}
                            {q.type === 'MCQ' && (
                                <div className="pl-4 border-l-4 border-[#0EA5E9]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        {(q.options || []).map((opt, oIndex) => (
                                            <div key={oIndex} className="flex gap-2">
                                                <input 
                                                    className="flex-1 p-2 border border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                                    placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                                    value={opt}
                                                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                />
                                                {(q.options || []).length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption(qIndex, oIndex)}
                                                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                                        title="Remove option"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => addOption(qIndex)}
                                        className="mb-3 px-4 py-2 bg-[#0EA5E9] bg-opacity-10 text-[#0EA5E9] rounded-lg hover:bg-opacity-20 transition text-sm font-semibold"
                                    >
                                        + Add Option
                                    </button>
                                    <input 
                                        className="w-full p-3 border border-[#10B981] bg-[#10B981] bg-opacity-5 rounded-lg focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981] focus:ring-opacity-20 outline-none"
                                        placeholder="Paste the Correct Option exactly here"
                                        value={q.correct_answer}
                                        onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                                    />
                                </div>
                            )}

                            {q.type === 'TRUE_FALSE' && (
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name={`tf-${qIndex}`} 
                                            checked={q.correct_answer === 'True'}
                                            onChange={() => updateQuestion(qIndex, 'correct_answer', 'True')}
                                        /> True
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name={`tf-${qIndex}`} 
                                            checked={q.correct_answer === 'False'}
                                            onChange={() => updateQuestion(qIndex, 'correct_answer', 'False')}
                                        /> False
                                    </label>
                                </div>
                            )}

                            {q.type === 'WRITTEN' && (
                                <textarea 
                                    className="w-full p-3 bg-[#10B981] bg-opacity-5 border border-[#10B981] rounded-lg focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981] focus:ring-opacity-20 outline-none resize-none"
                                    placeholder="Enter the Model Answer here (The AI will use this to grade the student)..."
                                    rows="4"
                                    value={q.correct_answer}
                                    onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                                />
                            )}
                        </div>
                        
                        {/* Drop indicator line - shows below the card when dragging over */}
                        {dragOverIndex === qIndex && draggedIndex !== qIndex && draggedIndex > qIndex && (
                            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-[#0EA5E9] rounded-full shadow-lg z-10 animate-pulse">
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#0EA5E9] rounded-full"></div>
                            </div>
                        )}
                    </div>
                    ))}

                    {/* Actions */}
                    <div className="flex justify-between mt-8 mb-8">
                        <button 
                            onClick={addQuestion}
                            className="bg-white border border-[#E5E7EB] text-[#111827] px-6 py-3 rounded-lg hover:bg-[#F9FAFB] transition shadow-sm font-semibold"
                        >
                            + Add Question
                        </button>
                        <button 
                            onClick={handleSave}
                            className="bg-[#0EA5E9] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#0284C7] transition shadow-sm"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </TeacherLayout>
    );
};

export default EditQuiz;
