# After starting the cluster nodes, run this command to create the cluster:
#
docker-compose exec redis-cluster-node-1 redis-cli --cluster create \
  redis-cluster-node-1:6379 \
  redis-cluster-node-2:6379 \
  redis-cluster-node-3:6379 \
  redis-cluster-node-4:6379 \
  redis-cluster-node-5:6379 \
  redis-cluster-node-6:6379 \
  --cluster-replicas 1
#
# This will set up a 3-master, 3-replica Redis Cluster.
#
# To connect BullMQ, use the list of node addresses in your connection config.
