# Implementation Plan: Shipment Tracking API (GitHub + Docker + AWS)

**Goal:** Deploy a small Dockerized API on AWS EC2, then measure SLA and TTR with evidence for every slide of the template.
**Time budget:** about 60 minutes. **Domain:** Logistics (shipment status lookup).

## Pipeline

    Developer laptop --git push--> GitHub repo --(Actions: build + smoke test)
                                        |
                                   git clone
                                        v
    User --> Internet --> EC2 (t3.micro, Security Group :80) --> Docker container (Node API :3000)
                                        |
                                        +--> CloudWatch (metrics, alarm) + docker logs
                                        +--> Load test + failure injection (SLA / TTR)

## SLA / TTR targets (decide these first, slide 4)

| Item | Target |
|---|---|
| Availability SLA | 99.5% |
| Response SLA | P95 < 500 ms |
| TTR target (auto-restart) | < 30 seconds |
| RTO / RPO | RTO 1 min / RPO: in-memory data is lost on restart (future work: DynamoDB/RDS) |

## Timeline

| Step | Time | Task | Evidence to capture |
|---|---|---|---|
| 1 | 0-8 min | Create the GitHub repo and push the code | Repo URL, screenshot |
| 2 | 8-14 min | Check the GitHub Actions run (build + smoke test) | Green workflow screenshot |
| 3 | 14-22 min | Launch EC2, set the security group, install Docker | Instance and security group screenshots |
| 4 | 22-30 min | `git clone`, `docker build`, `docker run` | Terminal screenshot, public URL working |
| 5 | 30-37 min | CloudWatch metrics and an alarm | Dashboard and alarm screenshots |
| 6 | 37-45 min | Load test | `loadtest_result.txt` numbers |
| 7 | 45-54 min | Failure injection and TTR (3 runs per scenario) | Monitor output |
| 8 | 54-60 min | Fill the PPT, then terminate EC2 | Final slides |

## Step 1: Push to GitHub

    cd shipment-tracker
    git init
    git add .
    git commit -m "Shipment tracker: initial version"
    git branch -M main
    git remote add origin https://github.com/<your-username>/shipment-tracker.git
    git push -u origin main

- Create the repo on github.com first (empty, no README).
- **Make it public** for the easiest clone on EC2. The repo holds no secrets (`.gitignore` excludes `.env` and `*.pem`).
- If you keep it private, clone with a Personal Access Token: `git clone https://<token>@github.com/<user>/shipment-tracker.git`. Do not paste the token into any file.

## Step 2: CI (slide 6, deployment and automation)

The workflow in `.github/workflows/docker-build.yml` runs on every push. It builds the image, starts the container, and checks `/health` and `/track/SHP1001`. Screenshot the green run from the **Actions** tab.

## Step 3: EC2 setup

- AMI: Amazon Linux 2023. Type: t3.micro (or t2.micro).
- Security group: SSH 22 from **My IP**, HTTP 80 from anywhere.
- Install tools:

      sudo dnf install -y docker git httpd-tools bc
      sudo systemctl enable --now docker
      sudo usermod -aG docker ec2-user
      exit    # log in again so the docker group applies

## Step 4: Deploy from GitHub

    git clone https://github.com/<your-username>/shipment-tracker.git
    cd shipment-tracker
    docker build -t shipment-tracker:1.0 .
    docker run -d --name tracker -p 80:3000 --restart unless-stopped shipment-tracker:1.0
    curl http://localhost/health

Open `http://<EC2_PUBLIC_IP>/track/SHP1001` in a browser. To redeploy after a code change: `git pull`, rebuild, then `docker rm -f tracker` and run again.

## Step 5: Monitoring

- EC2, Monitoring tab: screenshot CPUUtilization and network.
- CloudWatch, Alarms: create one on `StatusCheckFailed` (or CPU above 70%).
- `docker logs tracker` shows JSON request logs. `docker ps` shows the health status.

## Step 6: Load test

    ./scripts/loadtest.sh http://<EC2_PUBLIC_IP> 2000 20

Record: requests/sec, mean latency, P95, P99, failed requests.
Availability observed = (total requests - failed) / total requests x 100.

## Step 7: Failure injection and TTR

Terminal 1 (your laptop or the EC2 instance):

    ./scripts/ttr_monitor.sh http://<EC2_PUBLIC_IP>/health

Terminal 2 (SSH into EC2), run one scenario at a time, 3 runs each:

| Scenario | Command | Recovery |
|---|---|---|
| A. Container kill | `docker kill tracker` | Automatic (restart policy) |
| B. App crash | `curl localhost/crash` | Automatic (restart policy) |
| C. Manual recovery | `docker stop tracker` | Manual: `docker start tracker` |

Note down the measured TTR for each run and average them. Compare A/B with C: this shows why automation matters.

## Slide-to-evidence map

| Slide | Content | Source |
|---|---|---|
| 2-3 | Use case and problem | Logistics tracking story |
| 4 | SLA/TTR targets | Table above |
| 5 | Pipeline diagram | Pipeline section above |
| 6 | AWS services | EC2, Security Group, IAM, CloudWatch (state why each) |
| 7 | Docker | Dockerfile (Alpine base, non-root, HEALTHCHECK, port 3000) |
| 8 | Virtualization | t3.micro: 2 vCPU, 1 GB RAM, Nitro hypervisor, container vs VM |
| 9 | TTR workflow | Detect (`/health`), diagnose (`docker logs`), recover (restart), verify (health check) |
| 10 | Performance | `loadtest_result.txt` + monitor output |
| 11 | Security and cost | Restricted ports, no secrets in repo, estimate via the AWS pricing calculator |
| 12 | Evidence | GitHub URL, Actions run, EC2 URL, CloudWatch, before/failure/recovery |
| 13-14 | Results and future work | Target vs observed; EKS, CI/CD deploy, DynamoDB, ALB + Auto Scaling |

## Cleanup (avoid charges)

    docker rm -f tracker

Then terminate the EC2 instance in the console. Keep your screenshots first.

## Risks and fallbacks

- **Docker permission denied:** log out and back in after `usermod`, or prefix commands with `sudo`.
- **Site not reachable:** check that the security group allows port 80 and that you used the public IP.
- **`ab` or `bc` not found:** re-run the `dnf install` line above.
- **Running short on time:** skip the CloudWatch alarm (a metrics screenshot is enough) and run each failure scenario only once.
