# ✨ Flex Prime: Supercharge Your FAST University LMS Experience ✨

Flex Prime is a browser extension built to make the FAST University FlexStudent portal actually pleasant to use. It fixes broken features, adds missing ones, and gives the whole interface a modern coat of paint — all without touching your login session.

<p align="center">
  <img width="397" height="686" alt="image" src="https://github.com/user-attachments/assets/fa13dd1e-862c-4db9-927f-eae544a0da44" />
</p>

---

## 📝 Features

### 01 — Grand Total Marks Fix
The marks page normally makes you click a "Calculate" button for every single course. Flex Prime eliminates this entirely — it automatically computes and fills in the Grand Total row for every course at once, including Total Marks, Obtained Marks, Class Average, Minimum, and Maximum. The Grand Total accordion also expands automatically so results are immediately visible.

- Calculates totals for all courses simultaneously
- Shows Total Marks, Obtained, Class Avg, Min & Max
- Grand Total panel auto-expands — no manual clicking
- Shortcut: `Ctrl + Shift + F`

---

### 02 — What-If GPA Calculator
Wondering how your grade choices will affect your GPA? The calculator injects interactive dropdowns directly into the Transcript page for your current semester. Change any grade and your SGPA and CGPA update instantly. Handles course repeats correctly by always using the latest grade per subject.

- Live SGPA and CGPA recalculation as you change grades
- Handles repeat courses — uses latest grade per subject
- Colour-coded chips: green (3.5+), blue (3.0+), amber (2.5+), red (<2.5)
- Shortcut: `Ctrl + Shift + S`

---

### 03 — Attendance Tracker
The default attendance page only shows a vague progress bar. Flex Prime overlays a clear summary badge on every course tab with the exact numbers you need. A warning fires automatically when your attendance drops below the critical 80% threshold.

- Absents, Presents, and Total class count per course
- Precise attendance percentage calculated per course
- Red warning badge when below 80% — never miss the cutoff
- Updates automatically when switching between course tabs

---

### 04 — Marks Change Highlighter
Tired of checking every course tab manually to see if new marks were uploaded? Flex Prime silently snapshots your marks on every visit. The next time anything changes, multiple layers of alerts fire simultaneously so you can't miss it.

**Course-level alerts:**
- Pulsing teal glow + "UPDATED" badge on the affected course tab
- Top-of-page banner listing every updated course by name
- Teal ring on the Marks icon in the sidebar — visible on every page of the portal

**Section-level alerts (when you click the course tab):**
- The exact section where marks changed (Quiz, Assignment, Sessional, etc.) gets a glowing teal left border and pulsing background
- A bold "▲ NEW MARKS" pill appears next to the section name — impossible to miss
- All other sections remain untouched so you know exactly what's new

**Acknowledgement:**
- Highlights clear automatically after 6 seconds of viewing, or immediately on a second click
- Banner updates in real-time as you acknowledge each course — disappears when all are seen
- Sidebar ring clears once all pending updates are acknowledged

<img width="1918" height="777" alt="marks_highlight" src="https://github.com/user-attachments/assets/846d936b-6ab9-44e7-812d-e71ce9096dde" />


---

### 05 — Transcript PDF Export
Generate a clean, print-ready academic transcript straight from the portal. The exported document is styled with university branding, organises all semesters into clearly formatted tables, and shows your CGPA in a prominent summary bar. Open it in a new tab and print or save as PDF in one click.

- Full semester-by-semester course breakdown
- SGPA and CGPA shown per semester and overall
- University-branded header — looks like an official document
- Accessible from the extension popup on the Transcript page

---

### 06 — Feedback Autofill
Course feedback forms taking too long? Select your preferred response — Strongly Agree, Agree, Uncertain, Dissatisfied, Strongly Disagree, or Randomised — and Flex Prime fills in every question simultaneously. What used to take minutes now takes one click.

- Six response options including a smart randomise mode
- Fills every question on the form in one shot
- Accessible directly from the extension popup

---

### 07 — Theme Engine
FlexStudent's default UI is dated and hard on the eyes during late-night sessions. Flex Prime rebuilds the entire portal with a polished design system using Plus Jakarta Sans and JetBrains Mono typefaces, smooth animations, and refined card layouts. Choose from three carefully crafted themes.

- **Midnight** — deep navy/slate dark theme for night sessions *(default)*
- **Classic** — clean white/blue premium light theme
- **Nordic** — authentic Nord Arctic colour palette
- Theme persists across sessions and page navigations

---

### 08 — Smart Keyboard Shortcuts
Every core feature is reachable without touching the mouse. Press a shortcut from anywhere on the FlexStudent portal and Flex Prime navigates to the correct page automatically — without logging you out — then activates the feature once the page has loaded.

| Shortcut | Feature |
|---|---|
| `Ctrl + Shift + F` | Fix Grand Total Marks (navigates if needed) |
| `Ctrl + Shift + S` | Launch GPA Calculator (navigates if needed) |

---

## 🎨 Themes

**Midnight**
<img width="1717" height="539" alt="image" src="https://github.com/user-attachments/assets/60f9ee51-243f-4552-b911-d589ff697b5a" />

**Classic**
<img width="1734" height="542" alt="image" src="https://github.com/user-attachments/assets/b2b1bc65-b7e5-4913-b084-6201ed1422ef" />

**Nordic**
<img width="1718" height="543" alt="image" src="https://github.com/user-attachments/assets/b606e8a2-1fc5-45a4-b752-53166d889bd6" />

---

## 🚀 Installation

1. **Download the ZIP** — Download the latest FlexPrime `.zip` file. Keep it as a zip for now.
2. **Open Chrome Extensions** — Navigate to `chrome://extensions` in Google Chrome (or `edge://extensions` for Edge).
3. **Enable Developer Mode** — Toggle on "Developer mode" in the top-right corner of the Extensions page.
4. **Extract the ZIP** — Extract the FlexPrime `.zip` to any folder. You should see `background.js`, `content.js`, `popup.html`, `popup.js`, `manifest.json`, and `favicon.png`.
5. **Load the Extension** — Click "Load unpacked" and select the extracted FlexPrime folder. The extension will appear in your list immediately.
6. **Pin to Toolbar** — Click the puzzle-piece icon in Chrome's toolbar, find Flex Prime, and pin it for quick access.

**Updating to a new version:** Extract the new ZIP, then go to `chrome://extensions`, find Flex Prime, and click the reload icon on its card. No need to remove and re-add it.

> **Firefox:** Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on...", and select the `manifest.json` file inside the extracted folder.

---

## 🤝 Contributing

Bug reports, feature suggestions, and pull requests are all welcome.

- **Bugs** — Open a GitHub issue with a description, steps to reproduce, and your browser version.
- **Feature ideas** — Open an issue to discuss the proposal before writing code.
- **Pull requests** — Fork the repo, create a branch (`feature/name` or `bugfix/issue`), make your changes in JavaScript/HTML, and open a PR against `main` with a clear description.

---

*Built with care by [Abdul Rauf](https://www.linkedin.com/in/abdul-rauf17/) — FAST-NUCES Islamabad*
