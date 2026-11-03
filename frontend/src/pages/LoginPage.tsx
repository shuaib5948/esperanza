import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HomePage } from './HomePage.js';
import { LoginModal } from '../components/auth/LoginModal.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <HomePage />
      <LoginModal isOpen={true} onClose={() => navigate('/')} />
    </>
  );
};
