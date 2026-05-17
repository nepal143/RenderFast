# RenderFast

**Distributed Blender rendering across multiple Kaggle GPU instances — free & open source.**

Upload a `.blend` file, add your Kaggle accounts, and RenderFast splits your frames evenly across every account and renders them in parallel. You get a live progress view and a combined ZIP of all rendered frames when done.

---

## How It Works

1. You add one or more Kaggle accounts (username + API key) in the UI.
2. You upload a `.blend` file and specify the total frame count.
3. RenderFast uploads the blend file as a **public Kaggle dataset**.
4. For each Kaggle account, it creates and runs a notebook that renders the assigned frame range using Blender headlessly (GPU-accelerated).
5. Live progress is streamed to the UI via WebSocket.
6. Once complete, frames are downloaded from each kernel output and offered as a combined ZIP.

### Example

| Account      | Frames Rendered |
|-------------|----------------|
| nepalsss007 | 1 – 100        |
| nepalsss008 | 101 – 200      |
| kingsmen    | 201 – 300      |

All render in **parallel** → ~3× faster than a single instance.

---

## Project Structure

```
renderFast/
├── backend/                  # FastAPI Python backend
│   ├── main.py
│   ├── requirements.txt
│   ├── routers/
│   │   ├── accounts.py       # Kaggle account management
│   │   ├── jobs.py           # Job submission
│   │   ├── progress.py       # WebSocket live progress
│   │   └── download.py       # Frame download + ZIP
│   ├── services/
│   │   ├── accounts_service.py
│   │   ├── kaggle_service.py  # Kaggle API wrapper
│   │   └── render_service.py  # Job orchestration
│   ├── kaggle_notebook/
│   │   └── render_template.ipynb  # Runs on each Kaggle instance
│   ├── data/                  # Persisted accounts & jobs (gitignored)
│   ├── uploads/               # Uploaded blend files (gitignored)
│   └── rendered_frames/       # Downloaded frames (gitignored)
│
└── frontend/                  # React + Vite + Tailwind frontend
    ├── src/
    │   ├── pages/
    │   │   ├── RenderPage.jsx
    │   │   ├── AccountsPage.jsx
    │   │   ├── JobsPage.jsx
    │   │   └── JobDetailPage.jsx
    │   ├── api.js
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Kaggle API credentials](https://www.kaggle.com/docs/api) for each account you want to use

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Contributing

This is an open source project. PRs and issues are welcome!

1. Fork the repo
2. Create a feature branch
3. Submit a pull request

## License

MIT
