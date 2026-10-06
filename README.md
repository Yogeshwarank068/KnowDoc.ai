# KnowDoc AI

> **Upload. Ask. Understand.**

A modern, premium, and fully functional **AI Document Question & Answer web application** powered by the **Open Knowledge Format (OKF)** and the **Google Gemini API**.

---

## 🌟 Overview

**KnowDoc AI** allows users to upload diverse documents (PDF, Word, Excel, CSV, PowerPoint, TXT, JSON, Markdown), normalizes their heterogeneous contents into a structured **Open Knowledge Format (OKF)** representation, and enables natural language question-and-answer interactions with precise source citations powered by Google Gemini.

---

## 🚀 Key Features

- **KnowDoc AI Opening Loading Animation**: A CSS & JavaScript splash sequence featuring logo fade-in, smooth scaling, AI glow pulsing, title, tagline (*"Upload. Ask. Understand."*), animated dots, and progress indicator transitioning seamlessly into the dashboard.
- **3-Column Modern Dashboard**:
  - **Left Sidebar**: Collapsible navigation with New Chat, Document Library with file size and status badges, Recent Chats history, Theme Toggle, and Settings.
  - **Center Chat Interface**: ChatGPT-style conversational stream with Markdown rendering, suggested questions, auto-scrolling, Enter/Shift+Enter keyboard ergonomics, and Gemini thinking animation.
  - **Right Document Preview Panel**: Format-specific interactive viewer (Excel multi-sheet grid with sticky headers, PDF page-by-page reader, PowerPoint slide decks, Word sections, JSON syntax viewer).
- **Interactive Source Highlighting**: Every AI answer cites its sources (e.g., `📊 Sales.xlsx • Sheet: January • Range: A7:E7` or `📄 Report.pdf • Page 5`). Clicking any source opens the preview and illuminates the referenced section/cell with an animated pulse!
- **Answer Actions**: Instant clipboard copy (`navigator.clipboard.writeText`) with `"Copied!"` feedback, query regeneration, and 👍/👎 rating buttons.
- **Excel & Spreadsheet Intelligence**: Automatically computes totals, averages, rankings, comparisons, and extracts cell ranges.
- **Multi-Document Synthesis**: Query across multiple selected files simultaneously.
- **Multi-Step Processing Visualization**: Real-time progress feedback (`File uploaded` → `Extracting content` → `Converting to OKF` → `Preparing AI knowledge` → `Ready`).
- **20 MB Validation**: Strict pre-upload and backend validation rejecting files over 20 MB with the exact requirement notice: *"File size exceeds the 20 MB limit. Please upload a smaller file."*
- **Theme Modes**: Default Dark Charcoal SaaS theme and sleek Light theme, persisted in `localStorage`.
- **Zero-Trust Gemini Security**: The Google Gemini API key is maintained securely on the backend server and never exposed to client-side scripts.
- **Hybrid Intelligence**: Works with Google Gemini 1.5 Flash / 2.0 Flash / 1.5 Pro when configured, and features a built-in OKF Local Intelligence QA Engine as a fallback for offline or zero-configuration testing.

---

## 📐 Technology Architecture

```text
User
 ↓
KnowDoc AI Web Interface (HTML5 + CSS3 + Vanilla ES6+)
 ↓
Multipart File Upload (Max 20 MB)
 ↓
Document Parsers (pdf-parse, mammoth, xlsx, adm-zip)
 ↓
Open Knowledge Format (OKF) Normalization
 ↓
Google Gemini API (or Embedded OKF Engine)
 ↓
Synthesized Answer + Precise Citations
 ↓
Document Preview Synchronization & Highlighting
```

### Supported Document Formats

| Document Type | Extensions | OKF Representation |
| :--- | :--- | :--- |
| **PDF** | `.pdf` | Multi-page blocks, headings, paragraphs |
| **Word** | `.docx`, `.doc` | Hierarchy headings, structured paragraphs, tables |
| **Excel** | `.xlsx`, `.xls` | Tabbed sheets, columns, rows, cell ranges |
| **CSV** | `.csv` | Tabular data rows, column schemas |
| **PowerPoint** | `.pptx`, `.ppt` | Slide numbers, titles, bullet points, text runs |
| **Text** | `.txt` | Paragraphs and section breaks |
| **JSON** | `.json` | Key-value hierarchies, table arrays |
| **Markdown** | `.md`, `.markdown` | Headings, code blocks, lists, paragraphs |

---

## 📦 Project Structure

```text
KnowDoc.Ai/
├── frontend/
│   ├── index.html          # KnowDoc AI web application & splash screen
│   ├── style.css           # Vanilla CSS3 styling, glassmorphism, themes
│   ├── script.js           # Vanilla ES6+ application controller & OKF viewers
│   └── assets/
│       └── favicon.svg     # Brand SVG icon
│
├── backend/
│   ├── server.js           # Express server & static asset host
│   ├── routes/
│   │   ├── documents.js    # Upload, list, preview, and delete endpoints
│   │   └── chat.js         # Chat QA endpoint and session management
│   ├── services/
│   │   ├── geminiService.js     # Google Gemini API & OKF Intelligence Engine
│   │   ├── documentProcessor.js # Format-specific file parsers
│   │   └── okfConverter.js      # OKF standard converter & prompt serializer
│   ├── uploads/            # Server-side persistent storage
│   └── .env                # Server configuration (PORT, GEMINI_API_KEY)
│
├── sample-documents/       # Ready-to-test files (PDF, XLSX, PPTX, CSV, MD, TXT, JSON)
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration (Optional)

Create or edit `backend/.env`:

```env
PORT=5000
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

*(Note: You can also configure or update your Google Gemini API Key directly within the web application under **Settings**).*

### 3. Run the Application

```bash
npm start
```

Open your browser at:
👉 **`http://localhost:5000`**

---

## 🧪 Testing with Sample Documents

Ready-to-use sample documents are generated in `sample-documents/`:

1. `Herbal_Address.xlsx`: Large dataset (1,712 entries) with contact information.
   - *Try asking*: *"whose number is this 9080014912"* (answers: **Jothi Ramesh**)
2. `Sales_Report_2026.xlsx`: 2 sheets (*January*, *February*) with product pricing and sales figures.
   - *Try asking*: *"What is the total sales?"* or *"Which product has the highest sales?"*
3. `Enterprise_Strategy_2026.pptx`: 2 slides with executive roadmaps and revenue projections.
   - *Try asking*: *"What is the projected revenue in the strategy presentation?"*
4. `Project_Alpha_Specifications.md`: Enterprise architecture and security specifications.
   - *Try asking*: *"What are the core objectives of Project Alpha?"*
5. `Security_Compliance_Report.pdf`: 2-page SOC2 compliance and sandbox audit document.
   - *Try asking*: *"What is the data retention policy?"*
6. `Medical_Research_Summary.txt`: Clinical trial protocol and efficacy findings.
   - *Try asking*: *"What was the response rate in Cohort B?"*
7. `Employees_Performance.csv`: Departmental performance metrics and scores.
   - *Try asking*: *"Which employee had the highest performance score?"*

---

## 🔒 Security & Compliance

- **No Frontend Exposure**: Gemini API credentials are never sent to or visible in client-side code.
- **File Quarantine**: All uploaded documents are restricted to a maximum size of **20 MB per file**.
- **Sanitized Output**: Client-side rendering escapes raw HTML while styling markdown safely.
