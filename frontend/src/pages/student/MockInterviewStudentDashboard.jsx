import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** @deprecated Use separate tabs: liveMockInterviews, guidedAiInterviews */
export default function MockInterviewStudentDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/student?tab=liveMockInterviews', { replace: true });
  }, [navigate]);

  return null;
}
