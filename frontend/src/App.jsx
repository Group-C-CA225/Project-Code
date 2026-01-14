import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import QuizAnalytics from "./pages/QuizAnalytics";
import CreateQuiz from "./pages/CreateQuiz";
import EditQuiz from "./pages/EditQuiz";
import TakeExam from "./pages/TakeExam";
import JoinExam from "./pages/JoinExam";
import ExamResults from "./pages/ExamResults";
import Register from "./pages/Register";
import Students from "./pages/Students";
import ThankYou from "./pages/ThankYou";
import TeacherProfile from "./pages/TeacherProfile";
import RealtimeMonitor from "./pages/RealtimeMonitor";
// Protected Route Component
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("teacher_token");
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/analytics/:id"
          element={
            <PrivateRoute>
              <QuizAnalytics />
            </PrivateRoute>
          }
        />

        <Route
          path="/create-quiz"
          element={
            <PrivateRoute>
              <CreateQuiz />
            </PrivateRoute>
          }
        />
        <Route
          path="/edit-quiz/:id"
          element={
            <PrivateRoute>
              <EditQuiz />
            </PrivateRoute>
          }
        />
        <Route
          path="/students"
          element={
            <PrivateRoute>
              <Students />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <TeacherProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/monitor/:id"
          element={
            <PrivateRoute>
              <RealtimeMonitor />
            </PrivateRoute>
          }
        />
        <Route path="/join/:code" element={<JoinExam />} />
        <Route path="/exam/:code" element={<TakeExam />} />
        <Route path="/exam-results" element={<ExamResults />} />
        <Route path="/thank-you" element={<ThankYou />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
