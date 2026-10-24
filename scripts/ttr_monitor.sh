#!/usr/bin/env bash
# Polls /health every 0.5s, detects an outage and prints the measured TTR.
# Usage: ./ttr_monitor.sh http://<EC2_PUBLIC_IP>/health
URL="${1:-http://localhost/health}"
down_at=""
echo "Monitoring $URL  (Ctrl+C to stop)"
while true; do
  code=$(curl -s -o /dev/null -m 2 -w "%{http_code}" "$URL")
  now=$(date +%s.%N)
  if [ "$code" != "200" ]; then
    if [ -z "$down_at" ]; then
      down_at=$now
      echo "$(date +%T) DOWN detected (HTTP $code)"
    fi
  else
    if [ -n "$down_at" ]; then
      ttr=$(echo "$now - $down_at" | bc -l)
      printf "%s RECOVERED. Measured TTR = %.2f seconds\n" "$(date +%T)" "$ttr"
      down_at=""
    fi
  fi
  sleep 0.5
done
