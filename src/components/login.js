import React from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import AuthForm from './authForm';

function Login({ onNavigate }) {
  return (
    <AuthForm
      title="Welcome, Musician!"
      subtitle="Log in to your account."
      submitLabel="Log In"
      onNavigate={onNavigate}
      onSubmit={({ email, password }) => signInWithEmailAndPassword(auth, email, password)}
      footerText="Don't have an account?"
      footerAction="Sign up."
      footerScreen="signup"
      showForgotPassword
    />
  );
}

export default Login;
