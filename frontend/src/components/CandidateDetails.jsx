// CandidateDetails.jsx
import React, { useState, useEffect, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidates } from "../redux/slices/candidatesSlice";
import {
  fetchJobs,
  selectAllJobs,
  selectJobsStatus,
} from "../redux/slices/jobsSlice";
import { baseURL } from "../data";
import "./CandidateDetails.css";
import "./common/DataTable.css";
import BeatLoader from "react-spinners/BeatLoader";
import StatusUpdateModal from "./StatusUpdateModal";
import { useNotification } from "../hooks/useNotification";
import { formatTimeTo12Hour } from "../utils/timeFormatting";
import AIEvaluationCharts from "./AIEvaluationCharts";
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

// Helper function to safely parse JSON fields
const parseJsonField = (field) => {
  if (!field) return [];
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return Array.isArray(field) ? field : [];
};

const CandidateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const notify = useNotification();

  // Selectors - use direct selectors (shallowEqual helps but arrays need proper memoization in slice)
  const allCandidates = useSelector((state) => state.candidates.allCandidates);
  const candidatesStatus = useSelector(
    (state) => state.candidates.candidatesStatus
  );
  const allJobs = useSelector(selectAllJobs);
  const jobsStatus = useSelector(selectJobsStatus);

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [qaData, setQaData] = useState({}); // Store Q&A data by interview ID
  const [authToken, setAuthToken] = useState("");

  // Get auth token from localStorage when component mounts
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setAuthToken(token);
    } else {
      // Authentication token not found
      // navigate('/login');
    }
  }, []);

  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showEditInterviewModal, setShowEditInterviewModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [showEditEvaluationModal, setShowEditEvaluationModal] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'interview' or 'evaluation'
  const [itemToDelete, setItemToDelete] = useState(null);

  // Helper function to get job title by ID
  const getJobTitle = (jobId) => {
    if (typeof jobId === "string" && !/^[0-9]+$/.test(jobId)) {
      return jobId;
    }
    const job = allJobs.find((j) => String(j.id) === String(jobId));
    return job ? job.job_title : jobId || "N/A";
  };

  // Fetch interviews and evaluations
  const fetchInterviews = async () => {
    if (!candidate?.id || !authToken) return;

    setInterviewsLoading(true);
    try {
      // Fetch interviews
      const interviewsResponse = await fetch(`${baseURL}/api/interviews/`, {
        method: "GET",
        headers: {
          Authorization: `Token ${authToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (!interviewsResponse.ok) {
        if (interviewsResponse.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${interviewsResponse.status}`);
      }

      // Fetch evaluations
      const evaluationsResponse = await fetch(
        `${baseURL}/api/evaluation/crud/`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${authToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!evaluationsResponse.ok) {
        // Don't throw error here as evaluations might be optional
      }

      const interviewsData = await interviewsResponse.json();
      const evaluationsData = evaluationsResponse.ok
        ? await evaluationsResponse.json()
        : [];

      // Process fetched data
      
      // Process interviews and evaluations
      const candidateInterviews = (
        Array.isArray(interviewsData)
          ? interviewsData
          : interviewsData.results || []
      )
        .filter(
          (interview) =>
            interview.candidate === candidate.id ||
            (interview.candidate_object &&
              interview.candidate_object.id === candidate.id)
        );

      // Process candidate interviews

      // For each interview, fetch the associated slot details directly from slots API (same as AI Interview Scheduler)
      const interviewsWithSlots = await Promise.all(candidateInterviews.map(async (interview) => {
        // Process interview slot
        
        if (interview.slot) {
          try {
            // Fetch slot details
            const slotResponse = await fetch(`${baseURL}/api/interviews/slots/${interview.slot}/`, {
              method: "GET",
              headers: {
                Authorization: `Token ${authToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              credentials: "include",
            });

            if (slotResponse.ok) {
              const slotData = await slotResponse.json();
              // Process slot data
              
              // Create slot_details object with the same structure as AI Interview Scheduler
              const slotDetails = {
                id: slotData.id,
                start_time: slotData.start_time,
                end_time: slotData.end_time,
                duration_minutes: slotData.duration_minutes,
                ai_interview_type: slotData.ai_interview_type,
                status: slotData.status,
                current_bookings: slotData.current_bookings,
                max_candidates: slotData.max_candidates,
                interview_date: slotData.interview_date
              };
              
              console.log(`Created slot_details for interview ${interview.id}:`, slotDetails);
              console.log(`Slot details start_time: "${slotDetails.start_time}"`);
              console.log(`Slot details end_time: "${slotDetails.end_time}"`);
              
              return { 
                ...interview, 
                slot_details: slotDetails,
                slot: slotData // Keep original slot data too
              };
            } else {
              console.error(`Failed to fetch slot ${interview.slot}:`, slotResponse.status);
              return interview;
            }
          } catch (error) {
            console.error(`Error fetching slot ${interview.slot}:`, error);
            return interview;
          }
        }
        
        return interview;
      }));

      console.log("Interviews with slots:", interviewsWithSlots);

      // Add evaluations to interviews
      const processedInterviews = interviewsWithSlots.map((interview) => {
        // Find matching evaluation if exists
        const evaluation = Array.isArray(evaluationsData)
          ? evaluationsData.find(
              (evalItem) => evalItem.interview === interview.id
            )
          : null;

        return {
          ...interview,
          evaluation: evaluation || null,
        };
      });

      console.log("Processed interviews with evaluations and slots:", processedInterviews);
      setInterviews(processedInterviews);
      
      // Fetch Q&A data for interviews with AI results
      const qaDataMap = {};
      await Promise.all(processedInterviews.map(async (interview) => {
        // Get session_id from ai_result (session_id is available in the serializer)
        const sessionId = interview.ai_result?.session_id || interview.ai_result?.session;
        console.log(`[Q&A Fetch] Interview ${interview.id}:`, {
          hasAiResult: !!interview.ai_result,
          sessionId: sessionId,
          aiResultKeys: interview.ai_result ? Object.keys(interview.ai_result) : []
        });
        
        if (sessionId) {
          try {
            // Fetch questions and responses
            const questionsUrl = `${baseURL}/api/ai-interview/questions/?session_id=${sessionId}`;
            const responsesUrl = `${baseURL}/api/ai-interview/responses/?session_id=${sessionId}`;
            
            console.log(`[Q&A Fetch] Fetching from: ${questionsUrl}`);
            
            const questionsResponse = await fetch(questionsUrl, {
              method: "GET",
              headers: {
                Authorization: `Token ${authToken}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
            });
            
            const responsesResponse = await fetch(responsesUrl, {
              method: "GET",
              headers: {
                Authorization: `Token ${authToken}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
            });

            console.log(`[Q&A Fetch] Response status - Questions: ${questionsResponse.status}, Responses: ${responsesResponse.status}`);

            if (questionsResponse.ok && responsesResponse.ok) {
              const questionsData = await questionsResponse.json();
              const responsesData = await responsesResponse.json();
              
              const questions = Array.isArray(questionsData) 
                ? questionsData 
                : (questionsData.results || []);
              const responses = Array.isArray(responsesData) 
                ? responsesData 
                : (responsesData.results || []);
              
              console.log(`[Q&A Fetch] Fetched ${questions.length} questions and ${responses.length} responses for interview ${interview.id}`);
              
              // Match responses with questions
              const qaPairs = questions.map((question) => {
                const response = responses.find((r) => {
                  const rQuestionId = r.question?.id || r.question;
                  const qId = question.id;
                  return String(rQuestionId) === String(qId);
                });
                return {
                  question: question.question_text,
                  questionType: question.question_type,
                  questionIndex: question.question_index,
                  answer: response 
                    ? (response.response_text || response.transcribed_text || "No answer provided")
                    : "No answer provided",
                  responseTime: response?.response_submitted_at || null,
                };
              });

              if (qaPairs.length > 0) {
                qaDataMap[interview.id] = qaPairs;
                console.log(`[Q&A Fetch] Added ${qaPairs.length} Q&A pairs for interview ${interview.id}`);
              }
            } else {
              console.error(`[Q&A Fetch] Failed to fetch Q&A data for interview ${interview.id}:`, {
                questionsStatus: questionsResponse.status,
                responsesStatus: responsesResponse.status
              });
            }
          } catch (error) {
            console.error(`[Q&A Fetch] Error fetching Q&A for interview ${interview.id}:`, error);
          }
        } else {
          console.log(`[Q&A Fetch] No session_id found for interview ${interview.id}`);
        }
      }));
      
      console.log(`[Q&A Fetch] Final qaDataMap:`, qaDataMap);
      setQaData(qaDataMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setInterviewsLoading(false);
    }
  };

  // Function to update interview status
  const updateInterviewStatus = async (interviewId, status) => {
    if (!authToken) {
      console.error("Authentication token not found");
      return;
    }

    try {
      const response = await fetch(
        `${baseURL}/api/interviews/${interviewId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${authToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the interviews data
      fetchInterviews();
    } catch (error) {
      console.error("Error updating interview status:", error);
    }
  };

  // Determine current status based on interviews and candidate status
  const getCurrentStatus = () => {
    // First check if candidate has been hired or rejected
    if (candidate?.status === "HIRED") return "HIRED";
    if (candidate?.status === "REJECTED") return "REJECTED";
    
    if (!interviews.length) return "NEW";

    const latestInterview = interviews[interviews.length - 1];
    const status = latestInterview.status?.toLowerCase();

    // Check if there's any AI evaluation for any interview
    const hasAIEvaluation = interviews.some((i) => i.ai_result);
    
    // Also check for legacy evaluation system
    const hasLegacyEvaluation = interviews.some((i) => i.evaluation);

    // Handle new status structure
    if (hasLegacyEvaluation && hasAIEvaluation) return "AI_MANUAL_EVALUATED";
    if (hasLegacyEvaluation) return "MANUAL_EVALUATED";
    if (hasAIEvaluation) return "AI_EVALUATED";
    if (status === "completed") return "INTERVIEW_COMPLETED";
    if (status === "scheduled") return "INTERVIEW_SCHEDULED";

    return "NEW";
  };

  // Available actions based on current status (kept for future use)
  // const availableActions = [
  //   {
  //     id: "schedule_interview",
  //     label: "Schedule Interview",
  //     status: "INTERVIEW_SCHEDULED",
  //   },
  //   { id: "manual_evaluate", label: "Manual Evaluation", status: "MANUAL_EVALUATED" },
  //   { id: "hire_reject", label: "Make Decision", status: "HIRED" },
  // ];

  // Get the next available action based on current status
  const getNextAction = (currentStatus) => {
    switch (currentStatus) {
      case "NEW":
        return { id: "schedule_interview", status: "INTERVIEW_SCHEDULED" };
      case "INTERVIEW_SCHEDULED":
        return { id: "complete_interview", status: "INTERVIEW_COMPLETED" };
      case "INTERVIEW_COMPLETED":
        // After interview completed, next step is manual evaluation (can be done even without AI evaluation)
        return { id: "manual_evaluate", status: "MANUAL_EVALUATED" };
      case "AI_EVALUATED":
        // After AI evaluation, next step is manual evaluation
        return { id: "manual_evaluate", status: "MANUAL_EVALUATED" };
      case "MANUAL_EVALUATED":
      case "AI_MANUAL_EVALUATED": // Handle combined status
        return { id: "hire_reject", status: "HIRE" }; // Show hire option
      default:
        return null;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (action) => {
    if (action === "schedule_interview") {
      setSelectedAction("schedule_interview");
      setShowStatusModal(true);
    } else if (action === "manual_evaluate") {
      setSelectedAction("manual_evaluate");
      setShowStatusModal(true);
    } else if (action === "hire_reject") {
      setSelectedAction("hire_reject");
      setShowStatusModal(true);
    } else if (action === "complete_interview") {
      // Find the latest scheduled interview
      const latestInterview = interviews.find(
        (interview) => interview.status?.toLowerCase() === "scheduled"
      );

      if (latestInterview) {
        try {
          await updateInterviewStatus(latestInterview.id, "completed");
          // Refresh interviews data
          await fetchInterviews();
        } catch (error) {
          console.error("Error completing interview:", error);
        }
      }
    }
  };

  const handleModalClose = () => {
    setShowStatusModal(false);
    setSelectedAction(null);
    // Refresh both interviews and candidate data after modal closes
    fetchInterviews();
    // Refresh candidate data from Redux
    dispatch(fetchCandidates());
  };

  // Interview management handlers
  const handleEditInterview = (interview) => {
    console.log("Edit interview:", interview);
    setEditingInterview(interview);
    setShowEditInterviewModal(true);
  };



  // Evaluation management handlers
  const handleEditEvaluation = (evaluation) => {
    console.log("Edit evaluation:", evaluation);
    console.log("Evaluation data structure:", {
      overall_score: evaluation.overall_score,
      traits: evaluation.traits,
      suggestions: evaluation.suggestions,
      created_at: evaluation.created_at
    });
    setEditingEvaluation(evaluation);
    setShowEditEvaluationModal(true);
  };

  const handleDeleteEvaluation = (evaluation) => {
    setDeleteType('evaluation');
    setItemToDelete(evaluation);
    setShowDeleteModal(true);
  };

  const confirmDeleteEvaluation = async () => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        notify.error("Authentication token not found");
        return;
      }

      // Delete the evaluation
      const response = await fetch(`${baseURL}/api/evaluations/${itemToDelete.id}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete evaluation: ${response.status}`);
      }

      notify.success("Evaluation deleted successfully!");
      
      // Refresh data
      fetchInterviews();
      dispatch(fetchCandidates());
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteType(null);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting evaluation:", error);
      notify.error(error.message || "Failed to delete evaluation");
    }
  };

  const handleDeleteInterview = (interview) => {
    setDeleteType('interview');
    setItemToDelete(interview);
    setShowDeleteModal(true);
  };

  const confirmDeleteInterview = async () => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        notify.error("Authentication token not found");
        return;
      }

      // First, release the slot if it exists by updating it (decrement bookings)
      const slotId = itemToDelete.slot || itemToDelete.slot_details?.id;
      
      console.log("🔍 Checking for slot to release (DELETE):");
      console.log("   itemToDelete:", itemToDelete);
      console.log("   slotId:", slotId);
      
      // If no slot ID, try to find it by interview times
      let actualSlotId = slotId;
      if (!actualSlotId && itemToDelete.started_at) {
        // Try to find the slot by matching the interview time
        const interviewDate = itemToDelete.started_at.split('T')[0];
        const startTimePart = itemToDelete.started_at.split('T')[1];
        const endTimePart = itemToDelete.ended_at?.split('T')[1];
        
        // Extract time without timezone: "08:10:00+05:30" -> "08:10"
        const startTime = startTimePart?.split('+')[0]?.split('-')[0]?.substring(0, 5);
        const endTime = endTimePart?.split('+')[0]?.split('-')[0]?.substring(0, 5);
        
        console.log("🔎 Searching for slot by time (DELETE):", {
          date: interviewDate,
          start: startTime,
          end: endTime
        });
        
        // Fetch all slots for that date
        const searchResponse = await fetch(
          `${baseURL}/api/interviews/slots/?date=${interviewDate}`,
          { 
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${authToken}`,
            }
          }
        );
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const allSlots = searchData.results || searchData || [];
          
          // Find slot matching the times
          const matchedSlot = allSlots.find(s => {
            const slotStart = s.start_time?.substring(0, 5);
            const slotEnd = s.end_time?.substring(0, 5);
            return slotStart === startTime && slotEnd === endTime;
          });
          
          if (matchedSlot) {
            actualSlotId = matchedSlot.id;
            console.log("✅ Found slot by time matching (DELETE):", actualSlotId);
          } else {
            console.warn("⚠️ Could not find slot by time (DELETE)");
          }
        }
      }
      
      if (actualSlotId) {
        try {
          console.log(`🔓 Releasing slot via UPDATE API: ${actualSlotId}`);
          
          // Fetch current slot data
          const slotResponse = await fetch(`${baseURL}/api/interviews/slots/${actualSlotId}/`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${authToken}`,
            },
          });
          
          if (slotResponse.ok) {
            const slotData = await slotResponse.json();
            console.log("📊 Current slot data:", {
              current_bookings: slotData.current_bookings,
              max_candidates: slotData.max_candidates,
              status: slotData.status
            });
            
            // Calculate new booking count and status
            const newBookings = Math.max(0, (slotData.current_bookings || 0) - 1);
            const newStatus = newBookings < slotData.max_candidates ? "available" : slotData.status;
            
            console.log("🔄 Updating slot to:", {
              current_bookings: newBookings,
              status: newStatus
            });
            
            // Update the slot with decremented bookings
            const updateResponse = await fetch(`${baseURL}/api/interviews/slots/${actualSlotId}/`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${authToken}`,
              },
              body: JSON.stringify({
                ...slotData,
                current_bookings: newBookings,
                status: newStatus
              }),
            });

            if (updateResponse.ok) {
              const updatedSlot = await updateResponse.json();
              console.log("✅ Slot released successfully:", {
                current_bookings: updatedSlot.current_bookings,
                status: updatedSlot.status
              });
            } else {
              console.warn("⚠️ Failed to update slot, but continuing with interview deletion");
            }
          }
        } catch (slotError) {
          console.warn("⚠️ Error releasing slot:", slotError);
          // Continue with interview deletion even if slot release fails
        }
      }

      // Delete the interview
      const response = await fetch(`${baseURL}/api/interviews/${itemToDelete.id}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete interview: ${response.status}`);
      }

      // Update candidate status back to NEW after deleting interview
      try {
        console.log("🔄 Updating candidate status to NEW after interview deletion");
        const updateStatusResponse = await fetch(`${baseURL}/api/candidates/${candidate.id}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${authToken}`,
          },
          body: JSON.stringify({
            status: "NEW"
          }),
        });
        
        if (updateStatusResponse.ok) {
          console.log("✅ Candidate status updated to NEW");
        } else {
          console.warn("⚠️ Failed to update candidate status to NEW");
        }
      } catch (statusError) {
        console.warn("⚠️ Error updating candidate status:", statusError);
      }
      
      notify.success("Interview deleted and slot released successfully!");
      
      // Refresh data
      fetchInterviews();
      dispatch(fetchCandidates());
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteType(null);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting interview:", error);
      notify.error(error.message || "Failed to delete interview");
    }
  };



  useEffect(() => {
    if (candidatesStatus === "idle") {
      dispatch(fetchCandidates());
    }
    if (jobsStatus === "idle") {
      dispatch(fetchJobs());
    }
  }, [candidatesStatus, jobsStatus, dispatch]);

  useEffect(() => {
    if (candidatesStatus === "succeeded" && allCandidates) {
      const foundCandidate = allCandidates.find((c) => String(c.id) === id);
      setCandidate(foundCandidate);
      setLoading(false);
    } else if (candidatesStatus === "failed") {
      setLoading(false);
    }
  }, [id, candidatesStatus, allCandidates]);

  // Additional effect to update candidate when allCandidates changes (for status updates)
  useEffect(() => {
    if (allCandidates && candidate?.id) {
      const updatedCandidate = allCandidates.find((c) => String(c.id) === candidate.id);
      if (updatedCandidate && (
        updatedCandidate.status !== candidate.status ||
        updatedCandidate.last_updated !== candidate.last_updated
      )) {
        console.log("Updating candidate from allCandidates:", {
          oldStatus: candidate.status,
          newStatus: updatedCandidate.status,
          oldLastUpdated: candidate.last_updated,
          newLastUpdated: updatedCandidate.last_updated
        });
        setCandidate(updatedCandidate);
      }
    }
  }, [allCandidates, candidate?.id]);

  useEffect(() => {
    if (candidate) {
      fetchInterviews();
    }
  }, [candidate]);

  // Handle evaluation submission
  const handleEvaluationSubmit = async (evaluationData) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      notify.error("Authentication token not found. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/evaluations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          ...evaluationData,
          candidate: candidate.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the data with a slight delay to ensure backend processing is complete
      setTimeout(async () => {
        await fetchInterviews();
      }, 1000);
      setShowStatusModal(false);
      notify.success("Evaluation submitted successfully!");
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      notify.error(
        error.message || "Failed to submit evaluation. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="candidate-details-layout loading-container">
        <BeatLoader color="var(--color-primary-dark)" />
        <p>Loading candidate details...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="candidate-not-found-container">
        <p>Candidate not found.</p>
        <button
          className="back-to-candidates-btn"
          onClick={() => navigate("/candidates")}
        >
          Go to Candidates List
        </button>
      </div>
    );
  }

  const currentStatus = getCurrentStatus();

  // Don't show actions if candidate is hired or rejected
  const shouldShowActions = currentStatus !== "HIRED" && currentStatus !== "REJECTED";

  return (
    <>
      <div className={`candidate-details-layout ${showStatusModal ? 'blur-background' : ''}`}>
      <div className="candidate-details-left-panel" style={{ paddingBottom: '50px' }}>
        <div className="candidate-details-content card">
          <div className="candidate-main-layout">
            <div className="candidate-info-section">
          <div className="back-button-container">
            <button className="back-button" onClick={() => navigate(-1)}>
              <FiChevronLeft size={24} /> Back
            </button>
          </div>
              
            <h1 className="candidate-name-display">
              {candidate.name || "N/A"}
            </h1>
              
          <div className="details-grid">
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{candidate.email || "N/A"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">{candidate.phone || "N/A"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Job Title:</span>
              <span className="detail-value">
                {getJobTitle(candidate.jobRole) || "N/A"}
              </span>
            </div>
              </div>
            </div>
            
            {/* Hire Recommendation - Right side */}
            {interviews.some((i) => i.ai_result) && (() => {
              const aiResult = interviews.find(i => i.ai_result)?.ai_result;
              const overallScorePercent = ((aiResult?.total_score || 0) / 10) * 100;
              const radialData = [
                {
                  name: 'Score',
                  value: overallScorePercent,
                  fill: overallScorePercent >= 80 ? '#10b981' : overallScorePercent >= 60 ? '#f59e0b' : '#ef4444',
                },
              ];

              return (
                <div className="hire-recommendation-section">
                  <div className="hire-recommendation-card">
                    {/* Overall Score Title */}
                    <h3 className="chart-title" style={{ textAlign: 'center' }}>Overall Score</h3>
                    {/* Overall Score Radial Chart */}
                    <div style={{ marginBottom: '1rem' }}>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadialBarChart
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="90%"
                          data={radialData}
                          startAngle={180}
                          endAngle={0}
                        >
                          <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            fill={radialData[0].fill}
                          />
                          <text
                            x="50%"
                            y="45%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="28"
                            fontWeight="bold"
                            fill={radialData[0].fill}
                          >
                            {aiResult?.total_score?.toFixed(1) || '0'}/10
                          </text>
                          <text
                            x="50%"
                            y="65%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="12"
                            fill="#666"
                          >
                            {overallScorePercent.toFixed(0)}%
                          </text>
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Hire Recommendation */}
                    <div className="hire-recommendation-row">
                      <span className={`value recommendation ${aiResult?.hire_recommendation ? "recommended" : "not-recommended"}`}>
                        {aiResult?.hire_recommendation ? "RECOMMENDED" : "NOT RECOMMENDED"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <hr className="details-divider" />
          <h3>POC Details</h3>
          <div className="poc-details-section">
            <p>
              <strong>POC Email:</strong> {candidate.poc || "N/A"}
            </p>
          </div>
        </div>

        {/* Evaluation Section - Moved here */}
        <div className="evaluation-section card">
          {/* AI Results Section with Interactive Charts */}
          {interviews.some((i) => i.ai_result) && (
            <div className="evaluation-info">
              {interviews
                .filter((i) => i.ai_result)
                .map((interview) => (
                  <div key={interview.id} className="evaluation-item">
                    <div className="evaluation-header">
                      <h4>AI Evaluation Results</h4>
                      <span className={`overall-rating ${interview.ai_result.overall_rating?.toLowerCase() || "pending"}`}>
                        {interview.ai_result.overall_rating?.toUpperCase() || "PENDING"}
                      </span>
                    </div>
                    
                    {/* Interactive Charts Visualization */}
                    <AIEvaluationCharts aiResult={interview.ai_result} />
                    
                    {/* Coding Details (if available) */}
                    {interview.ai_result.coding_details && (() => {
                      const codingDetails = parseJsonField(interview.ai_result.coding_details);
                      return codingDetails.length > 0 && (
                        <div className="coding-details">
                          <strong>Coding Questions:</strong>
                          {codingDetails.map((coding, index) => (
                            <div key={index} className="coding-question">
                              <h4>Question {index + 1}</h4>
                              <p><strong>Question:</strong> {coding.question_text}</p>
                              <p><strong>Language:</strong> {coding.language}</p>
                              <p><strong>Status:</strong> 
                                <span className={`test-status ${coding.passed_all_tests ? 'passed' : 'failed'}`}>
                                  {coding.passed_all_tests ? '✅ PASSED' : '❌ FAILED'}
                                </span>
                              </p>
                              <div className="code-block">
                                <strong>Submitted Code:</strong>
                                <pre><code>{coding.submitted_code}</code></pre>
                              </div>
                              {coding.output_log && (
                                <div className="output-log">
                                  <strong>Test Results:</strong>
                                  <pre>{coding.output_log}</pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    
                    <div className="evaluation-metadata">
                      <p><strong>Evaluated on:</strong> {new Date(interview.created_at).toLocaleDateString() + ' ' + new Date(interview.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Separator between AI and Manual evaluations */}
          {interviews.some((i) => i.ai_result) && interviews.some((i) => i.evaluation) && (
            <hr style={{ margin: '20px 0', border: '1px solid #e0e0e0' }} />
          )}

          {/* Manual Evaluation Section */}
          {interviews.some((i) => i.evaluation) && (
            <div className="evaluation-info">
              <div className="evaluation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>Manual Evaluation Results</h4>
                {interviews
                  .filter((i) => i.evaluation)
                  .map((interview) => (
                    <span key={interview.id} className={`overall-rating ${interview.evaluation.overall_score >= 8 ? "excellent" : interview.evaluation.overall_score >= 6 ? "good" : interview.evaluation.overall_score >= 4 ? "fair" : "poor"}`}>
                      {interview.evaluation.overall_score >= 8 ? "EXCELLENT" : interview.evaluation.overall_score >= 6 ? "GOOD" : interview.evaluation.overall_score >= 4 ? "FAIR" : "POOR"}
                    </span>
                  ))}
                  </div>
              {interviews
                .filter((i) => i.evaluation)
                .map((interview) => (
                  <div key={interview.id}>
                  
                  {/* Score as simple text */}
                  <div className="evaluation-score-simple">
                    <p><strong>Score:</strong> <span className="score-number">{interview.evaluation.overall_score?.toFixed(1) || "N/A"}/10</span></p>
                  </div>
                  
                  {interview.evaluation.traits && (
                    <div className="traits">
                      <strong>Key Traits:</strong>
                      <p>{interview.evaluation.traits}</p>
                    </div>
                  )}
                  
                  {interview.evaluation.suggestions && (
                    <div className="suggestions">
                      <strong>Suggestions:</strong>
                      <p>{interview.evaluation.suggestions}</p>
                    </div>
                  )}
                  
                  <div className="evaluation-metadata">
                    <p><strong>Evaluated on:</strong> {new Date(interview.evaluation.created_at).toLocaleDateString() + ' ' + new Date(interview.evaluation.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}</p>
                  </div>
                  
                  {/* Evaluation Action Buttons */}
                    <div className="evaluation-actions-container" style={{ marginTop: '-10px' }}>
                    <div className="evaluation-actions">
                      <button 
                        className="edit-evaluation-btn" 
                        onClick={() => handleEditEvaluation(interview.evaluation)}
                        title="Edit Evaluation"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                      <button 
                        className="delete-evaluation-btn" 
                        onClick={() => handleDeleteEvaluation(interview.evaluation)}
                        title="Delete Evaluation"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6"></polyline>
                          <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                ))}
            </div>
          )}

          {/* No Evaluation Message */}
          {!interviews.some((i) => i.ai_result) && !interviews.some((i) => i.evaluation) && (
            <p className="no-data">{`${
              currentStatus === "INTERVIEW_COMPLETED"
                ? "Evaluation in progress..."
                : "No evaluation available"
            }`}</p>
          )}
        </div>
      </div>

      <div className="candidate-details-right-panel">
        <div className="status-card">
          <div className="status-header">
            <h3>Status</h3>
            <span className={`status-badge ${currentStatus.toLowerCase()}`}>
              {currentStatus.replace(/_/g, " ")}
            </span>
          </div>

          <div className="status-progress-bar">
            {(() => {
              // Always show both evaluation steps in sequence
              const statusStages = [
                "NEW",
                "INTERVIEW_SCHEDULED",
                "INTERVIEW_COMPLETED",
                "AI_EVALUATED",
                "MANUAL_EVALUATED",
                "HIRE",
              ];

              const statusLabels = [
                "New",
                "Schedule Interview",
                "Interview Completed",
                "AI Evaluated",
                "Manual Evaluated",
                "Hire",
              ];

              // Handle special status "AI_MANUAL_EVALUATED" which means both evaluations are done
              let effectiveCurrentStatus = currentStatus;
              let effectiveCurrentIndex = statusStages.indexOf(currentStatus);
              
              // If status is AI_MANUAL_EVALUATED, treat it as MANUAL_EVALUATED for progress calculation
              if (currentStatus === "AI_MANUAL_EVALUATED") {
                effectiveCurrentStatus = "MANUAL_EVALUATED";
                effectiveCurrentIndex = statusStages.indexOf("MANUAL_EVALUATED");
              }
              
              // If still not found, check for HIRED or REJECTED
              if (effectiveCurrentIndex === -1) {
                if (currentStatus === "HIRED" || currentStatus === "REJECTED") {
                  effectiveCurrentIndex = statusStages.length - 1; // Last step (HIRE)
                }
              }
              
              const nextAction = getNextAction(effectiveCurrentStatus);
              
              // Debug: Log current status and next action
              console.log('[Status Progress] Original Status:', currentStatus);
              console.log('[Status Progress] Effective Status:', effectiveCurrentStatus);
              console.log('[Status Progress] Effective Current Index:', effectiveCurrentIndex);
              console.log('[Status Progress] Next Action:', nextAction);

              return statusLabels.map((label, index) => {
                const stage = statusStages[index];
                
                // Status step logic
                let isCompleted = false;
                let isCurrent = false;
                let isNextAction = false;
                let isClickable = false;
                let isRecommended = false;
                let displayLabel = label;
                
                if (stage === "HIRE") {
                  // Special handling for the hire step
                  if (currentStatus === "HIRED" || currentStatus === "REJECTED") {
                    // If candidate is hired or rejected, show the final status
                    displayLabel = currentStatus === "HIRED" ? "Hired" : "Rejected";
                    isCompleted = true;
                    isCurrent = true;
                    isClickable = false;
                    isRecommended = false;
                  } else {
                    // Show "Hire" as the next action if we're at MANUAL_EVALUATED or AI_MANUAL_EVALUATED
                    // Check if previous step (MANUAL_EVALUATED) is completed
                    const manualEvalIndex = statusStages.indexOf("MANUAL_EVALUATED");
                    const manualEvalCompleted = effectiveCurrentIndex > manualEvalIndex || 
                                                  effectiveCurrentIndex === manualEvalIndex ||
                                                  currentStatus === "AI_MANUAL_EVALUATED";
                    
                    isNextAction = nextAction && nextAction.status === "HIRE";
                    isCompleted = false; // Never completed unless hired/rejected
                    isCurrent = false; // Never current unless hired/rejected
                    isClickable = isNextAction && manualEvalCompleted;
                    // Only recommend if it's the next action and manual evaluation is done
                    isRecommended = isNextAction && !isCompleted && !isCurrent && manualEvalCompleted;
                  }
                } else {
                  // Regular status steps
                  // First determine if this step is completed (all steps before current should be completed)
                  isCompleted = index < effectiveCurrentIndex;
                  isCurrent = index === effectiveCurrentIndex;
                  isNextAction = nextAction && statusStages[index] === nextAction.status;
                  
                  // Additional checks for completion based on actual data
                  if (stage === "INTERVIEW_COMPLETED") {
                    // Check if any interview is actually completed
                    const hasCompletedInterview = interviews.some((i) => i.status?.toLowerCase() === 'completed');
                    if (hasCompletedInterview && index <= effectiveCurrentIndex) {
                      isCompleted = true;
                      isCurrent = false;
                    }
                  } else if (stage === "INTERVIEW_SCHEDULED") {
                    // Check if any interview is scheduled
                    const hasScheduledInterview = interviews.some((i) => i.status?.toLowerCase() === 'scheduled');
                    if (hasScheduledInterview && index < effectiveCurrentIndex) {
                      isCompleted = true;
                      isCurrent = false;
                    }
                  } else if (stage === "AI_EVALUATED") {
                    const hasAIEvaluation = interviews.some((i) => i.ai_result);
                    if (hasAIEvaluation) {
                      // If AI evaluation exists and we're at or past this stage, mark as completed
                      if (effectiveCurrentIndex >= index || currentStatus === "AI_MANUAL_EVALUATED") {
                        isCompleted = true;
                        isCurrent = false;
                      }
                      isClickable = false; // AI evaluation is not clickable
                    } else {
                      isClickable = false; // AI evaluation is never clickable
                      // Only show as incomplete if no AI results AND we're past this stage
                      if (effectiveCurrentIndex > index) {
                        isCompleted = false;
                      }
                    }
                  } else if (stage === "MANUAL_EVALUATED") {
                    // Check if manual evaluation exists
                    const hasManualEvaluation = interviews.some((i) => i.evaluation);
                    // If currentStatus is AI_MANUAL_EVALUATED, Manual is the current step (both AI and Manual done)
                    if (currentStatus === "AI_MANUAL_EVALUATED") {
                      isCompleted = false; // Not completed, it's current
                      isCurrent = true; // This is the current step
                      isClickable = false; // Can't click current step
                    } else if (hasManualEvaluation && index < effectiveCurrentIndex) {
                      isCompleted = true;
                      isCurrent = false;
                    } else if (hasManualEvaluation && index === effectiveCurrentIndex) {
                      isCompleted = false;
                      isCurrent = true;
                      isClickable = false;
                    }
                    // Manual evaluation is clickable only as next action, not if it's current
                    if (!isCurrent) {
                      isClickable = isNextAction || isCompleted;
                    }
                  } else {
                    isClickable = isNextAction || isCompleted;
                  }
                  
                  // Mark as recommended ONLY if it's the next action AND NOT completed AND NOT current AND is clickable
                  // This ensures the next clickable step is purple
                  isRecommended = isNextAction && !isCompleted && !isCurrent && isClickable;
                }
                
                // Debug log for each step (before finalClassName is defined)
                // console.log(`[Status Step ${index + 1}] ${stage}:`, {
                //   isCompleted,
                //   isCurrent,
                //   isRecommended,
                //   isNextAction,
                //   isClickable,
                //   effectiveCurrentIndex
                // });

                // Determine additional CSS classes based on status
                let additionalClasses = "";
                if (stage === "HIRE") {
                  if (currentStatus === "HIRED") {
                    additionalClasses = "hired";
                  } else if (currentStatus === "REJECTED") {
                    additionalClasses = "rejected";
                  }
                }

                // Determine final classes - recommended should override completed/current for styling
                // Priority: recommended > current > completed
                let classNames = ["status-step"];
                
                // Only add recommended if it's truly the next step and not completed/current
                if (isRecommended) {
                  classNames.push("recommended");
                  // Don't add completed or current if recommended
                } else {
                  // Add current or completed only if not recommended
                  if (isCurrent) {
                    classNames.push("current");
                  } else if (isCompleted) {
                    classNames.push("completed");
                  }
                }
                
                if (isClickable) {
                  classNames.push("clickable");
                }
                
                if (additionalClasses) {
                  classNames.push(additionalClasses);
                }
                
                const finalClassName = classNames.join(" ").trim();
                
                // Debug: Log final class name for troubleshooting
                // if (isRecommended || isCurrent || (isCompleted && index >= 3)) {
                //   console.log(`[Status Step ${index + 1}] ${stage} - Final classes:`, finalClassName, {
                //     isCompleted,
                //     isCurrent,
                //     isRecommended,
                //     isClickable
                //   });
                // }
                
                return (
                  <div
                    key={stage}
                    className={finalClassName}
                    data-completed={isCompleted}
                    data-current={isCurrent}
                    data-recommended={isRecommended}
                    data-clickable={isClickable}
                    onClick={() => {
                      if (!isClickable || !shouldShowActions) return;

                      if (stage === "INTERVIEW_SCHEDULED") {
                        handleStatusUpdate("schedule_interview");
                      } else if (stage === "INTERVIEW_COMPLETED") {
                        handleStatusUpdate("complete_interview");
                      } else if (stage === "AI_EVALUATED") {
                        // AI evaluation is not clickable - handled automatically
                        return;
                      } else if (stage === "MANUAL_EVALUATED") {
                        handleStatusUpdate("manual_evaluate");
                      } else if (stage === "HIRE") {
                        handleStatusUpdate("hire_reject");
                      } else if (isCompleted) {
                        const next = getNextAction(stage);
                        if (next) {
                          handleStatusUpdate(next.id);
                        }
                      }
                    }}
                  >
                    <div className="status-circle">{index + 1}</div>
                    <div className="status-label">{displayLabel}</div>
                    {index < statusStages.length - 1 && (
                      <div className="status-connector"></div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="interview-section">
          {interviewsLoading ? (
            <BeatLoader color="var(--color-primary-dark)" size={8} />
          ) : interviews.length > 0 ? (
            interviews.map((interview) => (
              <div key={interview.id} style={{ marginBottom: '2rem' }}>
              <div className="card">
                <div className="interview-header">
                  <h4>Interview Details - Round {interview.interview_round}</h4>
                  <span className={`interview-status ${interview.status.toLowerCase()}`}>
                    {interview.status}
                  </span>
                </div>
                
                <div className="interview-basic-info">
                  <p>
                    <strong>Date:</strong>{" "}
                    {interview.started_at
                      ? new Date(interview.started_at).toLocaleDateString()
                      : "TBD"}
                  </p>
                  <p>
                    <strong>Slot:</strong>{" "}
                    {(() => {
                      console.log("=== CANDIDATE DETAILS DEBUG ===");
                      console.log("Candidate ID:", candidate.id);
                      console.log("Candidate Name:", candidate.full_name);
                      console.log("Interview ID:", interview.id);
                      console.log("Full interview object:", interview);
                      console.log("Interview slot_details:", interview.slot_details);
                      console.log("Interview schedule:", interview.schedule);
                      console.log("Interview started_at:", interview.started_at);
                      console.log("Interview ended_at:", interview.ended_at);
                      
                      // Try different possible field names
                      const slotData = interview.slot_details || interview.schedule || interview.slot;
                      console.log("Slot data found:", slotData);
                      
                      // Also check if we can get slot data from the candidate's interviews
                      console.log("All candidate interviews:", candidate.interviews);
                      console.log("Current interview index:", interviews.findIndex(i => i.id === interview.id));
                      
                      // Check if there's a schedule relationship
                      if (interview.schedule) {
                        console.log("Interview schedule details:", interview.schedule);
                        if (interview.schedule.slot) {
                          console.log("Schedule slot details:", interview.schedule.slot);
                        }
                      }
                      
                      if (slotData && slotData.start_time && slotData.end_time) {
                        try {
                          console.log("Raw slot start_time:", slotData.start_time);
                          console.log("Raw slot end_time:", slotData.end_time);
                          
                          // Handle time strings using the same approach as AI Interview Scheduler
                          if (typeof slotData.start_time === 'string' && slotData.start_time.includes(':')) {
                            console.log("Time string parsing (AI Interview Scheduler method):");
                            console.log("  Start time string:", slotData.start_time);
                            console.log("  End time string:", slotData.end_time);
                            
                            // Use shared time formatting utility
                            const formatTime = (timeStr) => {
                              console.log("Formatting time string:", timeStr);
                              const result = formatTimeTo12Hour(timeStr);
                              console.log("Formatted time result:", result);
                              return result;
                            };
                            
                            const startTimeFormatted = formatTime(slotData.start_time);
                            const endTimeFormatted = formatTime(slotData.end_time);
                            
                            console.log("  Formatted start time:", startTimeFormatted);
                            console.log("  Formatted end time:", endTimeFormatted);
                            
                            return `${startTimeFormatted} - ${endTimeFormatted}`;
                          } else if (typeof slotData.start_time === 'string' && slotData.start_time.includes('T')) {
                            // Handle datetime format (e.g., "2025-09-23T09:30:00")
                            const startTime = new Date(slotData.start_time);
                            const endTime = new Date(slotData.end_time);
                            
                            console.log("Datetime string parsing:");
                            console.log("  Start datetime string:", slotData.start_time, "→", startTime);
                            console.log("  End datetime string:", slotData.end_time, "→", endTime);
                            
                            return `${startTime.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })} - ${endTime.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}`;
                          } else {
                            // Fallback for other formats
                            console.log("Unknown time format, using fallback");
                            return "Invalid time format";
                          }
                        } catch (error) {
                          console.error("Error formatting slot time:", error);
                          return "Invalid time format";
                        }
                      }
                      
                      // Fallback to started_at and ended_at if available
                      if (interview.started_at && interview.ended_at) {
                        try {
                          return `${new Date(interview.started_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })} - ${new Date(interview.ended_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}`;
                        } catch (error) {
                          console.error("Error formatting interview time:", error);
                          return "Invalid time format";
                        }
                      }
                      
                      return "N/A";
                    })()}
                  </p>
                </div>
                
                {/* Interview Action Buttons - Only show for scheduled interviews */}
                {interview.status?.toLowerCase() === 'scheduled' && (
                  <div className="interview-actions-container">
                    <div className="interview-actions">
                      <button 
                        className="edit-interview-btn" 
                        onClick={() => handleEditInterview(interview)}
                        title="Edit Interview"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                      <button 
                        className="delete-interview-btn" 
                        onClick={() => handleDeleteInterview(interview)}
                        title="Delete Interview"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6"></polyline>
                          <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Video Recording Section */}
                {interview.ai_result?.recording_video && (
                  <div className="recording-section">
                    <h4>Interview Recording</h4>
                    <div className="video-player-container">
                      <video
                        controls
                        className="video-player"
                        preload="metadata"
                      >
                        <source src={`${baseURL}${interview.ai_result.recording_video}`} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    {interview.ai_result.recording_created_at && (
                      <p className="recording-metadata">
                        <strong>Recorded:</strong>{" "}
                        {new Date(interview.ai_result.recording_created_at).toLocaleDateString() + ' ' + new Date(interview.ai_result.recording_created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    )}
                  </div>
                )}
                
              </div>
              
              {/* Questions and Answers Card - Separate Card Below Interview Details */}
              {qaData && qaData[interview.id] && Array.isArray(qaData[interview.id]) && qaData[interview.id].length > 0 && (
                <div className="qa-section card" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ 
                    marginTop: 0, 
                    marginBottom: '1rem', 
                    fontSize: '1.1rem', 
                    fontWeight: '600',
                    color: 'var(--color-text)',
                    paddingBottom: '0.75rem',
                    borderBottom: '2px solid var(--color-border-light)'
                  }}>
                    Questions & Answers - Round {interview.interview_round}
                  </h3>
                  <div className="qa-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {qaData[interview.id].map((qa, index) => (
                      <div 
                        key={index} 
                        className="qa-item" 
                        style={{
                          padding: '1rem',
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border-light)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          marginBottom: '0.75rem'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {qa.questionIndex}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: qa.questionType === 'technical' ? '#dbeafe' : 
                                           qa.questionType === 'behavioral' ? '#fef3c7' : 
                                           qa.questionType === 'coding' ? '#e0e7ff' : '#f3e8ff',
                            color: qa.questionType === 'technical' ? '#1e40af' : 
                                  qa.questionType === 'behavioral' ? '#92400e' : 
                                  qa.questionType === 'coding' ? '#3730a3' : '#6b21a8',
                            textTransform: 'capitalize'
                          }}>
                            {qa.questionType}
                          </span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ 
                            margin: 0, 
                            fontWeight: '600', 
                            color: 'var(--color-text)',
                            fontSize: '0.95rem',
                            marginBottom: '0.5rem'
                          }}>
                            Q: {qa.question}
                          </p>
                          <p style={{ 
                            margin: 0, 
                            color: '#666',
                            fontSize: '0.9rem',
                            lineHeight: '1.5',
                            paddingLeft: '1rem',
                            borderLeft: '3px solid var(--color-primary)'
                          }}>
                            A: {qa.answer}
                          </p>
                        </div>
                        {qa.responseTime && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#999',
                            marginTop: '0.5rem',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid var(--color-border-light)'
                          }}>
                            Answered: {new Date(qa.responseTime).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            ))
          ) : (
            <p className="no-data">No interviews scheduled</p>
          )}
        </div>
      </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <StatusUpdateModal
          isOpen={showStatusModal}
          onClose={handleModalClose}
          onUpdateStatus={() => {
            // Refresh candidate data when status is updated
            dispatch(fetchCandidates());
          }}
          action={selectedAction}
          candidate={candidate}
          interviews={interviews}
          onSubmitEvaluation={handleEvaluationSubmit}
          onInterviewScheduled={() => {
            // Refresh both interview data and candidate data when interview is scheduled
            fetchInterviews();
            dispatch(fetchCandidates());
          }}
          onEvaluationSubmitted={() => {
            // Refresh both interview data and candidate data when evaluation is submitted
            fetchInterviews();
            dispatch(fetchCandidates());
          }}
        />
      )}

      {/* Edit Interview Modal */}
      {showEditInterviewModal && editingInterview && (
        <StatusUpdateModal
          isOpen={showEditInterviewModal}
          onClose={() => {
            setShowEditInterviewModal(false);
            setEditingInterview(null);
            fetchInterviews();
            dispatch(fetchCandidates());
          }}
          action="schedule_interview"
          candidate={candidate}
          interviews={interviews}
          isEditMode={true}
          editingInterview={editingInterview}
        />
      )}

      {/* Edit Evaluation Modal */}
      {showEditEvaluationModal && editingEvaluation && (
        <StatusUpdateModal
          isOpen={showEditEvaluationModal}
          onClose={() => {
            setShowEditEvaluationModal(false);
            setEditingEvaluation(null);
            fetchInterviews();
            dispatch(fetchCandidates());
          }}
          action="evaluate"
          candidate={candidate}
          interviews={interviews}
          isEditMode={true}
          editingEvaluation={editingEvaluation}
        />
      )}

      {/* Delete Confirmation Modal - Matching DataTable Style */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{deleteType === 'interview' ? "Delete Interview" : "Delete Evaluation"}</h3>
            <p>
              {deleteType === 'interview' 
                ? "Are you sure you want to delete this interview? This will also release the slot and cannot be undone."
                : "Are you sure you want to delete this evaluation? This action cannot be undone."
              }
            </p>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteType(null);
                  setItemToDelete(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={deleteType === 'interview' ? confirmDeleteInterview : confirmDeleteEvaluation} 
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CandidateDetails;
