
import { auth } from '../../firebase';
import { OperationType } from '../../types';

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  let errorMessage = 'Unknown error';
  
  if (error) {
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      errorMessage = `Firebase Error [${error.code}]: ${error.message || 'No message'}`;
    } else {
      try {
        errorMessage = String(error);
      } catch (e) {
        errorMessage = 'Unstringifiable error object';
      }
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    }
  };

  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  
  // Throwing a stringified version for the ErrorBoundary to catch and parse
  throw new Error(JSON.stringify(errInfo));
}

export const sanitize = (data: any): any => {
  if (data === null || data === undefined) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }
  
  if (typeof data === 'object') {
    const clean: any = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        clean[key] = sanitize(data[key]);
      }
    });
    return clean;
  }
  
  return data;
};
