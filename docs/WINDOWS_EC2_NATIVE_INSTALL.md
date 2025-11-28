# StackLens Windows EC2 Installation Guide (No Docker)

This guide explains how to install Kafka and OpenTelemetry on Windows EC2 **without Docker**.

## Prerequisites

- Windows Server 2019/2022 or Windows 10/11
- Administrator access
- Internet connection
- At least 4GB RAM, 20GB disk space

## Quick Installation

### Option 1: One-Click Install (Recommended)

1. Open PowerShell as **Administrator**
2. Navigate to the scripts folder:
   ```powershell
   cd C:\path\to\StackLens-AI-Deploy\scripts
   ```
3. Run the installer:
   ```powershell
   .\install-services-windows.ps1
   ```

Or double-click `install-services.bat` (right-click → Run as Administrator)

### Option 2: Manual Installation

See [Manual Installation](#manual-installation) section below.

---

## What Gets Installed

| Component | Version | Port | Description |
|-----------|---------|------|-------------|
| Java OpenJDK | 21 | - | Required for Kafka |
| Apache Kafka | 3.7.0 | 9092 | Message broker (KRaft mode) |
| OpenTelemetry Collector | 0.91.0 | 4317, 4318 | Telemetry collection |

### Installation Directory Structure

```
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\
├── kafka\                    # Kafka installation
│   ├── bin\windows\          # Kafka scripts
│   └── libs\                 # Kafka libraries
├── otel-collector\           # OTEL Collector
│   └── otelcol-contrib.exe
├── config\                   # Configuration files
│   ├── kraft-server.properties
│   └── otel-collector-config.yaml
├── data\                     # Data directories
│   ├── kafka-logs\
│   └── cluster_id.txt
├── logs\                     # Log files
├── nssm\                     # Service manager
├── start-services.ps1        # Start script
├── stop-services.ps1         # Stop script
└── status-services.ps1       # Status script
```

---

## Managing Services

### Start Services
```powershell
# Using management script
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\start-services.ps1

# Or using Windows Services
Start-Service StackLensKafka
Start-Service StackLensOtel
```

### Stop Services
```powershell
# Using management script
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\stop-services.ps1

# Or using Windows Services
Stop-Service StackLensKafka
Stop-Service StackLensOtel
```

### Check Status
```powershell
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\status-services.ps1

# Or check individual services
Get-Service StackLensKafka, StackLensOtel
```

### View Logs
```powershell
# Kafka logs
Get-Content C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\logs\kafka-stdout.log -Tail 50

# OTEL logs
Get-Content C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\logs\otel-stdout.log -Tail 50
```

---

## Kafka Commands

### List Topics
```powershell
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
```

### Create Topic
```powershell
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic my-topic --partitions 3
```

### Describe Topic
```powershell
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --describe --topic my-topic
```

### Console Producer
```powershell
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-console-producer.bat --bootstrap-server localhost:9092 --topic my-topic
```

### Console Consumer
```powershell
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic my-topic --from-beginning
```

---

## EC2 Configuration

### Security Group Rules

Add these inbound rules to your EC2 Security Group:

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| Custom TCP | TCP | 9092 | Your IP / VPC | Kafka |
| Custom TCP | TCP | 4317 | Your IP / VPC | OTEL gRPC |
| Custom TCP | TCP | 4318 | Your IP / VPC | OTEL HTTP |
| Custom TCP | TCP | 4000 | 0.0.0.0/0 | StackLens API |
| Custom TCP | TCP | 5173 | 0.0.0.0/0 | StackLens Web |

### External Access Configuration

If you need external access to Kafka (from outside the EC2):

1. Edit `C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\config\kraft-server.properties`:
   ```properties
   # Replace with your EC2 public IP or DNS
   advertised.listeners=PLAINTEXT://YOUR_EC2_PUBLIC_IP:9092
   ```

2. Restart Kafka:
   ```powershell
   Restart-Service StackLensKafka
   ```

---

## Troubleshooting

### Kafka Won't Start

1. **Check Java:**
   ```powershell
   java -version
   ```
   If not found, install Java:
   ```powershell
   winget install Microsoft.OpenJDK.21
   ```

2. **Check logs:**
   ```powershell
   Get-Content C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\logs\kafka-stderr.log -Tail 100
   ```

3. **Check port:**
   ```powershell
   Get-NetTCPConnection -LocalPort 9092 -ErrorAction SilentlyContinue
   ```

4. **Re-format storage:**
   ```powershell
   Stop-Service StackLensKafka
   Remove-Item C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\data\kafka-logs -Recurse -Force
   $clusterId = Get-Content C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\data\cluster_id.txt
   & C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-storage.bat format -t $clusterId -c C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\config\kraft-server.properties
   Start-Service StackLensKafka
   ```

### OTEL Collector Won't Start

1. **Check logs:**
   ```powershell
   Get-Content C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\logs\otel-stderr.log -Tail 50
   ```

2. **Validate config:**
   ```powershell
   C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\otel-collector\otelcol-contrib.exe validate --config=C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\config\otel-collector-config.yaml
   ```

3. **Check port conflicts:**
   ```powershell
   Get-NetTCPConnection -LocalPort 4317, 4318 -ErrorAction SilentlyContinue
   ```

### Service Fails to Start

1. **Check Windows Event Log:**
   ```powershell
   Get-EventLog -LogName Application -Source "StackLens*" -Newest 10
   ```

2. **Reinstall service:**
   ```powershell
   C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\nssm\nssm.exe remove StackLensKafka confirm
   C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\nssm\nssm.exe install StackLensKafka "C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-server-start.bat" "C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\config\kraft-server.properties"
   ```

---

## Manual Installation

If the automated script doesn't work, follow these steps:

### 1. Install Java

```powershell
# Using winget
winget install Microsoft.OpenJDK.21

# Or download from https://adoptium.net/
```

### 2. Install Kafka

```powershell
# Download
Invoke-WebRequest -Uri "https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz" -OutFile kafka.tgz

# Extract
tar -xzf kafka.tgz
Move-Item kafka_2.13-3.7.0 C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka

# Generate cluster ID
$clusterId = & C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-storage.bat random-uuid

# Format storage
& C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-storage.bat format -t $clusterId -c C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\config\kraft\server.properties
```

### 3. Install OpenTelemetry Collector

```powershell
# Download
$url = "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.91.0/otelcol-contrib_0.91.0_windows_amd64.tar.gz"
Invoke-WebRequest -Uri $url -OutFile otel.tar.gz

# Extract
mkdir C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\otel-collector
tar -xzf otel.tar.gz -C C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\otel-collector
```

### 4. Start Services Manually

```powershell
# Start Kafka (in one terminal)
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\kafka\bin\windows\kafka-server-start.bat C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\config\kraft-server.properties

# Start OTEL (in another terminal)
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\otel-collector\otelcol-contrib.exe --config=C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\config\otel-collector-config.yaml
```

---

## Uninstallation

```powershell
# Stop and remove services
Stop-Service StackLensKafka, StackLensOtel -ErrorAction SilentlyContinue
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\nssm\nssm.exe remove StackLensKafka confirm
C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\nssm\nssm.exe remove StackLensOtel confirm

# Remove firewall rules
Remove-NetFirewallRule -DisplayName "StackLens-*"

# Delete installation directory
Remove-Item C:\Users\Administrator\Downloads\stacklens-ai\infrastructure -Recurse -Force
```

---

## Support

For issues, check:
1. Log files in `C:\Users\Administrator\Downloads\stacklens-ai\infrastructure\logs\`
2. Windows Event Viewer
3. GitHub Issues: https://github.com/deepanimators/StackLens-AI/issues
