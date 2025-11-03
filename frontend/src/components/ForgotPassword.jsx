// components/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { baseURL } from '../config/constants';
import { useNotification } from '../hooks/useNotification';
import { FiEye, FiEyeOff, FiMail } from 'react-icons/fi';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: email, 2: OTP + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const notify = useNotification();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email) {
      notify.error('Please enter your email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${baseURL}/api/auth/forgot-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        notify.success('OTP has been sent to your email. Please check your inbox.');
        setStep(2);
      } else {
        notify.error(data.error || 'An error occurred. Please try again.');
      }
    } catch (err) {
      notify.error('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!otp || !newPassword || !confirmPassword) {
      notify.error('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.error('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      notify.error('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${baseURL}/api/auth/reset-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        notify.success('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        notify.error(data.error || 'Invalid OTP or error occurred. Please try again.');
      }
    } catch (err) {
      notify.error('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h2 className="forgot-password-title">
          {step === 1 ? 'Forgot Password' : 'Reset Password'}
        </h2>

        {step === 1 ? (
          <>
            <p className="forgot-password-description">
              Enter your email address and we'll send you an OTP to reset your password.
            </p>
            <form onSubmit={handleRequestOTP} className="forgot-password-form" role="form" aria-label="Request OTP form">
              <div className="forgot-password-form-group">
                <label htmlFor="email">Email</label>
                <div className="email-input-container">
                  <FiMail className="email-icon" size={20} />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    className="email-input"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="forgot-password-button" 
                disabled={loading}
                aria-label={loading ? "Sending OTP, please wait" : "Send OTP"}
              >
                {loading ? (
                  <>
                    Sending OTP
                    <span className="loading-dots" aria-hidden="true">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="forgot-password-description">
              Enter the OTP sent to your email and your new password.
            </p>
            <form onSubmit={handleResetPassword} className="forgot-password-form" role="form" aria-label="Reset password form">
              <div className="forgot-password-form-group">
                <label htmlFor="otp">OTP Code</label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  required
                  disabled={loading}
                  maxLength={6}
                  className="otp-input"
                />
              </div>
              <div className="forgot-password-form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    disabled={loading}
                    className="password-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={togglePasswordVisibility}
                    disabled={loading}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
              </div>
              <div className="forgot-password-form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                    className="password-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={toggleConfirmPasswordVisibility}
                    disabled={loading}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                className="forgot-password-button" 
                disabled={loading}
                aria-label={loading ? "Resetting password, please wait" : "Reset Password"}
              >
                {loading ? (
                  <>
                    Resetting Password
                    <span className="loading-dots" aria-hidden="true">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="back-button"
                disabled={loading}
              >
                ← Back to Email
              </button>
            </form>
          </>
        )}

        <p className="forgot-password-link-text">
          Remember your password? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;

