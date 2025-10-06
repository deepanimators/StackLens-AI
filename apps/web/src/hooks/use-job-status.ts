import { useState, useEffect } from 'react';
import { authenticatedRequest } from '@/lib/auth';

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startTime: string;
}

export const useJobStatus = (jobId: string | null, pollInterval: number = 2000) => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let intervalId: NodeJS.Timeout;
    let isCancelled = false;

    const fetchJobStatus = async () => {
      if (isCancelled) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await authenticatedRequest('GET', `/api/files/jobs/${jobId}/status`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }
        
        const data = await response.json() as JobStatus;
        
        if (!isCancelled) {
          setJobStatus(data);
          
          // Stop polling if job is completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch job status');
          clearInterval(intervalId);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchJobStatus();

    // Set up polling if job is not completed
    intervalId = setInterval(() => {
      if (jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed') {
        fetchJobStatus();
      } else {
        clearInterval(intervalId);
      }
    }, pollInterval);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [jobId, pollInterval, jobStatus?.status]);

  return { jobStatus, loading, error };
};

export default useJobStatus;
