#!/usr/bin/env bash
# Load test using ApacheBench (ab). Install: sudo yum install -y httpd-tools   (Amazon Linux)
#                                            sudo apt install -y apache2-utils (Ubuntu)
# Usage: ./loadtest.sh http://<EC2_PUBLIC_IP>   [requests] [concurrency]
BASE="${1:-http://localhost}"
N="${2:-2000}"
C="${3:-20}"
echo "== Load test: $N requests, $C concurrent =="
ab -n "$N" -c "$C" "$BASE/track/SHP1001" | tee loadtest_result.txt
echo
echo "== Key numbers for slide 10 =="
grep -E "Requests per second|Time per request|Failed requests|50%|95%|99%" loadtest_result.txt
