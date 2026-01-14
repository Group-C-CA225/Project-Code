import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../components/TeacherLayout';
import Swal from 'sweetalert2';
import api from '../utils/api';
import { MdPerson, MdEmail, MdLock, MdSave } from 'react-icons/md';

const TeacherProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        email: ''
    });
    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/api/teacher/profile');
            setProfile({
                full_name: res.full_name || '',
                email: res.email || ''
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        
        if (!profile.full_name || !profile.email) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Fields',
                text: 'Please fill in all fields',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }

        setLoading(true);
        try {
            await api.put('/api/teacher/profile', profile);
            Swal.fire({
                icon: 'success',
                title: 'Profile Updated!',
                text: 'Your profile has been updated successfully',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: err.message || 'Could not update profile',
                confirmButtonColor: '#0EA5E9'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!passwords.current_password || !passwords.new_password || !passwords.confirm_password) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Fields',
                text: 'Please fill in all password fields',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }

        if (passwords.new_password !== passwords.confirm_password) {
            Swal.fire({
                icon: 'error',
                title: 'Password Mismatch',
                text: 'New passwords do not match',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }

        if (passwords.new_password.length < 6) {
            Swal.fire({
                icon: 'warning',
                title: 'Weak Password',
                text: 'Password must be at least 6 characters',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/teacher/change-password', {
                current_password: passwords.current_password,
                new_password: passwords.new_password
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Password Changed!',
                text: 'Your password has been updated successfully',
                timer: 1500,
                showConfirmButton: false
            });
            
            setPasswords({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Change Failed',
                text: err.message || 'Could not change password',
                confirmButtonColor: '#0EA5E9'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <TeacherLayout>
            <div className="p-8 bg-[#F9FAFB] min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#111827]">Profile Settings</h1>
                    <p className="text-[#6B7280]">Manage your account information</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Information */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-[#0EA5E9] bg-opacity-10 rounded-lg">
                                <MdPerson className="text-2xl text-[#0EA5E9]" />
                            </div>
                            <h2 className="text-xl font-bold text-[#111827]">Profile Information</h2>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#111827] mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdPerson className="text-[#6B7280]" />
                                    </div>
                                    <input
                                        type="text"
                                        value={profile.full_name}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        className="w-full pl-10 pr-3 py-3 border-2 border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#111827] mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdEmail className="text-[#6B7280]" />
                                    </div>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        className="w-full pl-10 pr-3 py-3 border-2 border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#0EA5E9] text-white font-semibold py-3 rounded-lg hover:bg-[#0284C7] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <MdSave />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Change Password */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-500 bg-opacity-10 rounded-lg">
                                <MdLock className="text-2xl text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-[#111827]">Change Password</h2>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#111827] mb-2">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdLock className="text-[#6B7280]" />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwords.current_password}
                                        onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                                        className="w-full pl-10 pr-3 py-3 border-2 border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                        placeholder="Enter current password"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#111827] mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdLock className="text-[#6B7280]" />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwords.new_password}
                                        onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                                        className="w-full pl-10 pr-3 py-3 border-2 border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                        placeholder="Enter new password"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#111827] mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdLock className="text-[#6B7280]" />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwords.confirm_password}
                                        onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                                        className="w-full pl-10 pr-3 py-3 border-2 border-[#E5E7EB] rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <MdLock />
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </TeacherLayout>
    );
};

export default TeacherProfile;
