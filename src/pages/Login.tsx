import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Loader } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { useApp } from '../contexts/AppContext';

export function Login() {
  const navigate = useNavigate();
  const { setCurrentUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = { email: '', password: '', general: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Set current user in context
      setCurrentUser(user.email || user.uid);
      
      // Navigate to dashboard
      navigate('/');
    } catch (error: any) {
      setLoading(false);
      
      // Handle Firebase errors
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({ ...prev, general: 'User not found. Please check your email.' }));
      } else if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({ ...prev, general: 'Incorrect password. Please try again.' }));
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, general: 'Invalid email address.' }));
      } else if (error.code === 'auth/user-disabled') {
        setErrors(prev => ({ ...prev, general: 'This account has been disabled.' }));
      } else {
        setErrors(prev => ({ ...prev, general: error.message || 'Login failed. Please try again.' }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white bg-opacity-20 p-4 rounded-full">
              <Wrench size={48} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Garage Billing System</h1>
          <p className="text-blue-100">Manage your garage business efficiently</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
                }}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
                }}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="Enter your password"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader size={20} className="animate-spin" />}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Contact your administrator if you don't have an account
          </p>
        </div>
      </div>
    </div>
  );
}