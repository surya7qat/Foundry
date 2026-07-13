import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../api';
import './Login.css';
import foundryBg from '../assets/foundry_background.png';

interface FormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  username?: string;
  password?: string;
}

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // API call to Django backend
      const response = await api.post('/api/token/', {
        username: formData.username,
        password: formData.password,
      });

      sessionStorage.setItem('access_token', response.data.access);
      sessionStorage.setItem('refresh_token', response.data.refresh);
      if (response.data.username) {
          sessionStorage.setItem('username', response.data.username);
      }
      if (response.data.api_endpoint) {
          sessionStorage.setItem('api_endpoint', response.data.api_endpoint);
      }
      sessionStorage.setItem('is_superuser', response.data.is_superuser ? 'true' : 'false');
      if (response.data.role_permissions) {
          sessionStorage.setItem('role_permissions', JSON.stringify(response.data.role_permissions));
      }
      console.log('Login successful');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed', err);
      if (err.response?.status === 401) {
        setErrors({ username: 'Invalid credentials', password: 'Invalid credentials' });
      } else {
        alert('An error occurred during login. Please ensure the backend is running.');
      }
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="login-container">
      {/* Background Image with Overlay */}
      <div className="login-background">
        <img src={foundryBg} alt="Foundry" />
        <div className="login-background-overlay"></div>
      </div>

      {/* Login Card */}
      <div className="login-card glass">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">
              <span className="icon-spark">⚒️</span>
            </div>
            <h1 className="login-title">Foundry</h1>
          </div>
          <p className="login-subtitle">Casting Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Username Input */}
          <div className="form-group">
            <div className={`input-wrapper ${focusedField === 'username' ? 'focused' : ''} ${errors.username ? 'error' : ''}`}>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder=" "
                className="form-input"
                autoComplete="off"
                spellCheck="false"
              />
              <label htmlFor="username" className="form-label">Username</label>
              <div className="input-border"></div>
            </div>
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          {/* Password Input */}
          <div className="form-group">
            <div className={`input-wrapper ${focusedField === 'password' ? 'focused' : ''} ${errors.password ? 'error' : ''}`}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder=" "
                className="form-input password-input"
                autoComplete="off"
                spellCheck="false"
              />
              <label htmlFor="password" className="form-label">Password</label>
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <div className="input-border"></div>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* Remember Me */}
          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">Remember me</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting}
          >
            <span className="button-text">
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </span>
            <span className="button-glow"></span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
