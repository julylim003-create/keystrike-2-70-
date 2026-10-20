import React from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import AuthForm from './authForm';

async function createAccount({ name, email, password }) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name.trim()) {
    await updateProfile(result.user, { displayName: name.trim() });
  }
}

function Signup({ onNavigate }) {
  return (
    <AuthForm
      title="Welcome, Musician!"
      subtitle="Start your musical journey!"
      submitLabel="Sign Up"
      onNavigate={onNavigate}
      onSubmit={createAccount}
      footerText="Already have an account?"
      footerAction="Log in."
      footerScreen="login"
      showName
    />
  );
}

export default Signup;
