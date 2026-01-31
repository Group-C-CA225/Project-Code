# Quiz Platform - AI-Powered Exam Management System

A modern, full-stack quiz and exam management platform with real-time monitoring, AI-powered grading, and comprehensive analytics.

## 🚀 Features

### For Teachers
- **Quiz Management**: Create, edit, duplicate, and schedule quizzes with ease
- **Real-Time Monitoring**: Track students taking exams live with session tracking and heartbeat monitoring
- **AI-Powered Grading**: Intelligent grading for MCQ, True/False, and written questions with conceptual understanding
- **Retake Control**: Enable or disable quiz retakes per quiz with automatic score replacement
- **Analytics Dashboard**: View comprehensive statistics, score distribution, and performance insights
- **Class Management**: Organize and filter quizzes by class or section
- **Flexible Scheduling**: Set start and end times for timed quiz access
- **Session Control**: Pause, resume, block, or cancel student sessions in real-time
- **Export Data**: Export quiz results and analytics to CSV for reporting
- **Smart Actions Menu**: Intuitive dropdown menu with intelligent positioning for quiz actions

### For Students
- **Easy Access**: Join quizzes using simple access codes - no account required
- **Multiple Question Types**: Answer MCQ, True/False, and written questions
- **Instant Results**: View detailed results with correct answers and AI feedback (when enabled by teacher)
- **Retake Option**: Retake quizzes when enabled by teacher (new score replaces old score)
- **Clean Interface**: Intuitive, distraction-free exam experience
- **Progress Tracking**: See your progress during the exam
- **Security Monitoring**: Tab switching and copy/paste detection for exam integrity

### Technical Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-Time Updates**: Live session monitoring with 2-second heartbeat tracking
- **Secure Authentication**: Token-based teacher authentication with email verification
- **RESTful API**: Clean, well-structured backend API architecture
- **Modern UI**: Built with React, Tailwind CSS, and smooth animations
- **Smart Dropdowns**: Context-aware menus that adapt to screen position
- **AI Integration**: OpenAI GPT-4 integration with intelligent fallback grading
- **Session Management**: Comprehensive tracking with violation detection and abandonment handling

## 📋 Prerequisites

- **PHP**: 7.4 or higher
- **MySQL**: 5.7 or higher
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **Web Server**: Apache or Nginx
- **Composer**: (optional, for PHP dependencies)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd quiz-platform
```

### 2. Database Setup

Create a new MySQL database and run the migration file:

```bash
mysql -u root -p
CREATE DATABASE quiz_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

mysql -u root -p quiz_platform < backend/migrations/database_schema.sql
```

### 3. Backend Configuration

**Database Configuration**: Edit `backend/config/Database.php` with your database credentials:

```php
private $host = "localhost";
private $db_name = "quiz_platform";
private $username = "root";
private $password = "your_password";
```

**AI Service Configuration** (Optional but Recommended): Create `backend/.env` file for AI grading:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Without an API key, the system uses an improved fallback grading algorithm based on keyword matching. For best results with written questions, configure the OpenAI API key.

### 4. Frontend Setup

Install dependencies and configure the API endpoint:

```bash
cd frontend
npm install
```

Edit `frontend/src/utils/api.js` to set your backend URL:

```javascript
const API_BASE_URL = 'http://localhost/quiz-platform/backend';
```

### 5. Start Development Servers

**Backend** (using PHP built-in server):
```bash
cd backend
php -S localhost:8000
```

Or configure Apache/Nginx to serve the `backend` directory.

**Frontend**:
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🏗️ Production Build

### Frontend Build

```bash
cd frontend
npm run build
```

The production files will be in `frontend/dist/`. Copy these to your web server.

### Backend Deployment

1. Upload the `backend` folder to your web server
2. Ensure `.htaccess` is configured for URL rewriting
3. Set proper file permissions (755 for directories, 644 for files)
4. Update database credentials in `backend/config/Database.php`

## 📁 Project Structure

```
quiz-platform/
├── backend/
│   ├── api/                    # API endpoints
│   │   ├── auth.php           # Authentication
│   │   ├── quiz.php           # Quiz management
│   │   ├── exam.php           # Exam taking
│   │   ├── analytics/         # Analytics endpoints
│   │   ├── students/          # Student endpoints
│   │   └── teacher/           # Teacher endpoints
│   ├── config/
│   │   └── Database.php       # Database configuration
│   ├── controllers/           # Business logic
│   ├── services/
│   │   └── AIService.php      # AI grading service
│   ├── migrations/            # Database migrations
│   └── utils/
│       └── headers.php        # CORS headers
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── utils/            # Utilities (API client)
│   │   └── App.jsx           # Main app component
│   ├── public/               # Static assets
│   └── package.json          # Dependencies
└── README.md
```

## 🔑 Getting Started

After installation, register a teacher account through the application at `/register` or use the login page if you already have an account.

## 🎯 Usage Guide

### Creating a Quiz

1. Login as a teacher
2. Click "Create New Quiz"
3. Add quiz details (title, description, class, duration)
4. Add questions (MCQ, True/False, or Essay)
5. Set quiz status to "Active" or schedule it
6. Share the access code with students

### Taking a Quiz

1. Students visit the join page
2. Enter the access code
3. Provide name and class
4. Complete the quiz within the time limit
5. Submit and view results (if enabled)

### Monitoring Exams

1. Navigate to Dashboard
2. Click "Monitor" on an active quiz
3. View real-time student progress
4. See who's currently taking the exam
5. Track completion status

### Viewing Analytics

1. Click "View" on any quiz
2. See detailed statistics:
   - Score distribution
   - Question-wise performance
   - Student rankings
   - Time analysis
3. Export data to CSV for further analysis

## 🔧 Configuration Options

### Quiz Settings
- **Duration**: Set time limit in minutes (e.g., 30, 60, 90 minutes)
- **Scheduling**: Define start and end times for automatic activation
- **Results Display**: Choose whether students see results immediately after submission
- **Allow Retake**: Enable students to retake the quiz (new score replaces old score)
- **Class Filter**: Organize and restrict quizzes by class/section
- **Status Control**: Set quiz as ACTIVE, INACTIVE, or scheduled

### Question Types
- **MCQ**: Multiple choice with up to 4 options (auto-graded)
- **True/False**: Binary choice questions (auto-graded)
- **Written**: Open-ended questions with AI-powered grading that understands paraphrasing and conceptual answers

### AI Grading Features
- **Conceptual Understanding**: AI evaluates meaning, not just exact word matching
- **Paraphrasing Support**: Accepts different phrasings of correct answers
- **Detailed Feedback**: Provides constructive feedback for each answer
- **Fallback Grading**: Intelligent keyword-based grading when AI is unavailable
- **Score Conversion**: Properly converts AI scores (0-100) to question points

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL credentials in `Database.php`
- Ensure MySQL service is running
- Check database exists and user has permissions

### CORS Errors
- Update `backend/utils/headers.php` with your frontend URL
- Ensure headers are included in all API endpoints

### Frontend Not Loading
- Check API_BASE_URL in `frontend/src/utils/api.js`
- Verify backend is running and accessible
- Check browser console for errors

### AI Grading Issues
- Check if `OPENAI_API_KEY` is set in `backend/.env`
- Verify API key is valid and has credits
- System automatically falls back to keyword matching if AI unavailable
- Test grading with `php backend/test_ai_grading.php`
- Review error logs for API connection issues

## 🔒 Security Notes

- Change default passwords immediately
- Use HTTPS in production
- Keep API keys in environment variables
- Regularly update dependencies
- Implement rate limiting for API endpoints
- Sanitize all user inputs

## 📊 Database Schema

The platform uses 9 main tables:
- **Teachers**: User accounts and authentication
- **Pending Registrations**: Email verification for new teacher accounts
- **Password Resets**: Password reset token management
- **Quizzes**: Quiz information, scheduling, settings, and retake control
- **Questions**: Quiz questions with multiple types (MCQ, True/False, Written)
- **Students**: Student submissions and scores
- **Student Answers**: Individual answers with AI grading results and feedback
- **Exam Sessions**: Real-time session tracking with heartbeat monitoring
- **Exam Question Progress**: Detailed question-level progress tracking

See `backend/migrations/database_schema.sql` for the complete schema.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review existing issues
- Create a new issue with detailed information

## 🎨 Recent Updates & Improvements

### AI Grading Enhancements (v2.0)
- **Fixed Score Display**: Properly converts AI scores (0-100) to question points (e.g., "8/10" instead of "80/10")
- **Improved Fallback Grading**: More lenient keyword matching that accepts paraphrasing
- **Conceptual Understanding**: AI now rewards understanding over exact wording
- **Better Feedback**: More constructive and encouraging feedback messages

### Retake System
- **Teacher Control**: Enable/disable retakes per quiz
- **Score Replacement**: New score automatically replaces old score
- **Confirmation Dialog**: Students confirm before retaking with previous score shown
- **Security**: Blocked students (security violations) cannot retake regardless of setting

### Session Management
- **Real-time Monitoring**: 2-second heartbeat for instant updates
- **Teacher Controls**: Pause, resume, block, or cancel individual sessions
- **Violation Tracking**: Automatic detection and logging of security violations
- **Abandonment Detection**: Auto-cleanup of stale sessions after 2 minutes

### UI/UX Improvements
- **Intelligent Action Menu**: Dropdown with smart positioning (opens up/down based on available space)
- **Visual Hierarchy**: Primary actions prominent, secondary actions in menu
- **Responsive Design**: Optimized for all screen sizes
- **Real-time Feedback**: Loading states and success/error messages
- **Waiting Room**: Smooth transition when quiz activates with countdown timer

## 🚀 Future Enhancements

- [ ] Question bank and templates
- [ ] Bulk import questions (CSV/Excel)
- [ ] Advanced analytics with charts and graphs
- [ ] Student performance tracking over time
- [ ] Email notifications for quiz activation
- [ ] Multi-language support
- [ ] Question randomization per student
- [ ] Manual grade override for teachers
- [ ] Plagiarism detection for written answers
- [ ] Video proctoring integration
- [ ] Mobile app for iOS and Android
- [ ] Offline mode with sync
- [ ] Question difficulty levels
- [ ] Adaptive testing based on performance

---

Built with ❤️ using React, PHP, and MySQL
