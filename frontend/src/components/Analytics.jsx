// Analytics.jsx
import React, { useState, useEffect } from "react";
import { baseURL } from "../data";
import { useNotification } from "../hooks/useNotification";
import BeatLoader from "react-spinners/BeatLoader";
import jsPDF from "jspdf";
import { FiArrowUp, FiArrowDown, FiMinimize2 } from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import "./Analytics.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const notify = useNotification();
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("none"); // none, asc, desc

  // Get auth token from localStorage when component mounts
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setAuthToken(token);
    } else {
      notify.error("Authentication token not found. Please log in again.");
    }
  }, [notify]);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    if (!authToken) return;

    setLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/dashboard/analytics/summary/`, {
        method: "GET",
        headers: {
          Authorization: `Token ${authToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      notify.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchAnalyticsData();
    }
  }, [authToken]);

  // Common headers for API calls
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Token ${authToken}`,
  });

  // Export to CSV
  const exportToCSV = () => {
    if (!analyticsData) {
      notify.error("No data to export");
      return;
    }

    try {
      // Create CSV content
      let csvContent = "Analytics Report\n\n";
      
      // Summary data
      csvContent += "Summary\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Candidates,${analyticsData.total_candidates}\n`;
      csvContent += `Total Interviews,${analyticsData.total_interviews}\n`;
      csvContent += `Hired Candidates,${analyticsData.hired_candidates}\n`;
      csvContent += `Rejected Candidates,${analyticsData.rejected_candidates}\n\n`;
      
      // Top 5 Agencies
      if (analyticsData.top_5_agencies && analyticsData.top_5_agencies.length > 0) {
        csvContent += "Top 5 Hiring Agencies\n";
        csvContent += "Rank,Agency Name,Recruiter,Profiles Uploaded,Selected,Rejected,Selection Rate\n";
        analyticsData.top_5_agencies.forEach((agency, index) => {
          csvContent += `${index + 1},"${agency.agency_name}","${agency.recruiter_name}",${agency.uploaded_profiles},${agency.selected_profiles},${agency.rejected_profiles},${agency.selection_rate.toFixed(1)}%\n`;
        });
        csvContent += "\n";
      }
      
      // All Agencies
      if (analyticsData.all_agencies && analyticsData.all_agencies.length > 0) {
        csvContent += "All Hiring Agency Statistics\n";
        csvContent += "Agency Name,Recruiter,Profiles Uploaded,Selected,Rejected,Interviews Scheduled,Interviews Selected,Interviews Rejected,Selection Rate\n";
        analyticsData.all_agencies.forEach(agency => {
          csvContent += `"${agency.agency_name}","${agency.recruiter_name}",${agency.uploaded_profiles},${agency.selected_profiles},${agency.rejected_profiles},${agency.interviews_scheduled},${agency.interviews_selected},${agency.interviews_rejected},${agency.selection_rate.toFixed(1)}%\n`;
        });
      }
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      notify.success("CSV file downloaded successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      notify.error("Failed to export CSV");
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!analyticsData) {
      notify.error("No data to export");
      return;
    }

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text("Analytics Report", 20, yPos);
      yPos += 10;

      // Date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPos);
      yPos += 15;

      // Summary Section
      doc.setFontSize(14);
      doc.text("Summary", 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text(`Total Candidates: ${analyticsData.total_candidates}`, 30, yPos);
      yPos += 7;
      doc.text(`Total Interviews: ${analyticsData.total_interviews}`, 30, yPos);
      yPos += 7;
      doc.text(`Hired Candidates: ${analyticsData.hired_candidates}`, 30, yPos);
      yPos += 7;
      doc.text(`Rejected Candidates: ${analyticsData.rejected_candidates}`, 30, yPos);
      yPos += 15;

      // Top 5 Agencies Section
      if (analyticsData.top_5_agencies && analyticsData.top_5_agencies.length > 0) {
        doc.setFontSize(14);
        doc.text("Top 5 Hiring Agencies", 20, yPos);
        yPos += 10;

        doc.setFontSize(9);
        let tableData = analyticsData.top_5_agencies.map((agency, index) => [
          index + 1,
          agency.agency_name.substring(0, 25),
          agency.uploaded_profiles,
          agency.selected_profiles,
          agency.rejected_profiles,
          `${agency.selection_rate.toFixed(1)}%`
        ]);

        // Simple table
        const startX = 20;
        doc.text("Rank", startX, yPos);
        doc.text("Agency Name", startX + 15, yPos);
        doc.text("Uploaded", startX + 60, yPos);
        doc.text("Selected", startX + 80, yPos);
        doc.text("Rejected", startX + 100, yPos);
        doc.text("Rate", startX + 120, yPos);
        yPos += 7;

        doc.setFontSize(8);
        tableData.forEach(row => {
          doc.text(row[0].toString(), startX, yPos);
          doc.text(row[1], startX + 15, yPos);
          doc.text(row[2].toString(), startX + 60, yPos);
          doc.text(row[3].toString(), startX + 80, yPos);
          doc.text(row[4].toString(), startX + 100, yPos);
          doc.text(row[5], startX + 120, yPos);
          yPos += 6;
        });

        yPos += 10;
      }

      // Add new page if needed
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // All Agencies Section
      if (analyticsData.all_agencies && analyticsData.all_agencies.length > 0) {
        doc.setFontSize(14);
        doc.text("All Hiring Agency Statistics", 20, yPos);
        yPos += 10;

        doc.setFontSize(8);
        let agencyIndex = 0;
        analyticsData.all_agencies.forEach((agency) => {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(10);
          doc.text(agency.agency_name, 20, yPos);
          yPos += 7;

          doc.setFontSize(9);
          doc.text(`  Recruiter: ${agency.recruiter_name}`, 25, yPos);
          yPos += 6;
          doc.text(`  Profiles Uploaded: ${agency.uploaded_profiles}`, 25, yPos);
          yPos += 6;
          doc.text(`  Selected: ${agency.selected_profiles} | Rejected: ${agency.rejected_profiles}`, 25, yPos);
          yPos += 6;
          doc.text(`  Interviews: ${agency.interviews_scheduled} scheduled, ${agency.interviews_selected} selected, ${agency.interviews_rejected} rejected`, 25, yPos);
          yPos += 6;
          doc.text(`  Selection Rate: ${agency.selection_rate.toFixed(1)}%`, 25, yPos);
          yPos += 10;

          agencyIndex++;
        });
      }

      // Save the PDF
      doc.save(`analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
      notify.success("PDF file downloaded successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      notify.error("Failed to export PDF");
    }
  };

  if (loading) {
    return (
      <div className="analytics-container loading-container">
        <BeatLoader color="var(--color-primary-dark)" />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="analytics-container">
        <div className="analytics-error">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  // Handle column sorting with three states: asc -> desc -> none -> asc
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field: asc -> desc -> none
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        // desc -> none (reset to original order)
        setSortDirection("none");
        setSortField(null);
      }
    } else {
      // New field, start with ascending immediately
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort agencies data
  const sortedAgencies = [...(analyticsData.all_agencies || [])].sort((a, b) => {
    if (!sortField || sortDirection === "none") return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle numeric values
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Handle string values
    aValue = String(aValue || "").toLowerCase();
    bValue = String(bValue || "").toLowerCase();

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Get sort icon for a column
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return null; // Don't show icon for other columns
    }
    
    // Show icon based on sort direction
    if (sortDirection === "asc") {
      return <FiArrowUp className="sort-icon active" />;
    } else if (sortDirection === "desc") {
      return <FiArrowDown className="sort-icon active" />;
    } else {
      return null; // Show nothing for "none" state
    }
  };

  // Prepare chart data
  const top5AgenciesNames = analyticsData.top_5_agencies?.map(a => a.agency_name) || [];
  const top5AgenciesUploaded = analyticsData.top_5_agencies?.map(a => a.uploaded_profiles) || [];
  const top5AgenciesSelected = analyticsData.top_5_agencies?.map(a => a.selected_profiles) || [];

  // Bar chart data
  const barChartData = {
    labels: top5AgenciesNames,
    datasets: [
      {
        label: "Profiles Uploaded",
        data: top5AgenciesUploaded,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
      },
      {
        label: "Selected",
        data: top5AgenciesSelected,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 2,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Top 5 Agencies Performance Comparison",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Pie chart data for status distribution
  const pieChartData = {
    labels: ["Hired", "Rejected", "Others"],
    datasets: [
      {
        data: [
          analyticsData.hired_candidates || 0,
          analyticsData.rejected_candidates || 0,
          (analyticsData.total_candidates || 0) - (analyticsData.hired_candidates || 0) - (analyticsData.rejected_candidates || 0),
        ],
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(255, 206, 86, 0.6)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(255, 206, 86, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Candidate Status Distribution",
      },
    },
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="analytics-actions">
          <button 
            className="btn btn-export-pdf" 
            onClick={exportToPDF}
          >
            Export PDF
          </button>
          <button 
            className="btn btn-export-csv" 
            onClick={exportToCSV}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="analytics-content">
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Total Candidates</h3>
            <p className="summary-value">{analyticsData.total_candidates || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Total Interviews</h3>
            <p className="summary-value">{analyticsData.total_interviews || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Hired Candidates</h3>
            <p className="summary-value">{analyticsData.hired_candidates || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Rejected Candidates</h3>
            <p className="summary-value">{analyticsData.rejected_candidates || 0}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-card">
            <div className="chart-container">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-container">
              <Pie data={pieChartData} options={pieChartOptions} />
            </div>
          </div>
        </div>

        {/* All Agencies Table */}
        <div className="table-card">
          <h2>All Hiring Agency Statistics</h2>
          <p className="table-description">Complete breakdown of profiles and interview statistics by hiring agency. Click column headers to sort.</p>
          <div className="table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort("agency_name")}>
                    <span>Agency Name</span>
                    {getSortIcon("agency_name")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("recruiter_name")}>
                    <span>Recruiter</span>
                    {getSortIcon("recruiter_name")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("uploaded_profiles")}>
                    <span>Profiles Uploaded</span>
                    {getSortIcon("uploaded_profiles")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("selected_profiles")}>
                    <span>Selected</span>
                    {getSortIcon("selected_profiles")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("rejected_profiles")}>
                    <span>Rejected</span>
                    {getSortIcon("rejected_profiles")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("interviews_scheduled")}>
                    <span>Interviews Scheduled</span>
                    {getSortIcon("interviews_scheduled")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("interviews_selected")}>
                    <span>Interviews Selected</span>
                    {getSortIcon("interviews_selected")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("interviews_rejected")}>
                    <span>Interviews Rejected</span>
                    {getSortIcon("interviews_rejected")}
                  </th>
                  <th className="sortable" onClick={() => handleSort("selection_rate")}>
                    <span>Selection Rate</span>
                    {getSortIcon("selection_rate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAgencies && sortedAgencies.length > 0 ? (
                  sortedAgencies.map((agency, index) => (
                    <tr key={index}>
                      <td>{agency.agency_name}</td>
                      <td>{agency.recruiter_name}</td>
                      <td>{agency.uploaded_profiles}</td>
                      <td>{agency.selected_profiles}</td>
                      <td>{agency.rejected_profiles}</td>
                      <td>{agency.interviews_scheduled}</td>
                      <td>{agency.interviews_selected}</td>
                      <td>{agency.interviews_rejected}</td>
                      <td>{agency.selection_rate.toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

