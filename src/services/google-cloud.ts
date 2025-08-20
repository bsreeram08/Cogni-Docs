/**
 * Google Cloud services initialization and configuration
 */

import { Firestore } from '@google-cloud/firestore';
import { VertexAI } from '@google-cloud/vertexai';

export interface GoogleCloudConfig {
  readonly projectId: string;
  readonly location: string;
}

export interface CloudServices {
  readonly firestore: Firestore;
  readonly vertexAI: VertexAI;
}

const getConfig = (): GoogleCloudConfig => {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
  }
  
  return { projectId, location };
};

let services: CloudServices | null = null;

export const initializeGoogleCloud = (): CloudServices => {
  if (services) return services;
  
  const config = getConfig();
  
  const firestore = new Firestore({
    projectId: config.projectId,
  });
  
  const vertexAI = new VertexAI({
    project: config.projectId,
    location: config.location,
  });
  
  services = { firestore, vertexAI };
  return services;
};

export const getGoogleCloudServices = (): CloudServices => {
  if (!services) {
    throw new Error('Google Cloud services not initialized. Call initializeGoogleCloud() first.');
  }
  return services;
};
