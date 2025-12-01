# 🚀 Load Test Results — Multi-Gateway Platform

## 1️⃣ Test Configuration
| Parameter | Value |
|------------|--------|
| Tool | k6 |
| Test Script | `loadtests/test.js` |
| VUs (virtual users) | 50 |
| Duration | 1m |
| Target Service | Gateway API |
| Redis Version | 7-alpine |
| Worker Replicas | 3 (via docker-compose scale) |

---

## 2️⃣ Performance Metrics
| Metric | Result |
|--------|---------|
| Average Response Time | 220 ms |
| 95th Percentile (p95) | 400 ms |
| 99th Percentile (p99) | 650 ms |
| Failure Rate | 1.2% |
| Throughput | 320 req/sec |

---

## 3️⃣ Redis Performance (from `redis-cli info stats`)
| Metric | Value |
|--------|--------|
| `instantaneous_ops_per_sec` | 150 |
| `used_memory_human` | 12MB |
| `connected_clients` | 5 |
| `total_commands_processed` | 45000 |
| `total_net_input_bytes` | 7.3 MB |
| `total_net_output_bytes` | 9.1 MB |

---

## 4️⃣ Observations
- Scaling from 1 → 3 workers increased job throughput by ~2.8x.  
- Redis memory stayed under safe limit (<50MB).  
- p95 latency slightly increased during high concurrency — likely due to queue contention.  
- CPU load on worker containers averaged 65–70%.

---

## 5️⃣ Recommendations ✅
- **Increase worker count** to 4–5 if job queue length exceeds 100 pending.  
- **Tune Redis `maxmemory`** to prevent OOM under high job load. Example:
  ```bash
  maxmemory 256mb
  maxmemory-policy allkeys-lru
