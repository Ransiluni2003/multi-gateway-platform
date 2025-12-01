import axios from "axios";
import axiosRetry from "axios-retry";

// Create an Axios instance
const axiosInstance = axios.create();

// Add retry logic
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    const retriableStatus = error.response?.status !== undefined && error.response.status >= 500;
    const retriableCodes = [
      "ECONNREFUSED",
      "ENOTFOUND",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "ECONNRESET",
      "ETIMEDOUT",
    ];
    const codeRetry = !!error.code && retriableCodes.includes(error.code);
    return retriableStatus || codeRetry;
  },
});

export default axiosInstance;
