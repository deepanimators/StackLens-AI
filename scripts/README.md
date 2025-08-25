# StackLens-AI Windows GPU Server Deployment

This folder contains only the files needed to run StackLens-AI on a Windows GPU server. Follow these steps for a seamless setup and future updates.

## 1. Prerequisites
- Windows Server with GPU (NVIDIA recommended)
- Node.js (LTS version)
- Python 3.10+
- pip (Python package manager)
- (Optional) CUDA/cuDNN for GPU acceleration
- Git (for updates)

## 2. Folder Structure
- `server/` — Node.js backend (API)
- `client/` — Built frontend (static files)
- `python-services/` — Only required ML/RAG Python scripts
- `db/stacklens.db` — SQLite database
- `requirements.txt` — Python dependencies
- `package.json`, `tsconfig.json`, etc. — Node.js dependencies

## 3. Setup Steps

### A. Install Prerequisites
1. Install Node.js: https://nodejs.org/
2. Install Python: https://www.python.org/
3. (Optional) Install CUDA/cuDNN for GPU: https://developer.nvidia.com/cuda-downloads
4. Install Git: https://git-scm.com/

### B. Install Dependencies
1. Open Command Prompt or PowerShell in this folder.
2. Install Node.js dependencies:
   ```
npm install
   ```
3. Install Python dependencies:
   ```
pip install -r requirements.txt
   ```

### C. Start Services
1. Start Python microservices (in a new terminal):
   ```
python python-services/start_vector_service.py
   ```
   (Add other scripts as needed)
2. Start Node.js backend:
   ```
npm run start
   ```
3. The frontend will be served by the backend or as static files in `client/`.

### D. Open Firewall Ports
- Allow the required ports (e.g., 3000, 5000) in Windows Firewall.

### E. Access the App
- Open `http://<server-ip>:<port>` in your browser.

## 4. For Future Updates
- Use Git to pull updates:
  ```
git pull
  ```
- Reinstall dependencies and restart services if needed.

---

## Only include the following files:
- Minimal backend files from `server/`
- Only required scripts from `python-services/`
- Built frontend from `client/dist/`
- `db/stacklens.db`
- `requirements.txt`, `package.json`, etc.

Remove unnecessary files for a clean deployment.
