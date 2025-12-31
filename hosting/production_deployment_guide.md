# AWS Production Deployment Guide (ElastiCache, S3, SES, ClickHouse)

This guide provides step-by-step instructions for deploying AgentPlane to AWS using managed services.

## Prerequisites

- AWS Account with appropriate permissions.
- Docker & Docker Compose installed on your EC2 instance.
- Domain name managed via Route53 (optional but recommended).

---

## Step 1: Network & Security Group Setup

1.  **VPC**: Ensure you have a VPC with at least 2 public subnets and 2 private subnets.
2.  **Security Groups**:
    - **App SG**: Allow inbound 80/443 (HTTP/HTTPS) from the world (0.0.0.0/0). Allow SSH (22) from your IP.
    - **Database SG**: Allow inbound 5432 (Postgres), 6379 (Redis), 8123/9000 (ClickHouse) from **App SG**.

---

## Step 2: AWS ElastiCache (Redis)

1.  Go to the **ElastiCache Dashboard** > **Redis clusters**.
2.  Click **Create Redis cluster**.
3.  **Cluster settings**:
    - Choose **Configure and create a new cluster**.
    - **Name**: `agentplane-redis`.
    - **Engine version**: 7.x.
    - **Port**: 6379.
    - **Node type**: `cache.t3.micro` (or larger for prod).
    - **Number of replicas**: 0 (for dev) or 1+ (for HA).
4.  **Network**:
    - Select your VPC.
    - Select your Private Subnets.
    - **Security**: Assign the **Database SG**.
5.  **Encryption**: Enable **Encryption in-transit** and **Encryption at-rest** (optional but good).
    - **Important**: If you enable encryption in-transit (TLS), set `REDIS_TLS_DISABLED=false` in your `.env`.
6.  Create the cluster. copy the **Primary Endpoint** (without the port).

---

## Step 3: AWS S3 (Object Storage)

1.  Go to **S3 Dashboard** > **Create bucket**.
2.  **Bucket name**: e.g., `agentplane-assets-prod`.
3.  **Region**: Same as your EC2.
4.  **Block Public Access**: Keep **Block all public access** CHECKED.
5.  Create Bucket.
6.  **Ideally**: Use an IAM Role for EC2 instead of keys. If using keys:
    - Go to IAM > Users > Create User > `agentplane-s3-user`.
    - attach policy `AmazonS3FullAccess` (or scope it down to just this bucket).
    - Create Access Key. Save **Access Key ID** and **Secret Access Key**.

---

## Step 4: AWS SES (Email)

1.  Go to **SES Dashboard**.
2.  **Verified Identities**:
    - Click **Create identity**.
    - Select **Domain**. Enter your domain (e.g., `example.com`).
    - Follow instructions to add DKIM CNAME records to your DNS (Route53).
3.  **SMTP Settings**:
    - Go to **SMTP Settings** (sidebar).
    - Note the **SMTP endpoint** (e.g., `email-smtp.us-east-1.amazonaws.com`).
    - Click **Create SMTP credentials**.
    - This will create an IAM user. **Download the credentials**. These are your `SMTP_USER` and `SMTP_PASSWORD`.
    - **Note**: These are DIFFERENT from your standard AWS Access Keys.

---

## Step 5: ClickHouse (Self-Hosted on EC2 or Managed)

*Option A: Run ClickHouse in Docker (Simplest, included in valid config).*
*Option B: Use ClickHouse Cloud or separate EC2.*

If running in Docker (default), ensure your EC2 instance uses an EBS volume for persistence.

---

## Step 6: Deploy Services (Modular Topology)

You have three main components to deploy. You can run them on the same machine or split them across multiple instances.

**Components:**
1.  **WebApp**: Frontend/API (`hosting/docker/webapp/docker-compose.prod.yml`)
2.  **Worker**: Background Jobs (`hosting/docker/worker/docker-compose.prod.yml`)
3.  **ClickHouse**: Analytics Database (`hosting/docker/clickhouse/docker-compose.prod.yml`)

### Your Setup:
*   **Instance A**: WebApp
*   **Instance B**: Worker & ClickHouse
*   **External**: AWS ElastiCache (Redis)

---

### Instructions for Instance B (Worker + ClickHouse)

1.  **Deploy Code**: Upload `hosting/` to Instance B.
2.  **Configure Env** (`hosting/docker/.env`):
    *   Set `TRIGGER_API_URL` to point to Instance A: `http://<INSTANCE_A_PRIVATE_IP>:3000`.
    *   Set `REDIS_HOST` to your **ElastiCache Primary Endpoint**.
    *   Set `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD` (defaults: default/password).
    *   Set `TRIGGER_WORKER_TOKEN`: Generate a random string (e.g. `openssl rand -hex 16`) and paste it here.
3.  **Start Services**:
    ```bash
    cd hosting/docker
    # Start ClickHouse
    docker compose -f clickhouse/docker-compose.prod.yml up -d
    # Start Worker
    docker compose -f worker/docker-compose.prod.yml up -d
    ```
4.  **Important**: Note the **Private IP** of this instance (Instance B).

---

### Instructions for Instance A (WebApp)

1.  **Deploy Code**: Upload the **ENTIRE REPOSITORY** to Instance A (because we are building from source).
    *   `git clone https://github.com/YOGESWARAN112004/Agent-plane.git agentplane`
2.  **Configure Env** (`hosting/docker/.env`):
    *   Set `CLICKHOUSE_URL`: `http://default:password@<INSTANCE_B_PRIVATE_IP>:8123`.
    *   Set `REDIS_HOST` to your **ElastiCache Primary Endpoint**.
    *   Set `TRIGGER_WORKER_TOKEN`: **MUST MATCH** the token you created on Instance B.
3.  **Start Services (Build & Run)**:
    ```bash
    cd hosting/docker
    # This will BUILD the webapp from your source code (~5-10 mins)
    docker compose -f webapp/docker-compose.prod.yml up -d --build
    ```

---

### Final Check

1.  Login to WebApp (Instance A).
2.  Go to **Project** > **Environments**. Verify that the Worker is connected (Green status).
3.  If not connected, check `TRIGGER_API_URL` on Instance B and Security Groups.

## Step 7: Verify

1.  Visit `http://your-ec2-ip:3000`.
2.  Try to login via Magic Link.
