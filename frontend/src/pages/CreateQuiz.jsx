import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Swal from 'sweetalert2';
import TeacherLayout from '../components/TeacherLayout';

const CreateQuiz = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(60);
    const [classFilter, setClassFilter] = useState('');
    const [showResultsToStudents, setShowResultsToStudents] = useState(false);
    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [questions, setQuestions] = useState([
        { type: 'MCQ', question_text: '', options: ['', '', '', ''], correct_answer: '' }
    ]);
    const [validationErrors, setValidationErrors] = useState({});

    // Add a new blank question
    const addQuestion = () => {
        setQuestions([...questions, { type: 'MCQ', question_text: '', options: ['', '', '', ''], correct_answer: '' }]);
    };

    // Remove a question
    const removeQuestion = (index) => {
        const newQ = [...questions];
        newQ.splice(index, 1);
        setQuestions(newQ);
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
        newQ[qIndex].options[oIndex] = value;
        setQuestions(newQ);
    };

    // Add option to MCQ
    const addOption = (qIndex) => {
        const newQ = [...questions];
        newQ[qIndex].options.push('');
        setQuestions(newQ);
    };

    // Remove option from MCQ
    const removeOption = (qIndex, oIndex) => {
        const newQ = [...questions];
        if (newQ[qIndex].options.length > 2) { // Keep at least 2 options
            newQ[qIndex].options.splice(oIndex, 1);
            setQuestions(newQ);
        }
    };

    const handleSubmit = async () => {
        if (!title) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Title',
                text: 'Please enter a quiz title',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }
        
        // Clear previous errors
        setValidationErrors({});
        const errors = {};
        
        // Validate all questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            
            // Check question text
            if (!q.question_text || !q.question_text.trim()) {
                errors[i] = 'Question text is required';
                Swal.fire({
                    icon: 'warning',
                    title: 'Incomplete Question',
                    html: `<p>Question ${i + 1} is missing the question text.</p>`,
                    confirmButtonColor: '#0EA5E9'
                });
                setValidationErrors(errors);
                document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            
            // Validate MCQ
            if (q.type === 'MCQ') {
                // Check if all options are filled
                const emptyOptions = q.options.filter(opt => !opt || !opt.trim());
                if (emptyOptions.length > 0) {
                    errors[i] = 'All options must be filled';
                    Swal.fire({
                        icon: 'warning',
                        title: 'Incomplete Question',
                        html: `<p>Question ${i + 1}: All options must be filled in.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    setValidationErrors(errors);
                    document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                
                // Check if correct answer is provided
                if (!q.correct_answer || !q.correct_answer.trim()) {
                    errors[i] = 'Correct answer is required';
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Correct Answer',
                        html: `<p>Question ${i + 1}: Please enter the correct answer.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    setValidationErrors(errors);
                    document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                
                // Check if correct answer matches one of the options
                const correctAnswerLower = q.correct_answer.trim().toLowerCase();
                const optionsLower = q.options.map(opt => opt.trim().toLowerCase());
                if (!optionsLower.includes(correctAnswerLower)) {
                    errors[i] = 'Correct answer must match an option';
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Correct Answer',
                        html: `<p>Question ${i + 1}: The correct answer must exactly match one of the options.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    setValidationErrors(errors);
                    document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
            
            // Validate TRUE_FALSE
            if (q.type === 'TRUE_FALSE') {
                if (!q.correct_answer || (q.correct_answer !== 'True' && q.correct_answer !== 'False')) {
                    errors[i] = 'Please select True or False';
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Answer',
                        html: `<p>Question ${i + 1}: Please select True or False.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    setValidationErrors(errors);
                    document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
            
            // Validate WRITTEN
            if (q.type === 'WRITTEN') {
                if (!q.correct_answer || !q.correct_answer.trim()) {
                    errors[i] = 'Model answer is required';
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Model Answer',
                        html: `<p>Question ${i + 1}: Please provide a model answer for AI grading.</p>`,
                        confirmButtonColor: '#0EA5E9'
                    });
                    setValidationErrors(errors);
                    document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }
        
        // Encode shuffle setting in description with marker
        let descriptionWithSettings = description;
        if (shuffleQuestions) {
            descriptionWithSettings += '[SHUFFLE:true]';
        }
        
        const payload = { 
            title, 
            description: descriptionWithSettings, 
            duration, 
            class: classFilter || null,
            show_results_to_students: showResultsToStudents, 
            questions 
        };
        
        try {
            const res = await api.post('/api/quiz/create', payload);
            await Swal.fire({
                icon: 'success',
                title: 'Quiz Created!',
                html: `<p>Access Code: <strong class="text-2xl">${res.access_code}</strong></p>`,
                confirmButtonColor: '#0EA5E9'
            });
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Failed to Create Quiz',
                text: err.message || 'Something went wrong',
                confirmButtonColor: '#0EA5E9'
            });
        }
    };


    return (
        <TeacherLayout>
            <div className="p-8 bg-[#F9FAFB] min-h-screen">
                <div className="max-w-4xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#222831]">Create New Quiz</h1>
                    <p className="text-gray-500 mt-1">Design your assessment with AI-ready questions</p>
                </div>

                {/* Quiz Settings Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB] mb-6">
                    <h2 className="text-xl font-bold text-[#222831] mb-4">Quiz Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full"
                            placeholder="Quiz Title (e.g. Physics Midterm)"
                            value={title} onChange={e => setTitle(e.target.value)}
                        />
                        <input 
                            className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full"
                            placeholder="Class (e.g. Grade 10A, CS101)"
                            value={classFilter} onChange={e => setClassFilter(e.target.value)}
                        />
                        <input 
                            type="number"
                            className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full"
                            placeholder="Duration (Minutes)"
                            value={duration} onChange={e => setDuration(e.target.value)}
                        />
                        <textarea 
                            className="p-3 border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] outline-none w-full md:col-span-2 resize-none"
                            placeholder="Instructions for students..."
                            rows="3"
                            value={description} onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="showResults"
                                checked={showResultsToStudents}
                                onChange={(e) => setShowResultsToStudents(e.target.checked)}
                                className="w-5 h-5 text-[#0EA5E9] border-gray-300 rounded focus:ring-[#0EA5E9]"
                            />
                            <label htmlFor="showResults" className="ml-3 text-sm text-gray-700">
                                Allow students to view their results after submission
                            </label>
                        </div>
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
                    </div>
                </div>

                {/* Questions List */}
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
                            className={`question-card bg-white p-6 rounded-lg shadow-sm mb-4 relative border-2 transition-all duration-200 ${
                                draggedIndex === qIndex 
                                    ? 'border-[#0EA5E9] shadow-xl scale-105 rotate-2' 
                                    : dragOverIndex === qIndex && draggedIndex !== null
                                    ? 'border-[#0EA5E9] bg-blue-50 scale-102 shadow-lg'
                                    : validationErrors[qIndex]
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-[#E5E7EB] hover:border-gray-300'
                            }`}
                            style={{ cursor: draggedIndex === qIndex ? 'grabbing' : 'grab' }}
                        >
                            {/* Validation Error Badge */}
                            {validationErrors[qIndex] && (
                                <div className="absolute top-2 right-16 bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold animate-pulse">
                                    ⚠ {validationErrors[qIndex]}
                                </div>
                            )}
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
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} className="flex gap-2">
                                            <input 
                                                className="flex-1 p-2 border border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                                placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                                value={opt}
                                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                            />
                                            {q.options.length > 2 && (
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
                                        type="radio" name={`tf-${qIndex}`} 
                                        checked={q.correct_answer === 'True'}
                                        onChange={() => updateQuestion(qIndex, 'correct_answer', 'True')}
                                    /> True
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" name={`tf-${qIndex}`} 
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
                        onClick={handleSubmit}
                        className="bg-[#0EA5E9] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#0284C7] transition shadow-sm"
                    >
                        Save & Publish Quiz
                    </button>
                </div>
            </div>
            </div>
        </TeacherLayout>
    );
};

export default CreateQuiz;
