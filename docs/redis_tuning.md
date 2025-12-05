Redis tuning notes for high-volume queues

When pushing >1000 RPS and many enqueues the single Redis instance may become the bottleneck. Use these recommendations when testing and before moving to clustering.

1) Memory and eviction
- Set `maxmemory` to a value appropriate for your host and configure `maxmemory-policy` to `allkeys-lru` or `volatile-lru` depending on key patterns.

2) Persistence
- During heavy load, Redis RDB/AOF persistence may cause IO stalls. Consider disabling AOF (`appendonly no`) or tune `save` intervals during load tests. For production, use replication + replicas and persist on replicas.

3) Client options for BullMQ
- Use `maxRetriesPerRequest: null` and `enableReadyCheck: false` in `ioredis` connection options to avoid client-side timeouts under load.
- Increase `connectionTimeout` and `commandTimeout` where supported.

4) Monitor
- Use `INFO`, `MONITOR`, `SLOWLOG`, and `LATENCY` commands to inspect bottlenecks.
- Prometheus exporter `oliver006/redis_exporter` is helpful to collect metrics: memory, ops/sec, blocked clients.

5) Scale options
- If single-node Redis saturates, consider:
  - Vertical scaling (bigger instance, provisioned IOPS)
  - Redis Cluster (sharding)
  - Redis Sentinel + replica groups for availability (does not shard)

6) Lua scripts

7) Testing checklist

---

## Advanced Redis Monitoring & Key Metrics

- **Queue Monitoring:**
  - Use BullMQ/Redis queue stats endpoints or `LLEN <queue>` in `redis-cli` to monitor queue length.
  - Monitor job latency and retry counts via BullMQ events or Prometheus metrics.
- **Key Metrics to Track:**
  - `used_memory_human`, `maxmemory`, `maxmemory_policy` (memory usage and eviction)
  - `instantaneous_ops_per_sec` (throughput)
  - `blocked_clients`, `connected_clients` (resource contention)
  - `total_commands_processed`, `total_net_input_bytes`, `total_net_output_bytes` (workload)
  - `evicted_keys`, `expired_keys` (key churn)
  - `cpu_sys`, `cpu_user` (CPU load)
- **Prometheus/Grafana:**
  - Use `oliver006/redis_exporter` to collect and visualize these metrics.
- **Scaling Guidance:**
  - If queue length grows or memory nears limit, scale worker replicas or increase `maxmemory`.
  - For high-availability, consider Redis Cluster or Sentinel.

---

_For more, see the official [Redis documentation](https://redis.io/docs/management/)_
