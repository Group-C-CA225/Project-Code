import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { MdDashboard, MdAdd, MdPeople, MdMenu, MdLogout, MdClose, MdSettings } from 'react-icons/md';

const TeacherLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const userName = localStorage.getItem('user_name') || 'Teacher';
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = () => {
        Swal.fire({
            title: 'Logout?',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0EA5E9',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Logout'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.clear();
                navigate('/');
            }
        });
    };

    const menuItems = [
        { path: '/dashboard', icon: MdDashboard, label: 'Dashboard' },
        { path: '/create-quiz', icon: MdAdd, label: 'Create Quiz' },
        { path: '/students', icon: MdPeople, label: 'Students' },
        { path: '/profile', icon: MdSettings, label: 'Profile' },
    ];

    return (
        <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className={`lg:hidden fixed top-4 left-4 z-50 bg-[#1F2937] text-white p-3 rounded-lg shadow-lg hover:bg-[#374151] transition-all duration-300 ${
                    isMobileOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
            >
                <MdMenu className="w-6 h-6" />
            </button>

            {/* Overlay for mobile */}
            <div
                className={`lg:hidden fixed inset-0 bg-black z-30 transition-opacity duration-300 ${
                    isMobileOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsMobileOpen(false)}
            />

            {/* Sidebar */}
            <aside
                onMouseEnter={() => !isMobileOpen && setIsCollapsed(false)}
                onMouseLeave={() => !isMobileOpen && setIsCollapsed(true)}
                className={`
                    fixed lg:relative z-40 h-full bg-[#1F2937] text-white flex flex-col shadow-xl
                    transition-all duration-300 ease-out flex-shrink-0
                    ${isCollapsed && !isMobileOpen ? 'lg:w-20' : 'w-64'}
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
                style={{ willChange: 'width, transform' }}
            >
                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="lg:hidden absolute top-4 right-4 text-white hover:text-[#0EA5E9] transition-colors z-10"
                >
                    <MdClose className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex-shrink-0">
                    <h1 className={`text-2xl font-bold transition-all duration-500 ${
                        isCollapsed && !isMobileOpen ? 'lg:text-center lg:text-lg' : ''
                    }`}>
                        {isCollapsed && !isMobileOpen ? (
                            <span className="hidden lg:block">Q<span className="text-[#0EA5E9]">AI</span></span>
                        ) : (
                            <>QUIZ<span className="text-[#0EA5E9]">AI</span></>
                        )}
                    </h1>
                    <p className={`text-sm text-[#9CA3AF] mt-1 transition-all duration-500 ${
                        isCollapsed && !isMobileOpen ? 'lg:opacity-0 lg:max-h-0' : 'opacity-100 max-h-10'
                    }`}>
                        Teacher Portal
                    </p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setIsMobileOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                                    isActive
                                        ? 'bg-[#0EA5E9] text-white font-semibold shadow-sm'
                                        : 'text-gray-300 hover:bg-[#374151]'
                                } ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
                                title={isCollapsed && !isMobileOpen ? item.label : ''}
                            >
                                <Icon className="text-2xl flex-shrink-0" />
                                <span className={`whitespace-nowrap transition-all duration-500 ${
                                    isCollapsed && !isMobileOpen ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : 'w-auto opacity-100'
                                }`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex-shrink-0">
                    <div className={`flex items-center gap-3 mb-3 ${
                        isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''
                    }`}>
                        <div className="w-10 h-10 bg-[#0EA5E9] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className={`flex-1 transition-all duration-500 overflow-hidden ${
                            isCollapsed && !isMobileOpen ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'
                        }`}>
                            <p className="text-sm font-semibold truncate">{userName}</p>
                            <p className="text-xs text-[#9CA3AF]">Teacher</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2"
                        title={isCollapsed && !isMobileOpen ? 'Logout' : ''}
                    >
                        <MdLogout className="text-lg flex-shrink-0" />
                        <span className={`whitespace-nowrap transition-all duration-500 overflow-hidden ${
                            isCollapsed && !isMobileOpen ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'
                        }`}>
                            Logout
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
                {children}
            </main>
        </div>
    );
};

export default TeacherLayout;
