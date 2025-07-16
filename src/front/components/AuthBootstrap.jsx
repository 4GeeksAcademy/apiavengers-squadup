
import React, { useEffect } from 'react';
import { bootstrapAuth } from '../store/actions';
import useGlobalReducer from '../hooks/useGlobalReducer';

export const AuthBootstrap = ({ children }) => {
  const { dispatch } = useGlobalReducer();

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  return children;
};
