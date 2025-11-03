// src/components/Dashboard.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './Dashboard.css';
import { fetchDashboardData } from '../redux/slices/dashboardSlice';
import { isAuthenticated } from '../utils/authUtils';
import CustomizableDashboard from './dashboard/CustomizableDashboard';

const Dashboard = () => {
  const dispatch = useDispatch();
  const dashboardData = useSelector((state) => state.dashboard.dashboardData);
  const loading = useSelector((state) => state.dashboard.status === 'loading');
  const error = useSelector((state) => state.dashboard.error);

  useEffect(() => {
    // Only fetch dashboard data if user is properly authenticated
    const authenticated = isAuthenticated();
    
    if (authenticated && dashboardData === null && !loading && !error) {
      dispatch(fetchDashboardData());
    }
  }, [dispatch, dashboardData, loading, error]);

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  if (!dashboardData && loading) {
     return (
      <div className="dashboard-container is-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="error-container">No dashboard data available.</div>;
  }

  // Use the customizable dashboard
  return <CustomizableDashboard />;
};

export default React.memo(Dashboard);
