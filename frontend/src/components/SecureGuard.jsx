import { useEffect } from "react";

const SecureGuard = ({ studentId, sessionToken, onBlock, isSubmitting = false }) => {
  useEffect(() => {
    // Don't enforce security during submission/navigation
    if (isSubmitting) {
      return;
    }

    const handleViolation = async (message, violationType = 'TAB_SWITCH') => {
      alert(message);
      
      // Report violation to backend so teacher can see it
      if (sessionToken) {
        try {
          await fetch("http://localhost/quiz_platform/backend/api/realtime/session/violation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              session_token: sessionToken,
              violation_type: violationType
            }),
          }).catch(() => {
            // Endpoint may not exist, continue anyway
          });
        } catch (error) {
          console.error("Error reporting violation", error);
        }
      }
      
      onBlock(); // Callback to parent to kill the session UI
    };

    const handleVisibilityChange = () => {
      // Lock immediately when tab becomes hidden/inactive
      if (document.hidden && !isSubmitting) {
        handleViolation("Tab switching detected! Your exam is being terminated.");
      }
    };

    const handleBlur = () => {
      // Lock immediately when window loses focus (but not during submission)
      if (!document.hidden && !isSubmitting) {
        handleViolation("Window focus lost! Your exam is being terminated.");
      }
    };

    const handleContextMenu = (e) => {
      // Disable right-click menu (prevents copy from context menu)
      e.preventDefault();
      return false;
    };

    const handleCopy = (e) => {
      // Block copy operations (Ctrl+C, Ctrl+Shift+C, etc.)
      e.preventDefault();
      alert("Copying is disabled during the exam!");
      return false;
    };

    const handleCut = (e) => {
      // Block cut operations (Ctrl+X)
      e.preventDefault();
      alert("Cutting is disabled during the exam!");
      return false;
    };

    const handlePaste = (e) => {
      // Block paste operations (Ctrl+V, Ctrl+Shift+V)
      e.preventDefault();
      alert("Pasting is disabled during the exam!");
      return false;
    };

    const handleKeyDown = (e) => {
      // Disable copy shortcuts (Ctrl+C, Ctrl+Shift+C, Ctrl+Insert)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C' || e.key === 'Insert' || 
            (e.shiftKey && e.key === 'C')) {
          e.preventDefault();
          alert("Copying is disabled during the exam!");
          return false;
        }
        // Disable paste shortcuts (Ctrl+V, Ctrl+Shift+V, Shift+Insert)
        if (e.key === 'v' || e.key === 'V' || 
            (e.shiftKey && (e.key === 'V' || e.key === 'Insert'))) {
          e.preventDefault();
          alert("Pasting is disabled during the exam!");
          return false;
        }
        // Disable cut shortcuts (Ctrl+X, Shift+Delete)
        if (e.key === 'x' || e.key === 'X' || 
            (e.shiftKey && e.key === 'Delete')) {
          e.preventDefault();
          alert("Cutting is disabled during the exam!");
          return false;
        }
        // Disable Ctrl+W, Ctrl+N, Ctrl+T, Ctrl+Shift+N, F5, etc.
        if (e.key === 'w' || e.key === 'n' || e.key === 't' || e.key === 'N' || e.key === 'F5') {
          e.preventDefault();
          alert("Shortcuts are disabled during the exam!");
          return false;
        }
        // Disable Ctrl+A (Select All) - additional security
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          return false;
        }
      }
      // Disable F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Disable Print Screen (some browsers)
      if (e.key === 'PrintScreen' || e.key === 'Print') {
        e.preventDefault();
        return false;
      }
    };

    const handleSelectStart = (e) => {
      // Prevent text selection (additional security layer)
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [studentId, sessionToken, onBlock, isSubmitting]);

  // Return null - security features still active but no visual element
  return null;
};

export default SecureGuard;