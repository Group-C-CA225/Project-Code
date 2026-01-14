import React from 'react';

const TeacherDashboard = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white p-6 hidden md:block">
        <h1 className="text-2xl font-bold mb-8">QuizMaster AI</h1>
        <nav className="space-y-4">
          <a href="#" className="block text-blue-400">Dashboard</a>
          <a href="#" className="block hover:text-gray-300">Create Quiz</a>
          <a href="#" className="block hover:text-gray-300">Analytics</a>
          <a href="#" className="block hover:text-gray-300">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Students" value="124" color="bg-blue-500" />
          <StatCard title="Active Exams" value="3" color="bg-green-500" />
          <StatCard title="Avg Score" value="78%" color="bg-purple-500" />
        </div>

        <h2 className="text-xl font-bold mb-4">Recent Submissions</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Quiz</th>
                <th className="p-4">Score</th>
                <th className="p-4">AI Feedback</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">Ahmed Ali</td>
                <td className="p-4">Physics Final</td>
                <td className="p-4 text-green-600 font-bold">92/100</td>
                <td className="p-4 text-sm text-gray-500">Good grasp of Newton's laws...</td>
              </tr>
              {/* More rows... */}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, color }) => (
  <div className={`${color} text-white p-6 rounded-lg shadow-md`}>
    <h3 className="text-lg opacity-90">{title}</h3>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

export default TeacherDashboard;