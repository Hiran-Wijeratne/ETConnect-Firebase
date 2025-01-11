import { getAnalytics } from "firebase/analytics";

// Initialize Analytics only in browser environment
if (typeof window !== 'undefined') {
  const analytics = getAnalytics();
} 