import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 50,        // 50 virtual users
  duration: '30s' // run for 30 seconds
};

export default function () {
  const res = http.get('http://localhost:4000/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
