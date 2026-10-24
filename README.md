# Shipment Tracking API: Cloud Mini Project

Docker + AWS EC2 + CloudWatch + SLA/TTR testing.

## 1. Run locally (optional, 2 min)
    docker build -t shipment-tracker:1.0 .
    docker run -d --name tracker -p 80:3000 --restart unless-stopped shipment-tracker:1.0
    curl localhost/health

## 2. Launch EC2 (AWS Console)
- AMI: Amazon Linux 2023 | Type: t2.micro / t3.micro (free tier)
- Security group inbound: SSH (22) from My IP, HTTP (80) from Anywhere
- (Optional) IAM role with CloudWatchAgentServerPolicy

## 3. Install Docker on the instance
    sudo dnf install -y docker git httpd-tools bc
    sudo systemctl enable --now docker
    sudo usermod -aG docker ec2-user
    # log out and back in, then:
    docker --version

## 4. Get the code on EC2 (pick one)
- `git clone https://github.com/<your-username>/shipment-tracker.git` (push this folder to GitHub first; see IMPLEMENTATION_PLAN.md)

## 5. Build and run
    cd shipment-tracker
    docker build -t shipment-tracker:1.0 .
    docker run -d --name tracker -p 80:3000 --restart unless-stopped shipment-tracker:1.0
    curl http://localhost/health
Open http://<EC2_PUBLIC_IP>/track/SHP1001 in a browser. This is your deployment evidence.

## 6. CloudWatch (slide 9 and 12)
- EC2, select instance, Monitoring tab: screenshot CPUUtilization
- CloudWatch, Alarms, Create alarm: metric `StatusCheckFailed` (or CPUUtilization > 70%)
- Screenshot the dashboard and the alarm
- Container logs: `docker logs tracker` (JSON request logs)

## 7. Performance test (slide 10)
    ./scripts/loadtest.sh http://<EC2_PUBLIC_IP> 2000 20
Record: requests/sec, mean latency, P95 (95%), P99 (99%), failed requests.
Availability observed = (total - failed) / total * 100.

## 8. Failure injection and TTR (slide 9 and 10)
Terminal 1 (can run on your laptop):
    ./scripts/ttr_monitor.sh http://<EC2_PUBLIC_IP>/health
Terminal 2 (SSH into EC2), run ONE scenario at a time:

| Scenario | Command | Recovery |
|---|---|---|
| A. Container crash | `docker kill tracker` | Automatic via `--restart unless-stopped` |
| B. App crash | `curl localhost/crash` | Automatic via restart policy |
| C. Manual recovery | `docker stop tracker` | Manual: `docker start tracker` (time it) |

The monitor prints "Measured TTR = x seconds". Run each scenario 3 times and average.
TTR = detection + diagnosis + recovery + verification.

## 9. Cleanup (avoid charges)
    docker rm -f tracker
Then terminate the EC2 instance in the console.
