import { useEffect } from "react";

const SecureGuard = ({ studentId, onBlock }) => {
  useEffect(() => {
    let violationCount = 0;
    const MAX_VIOLATIONS = 3; // Allow 3 violations before blocking

    const handleVisibilityChange = () => {
      if (document.hidden) {
        violationCount++;
        if (violationCount >= MAX_VIOLATIONS) {
          handleViolation("Multiple tab switching detected! Your exam is being terminated.");
        } else {
          alert(`WARNING: Tab switching detected (${violationCount}/${MAX_VIOLATIONS}). Please stay on this page!`);
        }
      }
    };

    const handleBlur = () => {
      // Only trigger on blur if window is not minimized (to avoid false positives)
      if (!document.hidden) {
        violationCount++;
        if (violationCount >= MAX_VIOLATIONS) {
          handleViolation("Window focus lost multiple times! Your exam is being terminated.");
        }
      }
    };

    const handleContextMenu = (e) => {
      // Disable right-click menu
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      // Disable common shortcuts
      if (e.ctrlKey || e.metaKey) {
        // Disable Ctrl+W, Ctrl+N, Ctrl+T, Ctrl+Shift+N, F5, etc.
        if (e.key === 'w' || e.key === 'n' || e.key === 't' || e.key === 'N' || e.key === 'F5') {
          e.preventDefault();
          alert("Shortcuts are disabled during the exam!");
          return false;
        }
      }
      // Disable F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    };

    const handleViolation = async (message) => {
      alert(message);
      
      try {
        // Note: This endpoint may not exist, but we keep it for future implementation
        await fetch("http://localhost/quiz_platform/backend/api/exam.php?action=report_violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: studentId }),
        }).catch(() => {
          // Endpoint may not exist, that's okay
        });
        onBlock(); // Callback to parent to kill the session UI
      } catch (error) {
        console.error("Error reporting violation", error);
        onBlock(); // Still block even if reporting fails
      }
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [studentId, onBlock]);

  // Return null - security features still active but no visual element
  return null;
};

export default SecureGuard;