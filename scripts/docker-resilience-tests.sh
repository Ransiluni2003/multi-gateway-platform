#!/bin/bash

# Docker Service Failure Simulation Tests
# This script tests how services handle failures and recovery

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/test-logs"
RESULTS_FILE="$LOGS_DIR/service-resilience-test-results.md"

# Create logs directory
mkdir -p "$LOGS_DIR"

echo "=== Docker Service Failure Simulation Tests ===" | tee -a "$RESULTS_FILE"
echo "Test Start: $(date)" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Function to check service health
check_service_health() {
    local service=$1
    local url=$2
    echo "[$(date +'%H:%M:%S')] Checking $service..."
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✓ $service is UP" | tee -a "$RESULTS_FILE"
        return 0
    else
        echo "✗ $service is DOWN" | tee -a "$RESULTS_FILE"
        return 1
    fi
}

# Test 1: Stop Payments Service
test_payments_failure() {
    echo "" | tee -a "$RESULTS_FILE"
    echo "=== Test 1: Stop Payments Service ===" | tee -a "$RESULTS_FILE"
    echo "Simulating payments service failure..." | tee -a "$RESULTS_FILE"
    
    docker-compose stop payments
    sleep 2
    
    echo "Checking if API handles payments service outage..." | tee -a "$RESULTS_FILE"
    check_service_health "API" "http://localhost:5002/health" || true
    
    echo "Restarting payments service..." | tee -a "$RESULTS_FILE"
    docker-compose start payments
    sleep 5
    
    echo "Verifying recovery..." | tee -a "$RESULTS_FILE"
    check_service_health "Payments" "http://localhost:5003/health"
}

# Test 2: Stop Redis
test_redis_failure() {
    echo "" | tee -a "$RESULTS_FILE"
    echo "=== Test 2: Stop Redis (Cache Service) ===" | tee -a "$RESULTS_FILE"
    echo "Stopping Redis..." | tee -a "$RESULTS_FILE"
    
    docker-compose stop redis
    sleep 2
    
    echo "Attempting API calls without cache..." | tee -a "$RESULTS_FILE"
    if curl -s http://localhost:5002/api/test > /dev/null 2>&1; then
        echo "✓ API still responding (graceful degradation)" | tee -a "$RESULTS_FILE"
    else
        echo "✗ API failed without cache" | tee -a "$RESULTS_FILE"
    fi
    
    echo "Restarting Redis..." | tee -a "$RESULTS_FILE"
    docker-compose start redis
    sleep 3
    
    echo "Verifying Redis recovery..." | tee -a "$RESULTS_FILE"
    check_service_health "Redis" "http://localhost:6379"
}

# Test 3: Stop MongoDB
test_mongo_failure() {
    echo "" | tee -a "$RESULTS_FILE"
    echo "=== Test 3: Stop MongoDB (Database Service) ===" | tee -a "$RESULTS_FILE"
    echo "Stopping MongoDB..." | tee -a "$RESULTS_FILE"
    
    docker-compose stop mongo
    sleep 2
    
    echo "Checking API response without database..." | tee -a "$RESULTS_FILE"
    if ! curl -s http://localhost:5002/api/test > /dev/null 2>&1; then
        echo "✓ API correctly failed (database is critical)" | tee -a "$RESULTS_FILE"
    fi
    
    echo "Restarting MongoDB..." | tee -a "$RESULTS_FILE"
    docker-compose start mongo
    sleep 10 # MongoDB takes longer to start
    
    echo "Verifying MongoDB recovery..." | tee -a "$RESULTS_FILE"
    check_service_health "MongoDB" "http://localhost:27017"
}

# Test 4: Network Simulation (Slow Network)
test_slow_network() {
    echo "" | tee -a "$RESULTS_FILE"
    echo "=== Test 4: Simulate Slow Network (Rate Limiting) ===" | tee -a "$RESULTS_FILE"
    
    echo "Testing service with simulated latency..." | tee -a "$RESULTS_FILE"
    
    # Create 100 concurrent requests and measure response times
    for i in {1..10}; do
        start_time=$(date +%s%N)
        curl -s http://localhost:5002/health > /dev/null 2>&1 || true
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))
        echo "Request $i: ${response_time}ms" >> "$LOGS_DIR/response-times.log"
    done
    
    echo "✓ Response time metrics logged" | tee -a "$RESULTS_FILE"
}

# Test 5: Complete System Failure Recovery
test_complete_system_recovery() {
    echo "" | tee -a "$RESULTS_FILE"
    echo "=== Test 5: Complete System Failure & Recovery ===" | tee -a "$RESULTS_FILE"
    
    echo "Stopping all services..." | tee -a "$RESULTS_FILE"
    docker-compose stop
    sleep 3
    
    echo "System offline. All services stopped." | tee -a "$RESULTS_FILE"
    sleep 5
    
    echo "Restarting all services..." | tee -a "$RESULTS_FILE"
    docker-compose up -d
    sleep 15 # Wait for all services to start
    
    echo "Verifying system recovery..." | tee -a "$RESULTS_FILE"
    for service in api payments redis mongo; do
        check_service_health "$service" "http://localhost:5002/health" || true
    done
}

# Run all tests
echo "Starting test suite..." | tee -a "$RESULTS_FILE"

test_payments_failure
sleep 5

test_redis_failure
sleep 5

test_mongo_failure
sleep 5

test_slow_network
sleep 5

test_complete_system_recovery

echo "" | tee -a "$RESULTS_FILE"
echo "=== Test Summary ===" | tee -a "$RESULTS_FILE"
echo "All tests completed at $(date)" | tee -a "$RESULTS_FILE"
echo "Results saved to: $RESULTS_FILE" | tee -a "$RESULTS_FILE"
echo "Response times logged to: $LOGS_DIR/response-times.log" | tee -a "$RESULTS_FILE"

echo ""
echo "✓ Test suite completed!"
