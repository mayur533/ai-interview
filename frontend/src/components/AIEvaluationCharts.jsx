// AIEvaluationCharts.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const AIEvaluationCharts = ({ aiResult }) => {
  if (!aiResult) return null;

  // Parse strengths and weaknesses if they're JSON strings
  const parseJsonField = (field) => {
    if (!field) return [];
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return field.split(',').map(s => s.trim());
      }
    }
    return Array.isArray(field) ? field : [];
  };

  const strengths = parseJsonField(aiResult.strengths);
  const weaknesses = parseJsonField(aiResult.weaknesses);

  // Prepare Radar Chart Data (Section Scores)
  const radarData = [
    {
      subject: 'Technical',
      score: aiResult.technical_score || 0,
      fullMark: 10,
    },
    {
      subject: 'Behavioral',
      score: aiResult.behavioral_score || 0,
      fullMark: 10,
    },
    {
      subject: 'Coding',
      score: aiResult.coding_score || 0,
      fullMark: 10,
    },
    {
      subject: 'Communication',
      score: aiResult.communication_score || 0,
      fullMark: 10,
    },
    {
      subject: 'Problem Solving',
      score: aiResult.problem_solving_score || 0,
      fullMark: 10,
    },
  ];

  // Prepare Performance Metrics Bar Chart Data
  const performanceData = [
    {
      name: 'Questions\nAttempted',
      value: aiResult.questions_attempted || 0,
      color: '#3b82f6',
    },
    {
      name: 'Questions\nCorrect',
      value: aiResult.questions_correct || 0,
      color: '#10b981',
    },
    {
      name: 'Accuracy\n(%)',
      value: ((aiResult.questions_correct || 0) / Math.max(aiResult.questions_attempted || 1, 1)) * 100,
      color: '#8b5cf6',
    },
  ];

  // Prepare Time Metrics Data for Area Chart
  const avgResponseTime = aiResult.average_response_time || 0;
  const totalTimeMinutes = parseFloat(((aiResult.completion_time || 0) / 60).toFixed(1));
  
  const timeData = [
    {
      name: 'Avg Response',
      avgTime: avgResponseTime,
      totalTime: totalTimeMinutes,
      color1: '#f59e0b',
      color2: '#ef4444',
    },
  ];

  // Prepare Accuracy Pie Chart Data with vibrant colors
  const accuracyData = [
    {
      name: 'Correct',
      value: aiResult.questions_correct || 0,
      color: '#10b981', // Emerald green
    },
    {
      name: 'Incorrect',
      value: (aiResult.questions_attempted || 0) - (aiResult.questions_correct || 0),
      color: '#ef4444', // Red
    },
  ];
  
  // Alternative color palette for pie chart (you can switch between these)
  const PIE_CHART_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#14b8a6', // Teal
  ];

  // Custom colors for charts
  const COLORS = {
    excellent: '#10b981',
    good: '#3b82f6',
    average: '#f59e0b',
    poor: '#ef4444',
    primary: '#6366f1',
  };

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 8) return COLORS.excellent;
    if (score >= 6) return COLORS.good;
    if (score >= 4) return COLORS.average;
    return COLORS.poor;
  };

  return (
    <div className="ai-evaluation-charts-container">
      <div className="charts-grid">
        {/* Interview Overview Card */}
        <div className="chart-card overall-score-card interview-overview-card">
          <h3 className="chart-title">Interview Overview</h3>
          <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* Total Questions with Icon */}
            <div className="overview-stat-item" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #bae6fd',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              minHeight: '52px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>❓</span>
                <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: '500' }}>Total Questions</span>
              </div>
              <span className="stat-value" style={{ 
                fontWeight: '700', 
                fontSize: '1rem', 
                color: '#0369a1',
                transition: 'transform 0.2s ease'
              }}>
                {aiResult.questions_attempted || 0}
              </span>
            </div>

            {/* Correct Answers with Progress Bar */}
            <div className="overview-stat-item" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #86efac',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              minHeight: '52px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>✅</span>
                  <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: '500' }}>Correct Answers</span>
                </div>
                <span className="stat-value" style={{ 
                  fontWeight: '700', 
                  fontSize: '1rem', 
                  color: '#16a34a',
                  transition: 'transform 0.2s ease'
                }}>
                  {aiResult.questions_correct || 0}
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#bbf7d0', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${((aiResult.questions_correct || 0) / Math.max(aiResult.questions_attempted || 1, 1)) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                  borderRadius: '2px',
                  transition: 'width 0.8s ease',
                  animation: 'slideIn 0.8s ease'
                }}></div>
              </div>
            </div>

            {/* Accuracy with Circular Progress */}
            <div className="overview-stat-item" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
              border: '1px solid #c4b5fd',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              minHeight: '52px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🎯</span>
                <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: '500' }}>Accuracy</span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `conic-gradient(
                    var(--color-primary) ${((aiResult.questions_correct || 0) / Math.max(aiResult.questions_attempted || 1, 1)) * 360}deg,
                    #e9d5ff ${((aiResult.questions_correct || 0) / Math.max(aiResult.questions_attempted || 1, 1)) * 360}deg 360deg
                  )`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.8s ease'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ 
                      fontWeight: '700', 
                      fontSize: '0.65rem', 
                      color: 'var(--color-primary)'
                    }}>
                      {((aiResult.questions_correct || 0) / Math.max(aiResult.questions_attempted || 1, 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <span className="stat-value" style={{ 
                  fontWeight: '600', 
                  fontSize: '0.85rem', 
                  color: 'var(--color-primary)'
                }}>
                  {((aiResult.questions_correct || 0) / Math.max(aiResult.questions_attempted || 1, 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Average Response Time */}
            <div className="overview-stat-item" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fcd34d',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              minHeight: '52px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>⏱️</span>
                <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: '500' }}>Avg Response Time</span>
              </div>
              <span className="stat-value" style={{ 
                fontWeight: '700', 
                fontSize: '0.9rem', 
                color: '#d97706',
                transition: 'transform 0.2s ease'
              }}>
                {aiResult.average_response_time ? `${aiResult.average_response_time.toFixed(1)}s` : 'N/A'}
              </span>
            </div>

            {/* Overall Rating */}
            <div style={{ 
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #bae6fd',
              transition: 'all 0.3s ease',
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>⭐</span>
                <span style={{ color: '#666', fontSize: '0.7rem', fontWeight: '500', marginRight: '0.4rem' }}>Overall Rating:</span>
                <span className={`rating ${(aiResult.overall_rating || 'pending').toLowerCase()}`} style={{ 
                  fontSize: '0.7rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}>
                  {aiResult.overall_rating?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Scores - Horizontal Progress Bars */}
        <div className="chart-card radar-chart-card">
          <h3 className="chart-title" style={{ textAlign: 'left' }}>Section Scores</h3>
          <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {radarData.map((section, index) => {
              const score = section.score;
              const percentage = (score / 10) * 100;
              
              // Determine bar color based on score range
              // Blue for scores 6.0-10.0, Orange for scores below 6.0
              const barColor = score >= 6 ? '#3b82f6' : '#f59e0b'; // Blue or Orange
              
              return (
                <div key={index} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minHeight: '52px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: '0.95rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      {section.subject}
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#6b7280'
                      }}>
                        {percentage.toFixed(0)}%
                      </span>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        {score.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      backgroundColor: barColor,
                      borderRadius: '6px',
                      transition: 'width 0.6s ease',
                      boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1)`
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Metrics - Gauge Cards */}
        <div className="chart-card performance-chart-card">
          <h3 className="chart-title">Performance Metrics</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem 2rem', justifyContent: 'center', alignItems: 'center', alignContent: 'center', padding: '1.5rem 0', minHeight: '250px' }}>
            {performanceData.map((metric, index) => {
              // Calculate percentage for gauge (assuming max values)
              const maxValue = metric.name.includes('Accuracy') ? 100 : (metric.name.includes('Questions Attempted') ? aiResult.questions_attempted || 1 : Math.max(aiResult.questions_attempted || 1, metric.value));
              const percentage = (metric.value / maxValue) * 100;
              const circumference = 2 * Math.PI * 45; // radius = 45
              const strokeDashoffset = circumference - (percentage / 100) * circumference;
              
              return (
                <div key={index} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  minWidth: '120px'
                }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={metric.color}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    </svg>
                    {/* Center text */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: metric.color }}>
                        {metric.name.includes('Accuracy') 
                          ? `${metric.value.toFixed(0)}%` 
                          : Math.round(metric.value)}
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    marginTop: '0.75rem', 
                    fontSize: '0.85rem', 
                    fontWeight: '500',
                    color: '#666',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {metric.name.replace('\n', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Accuracy Pie Chart */}
        <div className="chart-card accuracy-chart-card">
          <h3 className="chart-title">Question Accuracy</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={accuracyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {accuracyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend 
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Numbers below legend */}
          <div className="legend-numbers" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '2rem', 
            marginTop: '10px',
            flexWrap: 'wrap'
          }}>
            {accuracyData.map((entry, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600',
                  color: entry.color 
                }}>
                  {entry.value}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#666',
                  marginTop: '4px'
                }}>
                  {entry.name}
                </div>
              </div>
            ))}
          </div>
          <div className="accuracy-stats">
            <div className="stat-item">
              <span className="stat-label">Total Questions:</span>
              <span className="stat-value">{aiResult.questions_attempted || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accuracy:</span>
              <span className="stat-value">
                {((aiResult.questions_correct || 0) / Math.max(aiResult.questions_attempted || 1, 1) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Time Metrics - Progress Cards */}
        <div className="chart-card time-chart-card">
          <h3 className="chart-title">Time Metrics</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
            {/* Avg Response Time Card */}
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #fcd34d',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⏱️</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#92400e' }}>Average Response Time</span>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#78350f' }}>
                  {avgResponseTime.toFixed(1)}<span style={{ fontSize: '1rem', fontWeight: '500' }}>s</span>
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#fef3c7',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #fcd34d'
              }}>
                <div style={{
                  width: `${Math.min((avgResponseTime / 120) * 100, 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '0.5rem', textAlign: 'right' }}>
                Target: &lt;60s
              </div>
            </div>

            {/* Total Time Card */}
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #fca5a5',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⏰</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#991b1b' }}>Total Completion Time</span>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7f1d1d' }}>
                  {totalTimeMinutes.toFixed(1)}<span style={{ fontSize: '1rem', fontWeight: '500' }}>min</span>
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#fee2e2',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #fca5a5'
              }}>
                <div style={{
                  width: `${Math.min((totalTimeMinutes / 60) * 100, 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#7f1d1d', marginTop: '0.5rem', textAlign: 'right' }}>
                Total: {((aiResult.completion_time || 0) / 60).toFixed(1)} minutes
              </div>
            </div>
          </div>
        </div>

        {/* Section Scores Breakdown */}
        <div className="chart-card section-scores-card">
          <h3 className="chart-title">Detailed Section Scores</h3>
          <div className="section-scores-list">
            {radarData.map((section, index) => {
              const score = section.score;
              const percentage = (score / 10) * 100;
              return (
                <div key={index} className="section-score-item">
                  <div className="section-score-header">
                    <span className="section-name">{section.subject}</span>
                    <span className={`section-value ${percentage >= 80 ? 'high' : percentage >= 60 ? 'medium' : 'low'}`}>
                      {score.toFixed(1)}/10
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: getScoreColor(score),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths and Weaknesses Visualization */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="strengths-weaknesses-container">
          {strengths.length > 0 && (
            <div className="strengths-card">
              <h3 className="section-title">
                <span className="icon">✅</span>
                Strengths
              </h3>
              <div className="tags-container">
                {strengths.map((strength, index) => (
                  <span key={index} className="tag tag-strength">
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="weaknesses-card">
              <h3 className="section-title">
                <span className="icon">🔧</span>
                Areas for Improvement
              </h3>
              <div className="tags-container">
                {weaknesses.map((weakness, index) => (
                  <span key={index} className="tag tag-weakness">
                    {weakness}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary and Recommendations */}
      {(aiResult.ai_summary || aiResult.ai_recommendations) && (
        <div className="ai-text-insights">
          {aiResult.ai_summary && (
            <div className="insight-card">
              <h3 className="insight-title">Summary</h3>
              <p className="insight-text">{aiResult.ai_summary}</p>
            </div>
          )}
          {aiResult.ai_recommendations && (
            <div className="insight-card">
              <h3 className="insight-title">Recommendations</h3>
              <p className="insight-text">{aiResult.ai_recommendations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIEvaluationCharts;

