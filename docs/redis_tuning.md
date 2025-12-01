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
- Replace multi-command workflows with Lua scripts to avoid round-trips and improve atomicity.

7) Testing checklist
- Run Artillery (or k6) against API while running `redis-cli --stat` and `redis-cli info` in another terminal.
- Watch `blocked_clients` and `instantaneous_ops_per_sec` to identify saturation.
