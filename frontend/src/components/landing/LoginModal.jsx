import React, { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import EmailVerificationModal from '../auth/EmailVerificationModal';
import api from '../../services/api';

function LoginModal({ isOpen, onClose, defaultRole = 'Student' }) {
  const { login, registerWithEmail, resetPassword, user, emailVerified } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(defaultRole);
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  // OTP flow states
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'otp' | 'password'
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [animKey, setAnimKey] = useState('Student');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [lottieReady, setLottieReady] = useState(false);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const formRef = useRef(null);

  // Update role when defaultRole changes and modal opens
  useEffect(() => {
    if (isOpen) {
      setRole(defaultRole);
    }
  }, [isOpen, defaultRole]);

  useEffect(() => {
    if (isOpen && !shouldRender) {
      // Modal is opening - render it first
      setShouldRender(true);
      setIsAnimating(true);
    } else if (!isOpen && shouldRender && !isAnimating) {
      // Modal is closing - start closing animation
      setIsAnimating(true);
    }
  }, [isOpen, shouldRender, isAnimating]);

  // Load and track Lottie web component
  useEffect(() => {
    const loadLottie = async () => {
      if (!document.querySelector('script[src*="dotlottie-wc"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js';
        script.type = 'module';
        
        script.onload = () => {
          // Wait a bit for the web component to register
          setTimeout(() => {
            setLottieReady(true);
          }, 100);
        };
        
        document.body.appendChild(script);
      } else {
        // Script already exists, check if web component is ready
        if (customElements.get('dotlottie-wc')) {
          setLottieReady(true);
        } else {
          // Wait for it to be defined
          customElements.whenDefined('dotlottie-wc').then(() => {
            setLottieReady(true);
          });
        }
      }
    };
    
    loadLottie();
  }, []);

  useEffect(() => {
    if (shouldRender && modalRef.current && backdropRef.current) {
      if (isOpen) {
        // Opening animation
        gsap.killTweensOf([modalRef.current, backdropRef.current]);
        if (formRef.current) gsap.killTweensOf(formRef.current);
        
        // Set initial state immediately
        gsap.set(backdropRef.current, { opacity: 0 });
        gsap.set(modalRef.current, { opacity: 0, scale: 0.85, y: 60, rotationX: 5 });
        if (formRef.current) {
          gsap.set(formRef.current, { opacity: 0, y: 30 });
        }
        
        // Create timeline for smoother animations
        const tl = gsap.timeline();
        
        // Animate backdrop
        tl.to(backdropRef.current, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        })
        // Animate modal with enhanced easing
        .to(modalRef.current, {
          opacity: 1,
          scale: 1,
          y: 0,
          rotationX: 0,
          duration: 0.7,
          ease: 'back.out(1.2)'
        }, 0.1)
        // Animate form content
        .to(formRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            setIsAnimating(false);
          }
        }, 0.3);
        
      } else {
        // Closing animation
        gsap.killTweensOf([modalRef.current, backdropRef.current]);
        if (formRef.current) gsap.killTweensOf(formRef.current);
        
        const tl = gsap.timeline();
        
        // Animate form out first
        if (formRef.current) {
          tl.to(formRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            ease: 'power2.in'
          });
        }
        
        // Animate modal out
        tl.to(modalRef.current, {
          opacity: 0,
          scale: 0.85,
          y: 60,
          rotationX: -5,
          duration: 0.4,
          ease: 'power2.in'
        }, 0.1)
        
        // Animate backdrop out
        .to(backdropRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => {
            setShouldRender(false);
            setIsAnimating(false);
          }
        }, 0.2);
      }
    }
  }, [shouldRender, isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [shouldRender]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isAnimating) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!isAnimating) {
      onClose();
    }
  };

  // Don't render anything if modal should not be rendered
  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 flex items-center justify-center z-[9999] backdrop-blur-sm" 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.10)',
        opacity: 0 // Start invisible to prevent flash
      }} 
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-transparent backdrop-blur-lg p-0 rounded-lg shadow-2xl w-full max-w-2xl h-[28rem] relative overflow-hidden flex flex-row items-center border border-gray-300"
        style={{
          background: 'linear-gradient(135deg, #FFDE83 60%, rgba(245,245,245,0.85) 60%, rgba(245,245,245,0.85) 100%)',
          boxShadow: '0 8px 48px 8px rgba(80, 80, 120, 0.25), 0 1.5px 8px 0 rgba(80,80,120,0.10)',
          opacity: 0, // Start invisible to prevent flash
          transform: 'scale(0.8) translateY(50px)' // Start in initial animation state
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Lottie Animation Left Side */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 h-full bg-transparent ">
          {lottieReady && (
            <dotlottie-wc
              src="https://lottie.host/a22e1a8b-a8e9-4fe4-893c-f5ba49c2a4b6/KHjSf9NMKB.lottie"
              speed="1"
              style={{ width: '220px', height: '220px' }}
              mode="forward"
              loop
              autoplay
            ></dotlottie-wc>
          )}
        </div>
        {/* Login Form Right Side */}
        <div className="flex-1 flex flex-col justify-center h-full relative bg-transparent">
          <button onClick={handleClose} className="absolute top-4 right-4 bg-gray-200 text-black hover:bg-gray-300 hover:scale-110 text-sm font-bold px-4 py-0.5 border-2 rounded z-20 transition-all duration-200">✕</button>
          {/* Enhanced glow effect */}
          <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ boxShadow: '0 0 12px 3px rgba(128,0,255,0.2)' }}></div>
          <div ref={formRef} className="relative z-10 px-8 py-4">
            <h2 className="text-2xl font-bold mb-2 text-center text-black">
              {mode === 'login' && 'Sign in'}
              {mode === 'register' && 'Create account'}
              {mode === 'forgot' && 'Reset password'}
            </h2>
            <div className="flex justify-center gap-2 mb-4">
              {['Student', 'Recruiter', 'Admin'].map(opt => (
                <button
                  key={opt}
                  className={`px-3 py-1 rounded-lg font-semibold text-sm uppercase border transition-all duration-300 transform hover:rotate-1
                    ${role === opt ? 'bg-gradient-to-r from-black to-gray-800 text-white scale-105 shadow-lg border-black' : 'bg-white bg-opacity-30 text-black border-gray-400 hover:scale-105 hover:shadow-md hover:bg-opacity-50'}`}
                  onClick={() => {
                    setRole(opt);
                    setAnimKey(opt); // Trigger form animation
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div
              key={animKey}
              className="transition-all duration-500 ease-out opacity-100 scale-100"
              style={{ 
                animation: 'fadeInScale 0.4s ease-out',
                animationFillMode: 'both'
              }}
            >
              {error && (
                <div className="mb-4 p-4 rounded-xl flex items-start space-x-3 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 shadow-sm">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="text-red-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-relaxed text-red-800">
                      {error}
                    </p>
                    {error.includes('user-not-found') && (
                      <p className="text-xs text-red-600 mt-2">
                        This email address is not registered. Please create an account first.
                      </p>
                    )}
                    {error.includes('wrong-password') && (
                      <p className="text-xs text-red-600 mt-2">
                        Please check your password and try again.
                      </p>
                    )}
                    {error.includes('invalid-email') && (
                      <p className="text-xs text-red-600 mt-2">
                        Please enter a valid email address.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {mode !== 'forgot' && (
                <form className="flex flex-col gap-3" onSubmit={async (e)=>{
                  e.preventDefault();
                  setError('');
                  setBusy(true);
                  try {
                    console.log('LoginModal - Starting authentication process...');
                    console.log('LoginModal - Mode:', mode);
                    console.log('LoginModal - OTP Step:', otpStep);
                    console.log('LoginModal - Email:', email);
                    let uid = null;
                    if (mode === 'login') {
                      // Reset OTP flow for login
                      setOtpStep('email');
                      setOtpSent(false);
                      setOtp('');
                      setVerificationToken('');
                      setOtpCountdown(0);
                      // Backend expects uppercase role for login too
                      const u = await login(email, password, role.toUpperCase());
                      uid = u?.user?.id || u?.id; // JWT returns id, not uid
                      console.log('LoginModal - Login successful, User ID:', uid);
                      
                      // For existing users logging in, skip email verification
                      // Email verification is only required for new account creation
                      console.log('LoginModal - Existing user login, skipping email verification');
                    } else {
                      // Registration flow with OTP
                      console.log('LoginModal - Registration mode, OTP step:', otpStep);
                      if (otpStep === 'email') {
                        // Step 1: Send OTP
                        try {
                          if (!email) {
                            setError('Please enter your email address');
                            setBusy(false);
                            return;
                          }
                          console.log('LoginModal - Sending OTP to:', email);
                          console.log('LoginModal - API call starting...');
                          
                          // Add timeout to prevent infinite "Please wait..."
                          const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Request timeout - please check your backend server')), 30000); // 30 seconds
                          });
                          
                          const response = await Promise.race([
                            api.sendOTP(email),
                            timeoutPromise
                          ]);
                          
                          console.log('LoginModal - OTP API response:', response);
                          setOtpSent(true);
                          setOtpStep('otp');
                          setOtpCountdown(300); // 5 minutes
                          setError('');
                          setBusy(false); // Important: Reset busy state
                          // Start countdown
                          const interval = setInterval(() => {
                            setOtpCountdown((prev) => {
                              if (prev <= 1) {
                                clearInterval(interval);
                                return 0;
                              }
                              return prev - 1;
                            });
                          }, 1000);
                          console.log('LoginModal - OTP sent successfully, check your email');
                          return; // Don't proceed, wait for OTP
                        } catch (otpError) {
                          console.error('LoginModal - OTP send error:', otpError);
                          console.error('LoginModal - Error details:', {
                            message: otpError.message,
                            stack: otpError.stack,
                            response: otpError.response
                          });
                          const errorMsg = otpError.message || 'Failed to send OTP. Please check your backend server and try again.';
                          setError(errorMsg);
                          setBusy(false);
                          return;
                        }
                      } else if (otpStep === 'otp') {
                        // Step 2: Verify OTP
                        if (!otp || otp.length !== 6) {
                          setError('Please enter a 6-digit OTP');
                          setBusy(false);
                          return;
                        }
                        try {
                          const verifyData = await api.verifyOTP(email, otp);
                          setVerificationToken(verifyData.verificationToken);
                          setOtpStep('password');
                          setError('');
                          setBusy(false);
                          return; // Don't proceed, wait for password
                        } catch (verifyError) {
                          setError(verifyError.message || 'Invalid OTP');
                          setBusy(false);
                          return;
                        }
                      } else if (otpStep === 'password') {
                        // Step 3: Complete registration with verification token
                        if (!password || password.length < 6) {
                          setError('Password must be at least 6 characters');
                          setBusy(false);
                          return;
                        }
                        // Backend expects uppercase role: STUDENT, RECRUITER, ADMIN
                        const selected = role.toUpperCase();
                        const u = await registerWithEmail({ 
                          email, 
                          password, 
                          role: selected,
                          verificationToken 
                        });
                        uid = u?.id; // JWT returns id, not uid
                        console.log('LoginModal - Registration successful, User ID:', uid);
                        
                        // Registration complete - proceed with navigation
                        setOtpStep('email'); // Reset for next time
                        setOtp('');
                        setOtpSent(false);
                        setVerificationToken('');
                        
                        // Close modal - AuthRedirect will handle navigation based on role
                        onClose();
                        setBusy(false);
                        return; // Exit early after registration
                      }
                    }
                    
                    // Login successful - close modal
                    // AuthRedirect will handle navigation based on role
                    if (mode === 'login' && uid) {
                      console.log('LoginModal - Login successful, closing modal');
                      onClose();
                    }
                  } catch (err) {
                    console.error('Authentication error:', err);
                    
                    // Enhanced error messages based on Firebase error codes
                    let errorMessage = err?.message || 'Authentication failed';
                    
                    if (err?.code) {
                      switch (err.code) {
                        case 'auth/user-not-found':
                          errorMessage = 'No account found with this email address.';
                          break;
                        case 'auth/wrong-password':
                          errorMessage = 'Incorrect password. Please try again.';
                          break;
                        case 'auth/invalid-email':
                          errorMessage = 'Please enter a valid email address.';
                          break;
                        case 'auth/user-disabled':
                          errorMessage = 'This account has been disabled. Contact support.';
                          break;
                        case 'auth/too-many-requests':
                          errorMessage = 'Too many failed attempts. Please try again later.';
                          break;
                        case 'auth/email-already-in-use':
                          errorMessage = 'An account with this email already exists.';
                          break;
                        case 'auth/weak-password':
                          errorMessage = 'Password should be at least 6 characters long.';
                          break;
                        case 'auth/network-request-failed':
                          errorMessage = 'Network error. Please check your connection.';
                          break;
                        default:
                          errorMessage = err.message || 'Authentication failed. Please try again.';
                      }
                    }
                    
                    setError(errorMessage);
                  } finally { setBusy(false); }
              }}>
                {/* Email input - always shown */}
                <input 
                  value={email} 
                  onChange={(e)=>setEmail(e.target.value)} 
                  type="email" 
                  placeholder="Email" 
                  disabled={mode === 'register' && otpStep !== 'email'}
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" 
                />
                
                {/* Show OTP input only for registration after email step */}
                {mode === 'register' && otpStep === 'otp' && (
                  <>
                    <div className="text-xs text-gray-600">
                      OTP sent to {email}. Check your email.
                      {otpCountdown > 0 && ` (Expires in ${Math.floor(otpCountdown / 60)}:${(otpCountdown % 60).toString().padStart(2, '0')})`}
                    </div>
                    <input 
                      value={otp} 
                      onChange={(e)=>setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                      type="text" 
                      placeholder="Enter 6-digit OTP" 
                      maxLength={6}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-center text-2xl tracking-widest font-mono" 
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        setError('');
                        setBusy(true);
                        try {
                          await api.sendOTP(email);
                          setOtpCountdown(300);
                          setError('');
                          alert('OTP resent!');
                        } catch (err) {
                          setError(err.message || 'Failed to resend OTP');
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy || otpCountdown > 280}
                      className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resend OTP
                    </button>
                  </>
                )}
                
                {/* Show password input for login or after OTP verification */}
                {(mode === 'login' || (mode === 'register' && otpStep === 'password')) && (
                  <input 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    type="password" 
                    placeholder="Password" 
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                  />
                )}
                
                {/* Submit button - changes text based on step */}
                <button 
                    disabled={busy} 
                    type="submit" 
                    className="bg-gradient-to-r from-black to-gray-800 text-white py-2 rounded-lg font-semibold disabled:opacity-60 hover:from-gray-800 hover:to-black transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {busy ? 'Please wait...' : (
                      mode === 'login' ? 'Sign in' : (
                        otpStep === 'email' ? 'Send OTP' : (
                          otpStep === 'otp' ? 'Verify OTP' : 'Create account'
                        )
                      )
                    )}
                  </button>
                </form>
              )}
              {mode === 'forgot' && (
                <form className="flex flex-col gap-3" onSubmit={async (e)=>{
                  e.preventDefault();
                  setError('');
                  setBusy(true);
                  try {
                    await resetPassword(email);
                    alert('Reset link sent to your email.');
                    onClose();
                  } catch (err) {
                    setError(err?.message || 'Failed to send reset link');
                  } finally { setBusy(false); }
                }}>
                  <input 
                    value={email} 
                    onChange={(e)=>setEmail(e.target.value)} 
                    type="email" 
                    placeholder="Email" 
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                  />
                  <button 
                    disabled={busy} 
                    type="submit" 
                    className="bg-gradient-to-r from-black to-gray-800 text-white py-2 rounded-lg font-semibold disabled:opacity-60 hover:from-gray-800 hover:to-black transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {busy ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              )}
              <div className="flex items-center justify-between mt-3 text-sm">
                <button 
                  onClick={()=>{
                    setMode(mode==='login' ? 'register' : 'login');
                    // Reset OTP flow when switching
                    setOtpStep('email');
                    setOtpSent(false);
                    setOtp('');
                    setVerificationToken('');
                    setOtpCountdown(0);
                    setError('');
                  }} 
                  className="text-blue-600 font-semibold hover:text-blue-800 transition-colors duration-200 hover:underline text-center"
                >
                  {mode==='login' 
                    ? 'Create account' 
                    : (
                      <>
                        <span className="block">Have an account?</span>
                        <span className="block">Sign in</span>
                      </>
                    )}
                </button>
                <button 
                  onClick={()=>setMode('forgot')} 
                  className="text-blue-600 font-semibold hover:text-blue-800 transition-colors duration-200 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Email Verification Modal */}
        <EmailVerificationModal 
          isOpen={showEmailVerification}
          onClose={(verified) => {
            setShowEmailVerification(false);
            if (verified) {
              // User verified email, proceed with navigation
              onClose();
              // The AuthRedirect component will handle navigation based on role
            }
          }}
          userEmail={registeredEmail}
        />
        
        <style>{`
            @keyframes fadeInScale {
              0% { 
                opacity: 0; 
                transform: scale(0.95) translateY(10px); 
              }
              100% { 
                opacity: 1; 
                transform: scale(1) translateY(0px); 
              }
            }
            
            /* Enhanced focus states for form elements */
            input:focus {
              transform: scale(1.02);
            }
            
            /* Smooth lottie animation entry */
            dotlottie-wc {
              animation: lottieEntry 0.8s ease-out 0.5s both;
            }
            
            @keyframes lottieEntry {
              0% {
                opacity: 0;
                transform: scale(0.8) rotate(-5deg);
              }
              100% {
                opacity: 1;
                transform: scale(1) rotate(0deg);
              }
            }
          `}</style>
      </div>
    </div>
  )
}

export default LoginModal;