import { MdCheckCircle } from 'react-icons/md';

const ThankYou = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
                <div className="mb-6">
                    <MdCheckCircle className="text-[#10B981] text-7xl mx-auto animate-bounce" />
                </div>
                
                <h1 className="text-3xl font-bold text-[#111827] mb-4">
                    Thank You!
                </h1>
                
                <p className="text-[#6B7280] text-lg mb-6">
                    Your exam has been submitted successfully.
                </p>
                
                <div className="bg-[#EFF6FF] border-l-4 border-[#0EA5E9] p-4 rounded-lg mb-6">
                    <p className="text-sm text-[#1E40AF]">
                        Your teacher will review your submission. You may now close this window.
                    </p>
                </div>
                
                <div className="text-xs text-[#9CA3AF] mt-8">
                    <p>Powered by QUIZAI</p>
                </div>
            </div>
        </div>
    );
};

export default ThankYou;
