# Visual Studio Code Setup Guide - Prabhu's Custom RAG

This guide will walk you through setting up Prabhu's Custom RAG application using Visual Studio Code after cloning from GitHub.

---

## Prerequisites

Before starting, ensure you have:
- **Visual Studio Code** installed ([Download here](https://code.visualstudio.com/))
- **Python 3.9+** installed ([Download here](https://www.python.org/downloads/))
- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed ([Download here](https://git-scm.com/))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

---

## Step 1: Clone the Repository

### Option A: Using VS Code Git Extension

1. Open Visual Studio Code
2. Click **File** → **Clone Repository** (or press `Ctrl+Shift+P` and type "Git: Clone")
3. Enter the GitHub repository URL
4. Choose a folder to clone the repository
5. Click **Open** when prompted

### Option B: Using Terminal

1. Open VS Code
2. Open integrated terminal: **Terminal** → **New Terminal** (or press `` Ctrl+` ``)
3. Navigate to your desired folder and run:
   ```bash
   git clone <repository-url>
   cd custom-rag-v1
   code .
   ```

---

## Step 2: Install VS Code Extensions (Recommended)

Open the Extensions panel (`Ctrl+Shift+X`) and install:

1. **Python** (by Microsoft) - For Python development
2. **ES7+ React/Redux/React-Native snippets** - For React development
3. **Tailwind CSS IntelliSense** - For Tailwind CSS support
4. **GitLens** - Enhanced Git capabilities (optional)
5. **Prettier** - Code formatter (optional)

---

## Step 3: Backend Setup

### 3.1 Open Backend Folder in VS Code Terminal

1. In VS Code, open the integrated terminal: **Terminal** → **New Terminal** (`` Ctrl+` ``)
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```

### 3.2 Create Virtual Environment

In the terminal, run:

**Windows:**
```bash
python -m venv venv
```

**macOS/Linux:**
```bash
python3 -m venv venv
```

### 3.3 Activate Virtual Environment

**Windows (PowerShell):**
```bash
.\venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```bash
venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt, indicating the virtual environment is active.

### 3.4 Install Python Dependencies

With the virtual environment activated, run:
```bash
pip install -r requirements.txt
```

### 3.5 Verify Backend Setup

Test that everything is installed correctly:
```bash
python --version
pip list
```

---

## Step 4: Frontend Setup

### 4.1 Open New Terminal for Frontend

In VS Code, open a second terminal:
- **Terminal** → **New Terminal** (or click the `+` icon in the terminal panel)
- Or split the terminal using the split icon

### 4.2 Navigate to Frontend Folder

In the new terminal:
```bash
cd frontend
```

### 4.3 Install Node Dependencies

```bash
npm install
```

This may take a few minutes to install all packages.

### 4.4 Verify Frontend Setup

Check Node and npm versions:
```bash
node --version
npm --version
```

---

## Step 5: Configure VS Code Settings (Optional but Recommended)

### 5.1 Python Interpreter Selection

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Python: Select Interpreter"
3. Choose the interpreter from `./backend/venv/Scripts/python.exe` (Windows) or `./backend/venv/bin/python` (macOS/Linux)

### 5.2 Create VS Code Workspace Settings

Create `.vscode/settings.json` in the project root:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/Scripts/python.exe",
  "python.terminal.activateEnvironment": true,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "backend/chroma_db": false,
    "backend/uploads": false
  },
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Step 6: Running the Application

### 6.1 Start Backend Server

1. Ensure you're in the `backend` folder terminal
2. Virtual environment should be activated (you see `(venv)`)
3. Run:
   ```bash
   python main.py
   ```

   Or using uvicorn:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. You should see: `INFO: Uvicorn running on http://0.0.0.0:8000`

### 6.2 Start Frontend Server

1. In the second terminal, ensure you're in the `frontend` folder
2. Run:
   ```bash
   npm run dev
   ```

3. You should see: `Local: http://localhost:3000`

### 6.3 Open in Browser

VS Code should automatically suggest opening the browser, or manually go to:
**http://localhost:3000**

---

## Step 7: Using VS Code Tasks (Optional)

Create `.vscode/tasks.json` for easier server management:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Backend",
      "type": "shell",
      "command": "python main.py",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "problemMatcher": [],
      "isBackground": true,
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      }
    },
    {
      "label": "Start Frontend",
      "type": "shell",
      "command": "npm run dev",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "problemMatcher": [],
      "isBackground": true,
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      }
    },
    {
      "label": "Start Both Servers",
      "dependsOrder": "parallel",
      "dependsOn": ["Start Backend", "Start Frontend"]
    }
  ]
}
```

**Usage:** Press `Ctrl+Shift+P` → type "Tasks: Run Task" → select "Start Both Servers"

---

## Step 8: Debugging Configuration

### 8.1 Python Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/backend/main.py",
      "console": "integratedTerminal",
      "justMyCode": true,
      "env": {
        "PYTHONPATH": "${workspaceFolder}/backend"
      }
    }
  ]
}
```

Press `F5` to start debugging the backend.

### 8.2 React Debugging

Install the "Debugger for Chrome" extension, then add to `launch.json`:

```json
{
  "name": "Launch Chrome",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend"
}
```

---

## Step 9: First Run Checklist

- [ ] Repository cloned successfully
- [ ] Python virtual environment created and activated
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 3000
- [ ] Browser opens to http://localhost:3000
- [ ] OpenAI API key entered in the application
- [ ] Test file upload works
- [ ] Chat interface responds correctly

---

## Step 10: Troubleshooting

### Backend Won't Start

**Issue:** `python: command not found`
- **Solution:** Make sure Python is in your PATH, or use `py` (Windows) or `python3` (macOS/Linux)

**Issue:** `ModuleNotFoundError`
- **Solution:** Ensure virtual environment is activated and dependencies are installed

**Issue:** Port 8000 already in use
- **Solution:** Change port in `main.py` or stop the process using port 8000:
  ```bash
  # Windows
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F
  
  # macOS/Linux
  lsof -ti:8000 | xargs kill
  ```

### Frontend Won't Start

**Issue:** `npm: command not found`
- **Solution:** Install Node.js from nodejs.org

**Issue:** Port 3000 already in use
- **Solution:** Change port in `vite.config.js` or stop the process

**Issue:** `npm install` fails
- **Solution:** Delete `node_modules` and `package-lock.json`, then run `npm install` again

### General Issues

**Issue:** Can't activate virtual environment in PowerShell
- **Solution:** Run PowerShell as Administrator and execute:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

**Issue:** VS Code can't find Python interpreter
- **Solution:** Use `Ctrl+Shift+P` → "Python: Select Interpreter" → choose venv interpreter

---

## Quick Start Commands

Once everything is set up, you can quickly start both servers:

**Terminal 1 (Backend):**
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows PowerShell
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## Project Structure in VS Code

```
custom-rag-v1/
├── .vscode/              # VS Code settings (create this)
│   ├── settings.json
│   ├── tasks.json
│   └── launch.json
├── backend/              # Python FastAPI backend
│   ├── venv/            # Virtual environment (created)
│   ├── services/
│   ├── main.py
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Tips for VS Code Users

1. **Use Integrated Terminal:** Always use VS Code's integrated terminal to keep context
2. **Split Terminal:** Run backend and frontend side-by-side
3. **Python Extension:** Install the Python extension for IntelliSense and debugging
4. **Git Integration:** Use VS Code's built-in Git for version control
5. **Live Server:** Frontend auto-reloads on save (thanks to Vite)
6. **Backend Reload:** Use `--reload` flag with uvicorn for auto-reload

---

## Need Help?

- Check the main `README.md` for general setup
- Review `TROUBLESHOOTING.md` for common issues
- Check backend terminal for detailed error messages
- Use browser Developer Tools (F12) for frontend debugging

Happy coding! 🚀
