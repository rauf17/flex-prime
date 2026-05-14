Flex Prime
NU FlexStudent toolkit — a Chrome extension built for FAST-NUCES students.
Fixes marks, calculates GPA, tracks attendance, exports transcripts, and themes the entire portal.
<p align="center"> <img width="320" alt="Flex Prime Popup" src="https://github.com/user-attachments/assets/e4513911-7de0-4001-8572-be3b6ac24737" /> </p> 

Features
Fix Grand Total Marks
Flex hides grand total rows after a certain point — this recalculates and re-injects them client-side.
* Visit flexstudent.nu.edu.pk/Student/StudentMarks
* Click Fix Grand Total in the popup (or press Ctrl+Shift+F)
* All course grand totals are restored instantly
Note: Total obtained marks are precise. Class average, min, and max are approximated from the weighted data visible on the page — full class data isn't available client-side.

GPA Calculator (SGPA + CGPA)
Overlays grade dropdowns on your Transcript page and calculates both SGPA and CGPA live as you change grades.
* Visit flexstudent.nu.edu.pk/Student/Transcript
* Click GPA Calculator in the popup (or press Ctrl+Shift+S)
* Dropdowns appear on the current (latest) semester only
* SGPA updates from current semester grades
* CGPA recalculates across all semesters, using the latest grade per course (handles repeated courses correctly)
* Color-coded result chips: green ? 3.5 · blue ? 3.0 · amber ? 2.5 · red < 2.5

Attendance Tracker
Automatically enhances the attendance page with absent/present counts and a percentage badge per course.
* Visit flexstudent.nu.edu.pk/Student/StudentAttendance
* No button needed — injects automatically on page load
* Shows: ? Absents · ? Present · Total · Attendance %
* Highlights courses below 80% with a warning badge
* Progress bar in the portlet head fixed to display correctly

Export Transcript (PDF)
Generates a clean printable HTML transcript styled like an official document.
* Must be on the Transcript page
* Click Export Transcript in the popup
* Opens a new tab with a formatted A4 document including CGPA, all semesters, and a print button
* Includes student name and roll number scraped from the page

Feedback Autofill
Auto-selects a feedback option across all questions on the feedback page in one click.
* Visit flexstudent.nu.edu.pk/Student/FeedBackQuestions
* Choose a response in the popup: Strongly Agree / Agree / Uncertain / Dissatisfied / Strongly Disagree / Random
* Click Autofill Feedback

Marks Change Highlighter
Detects when marks have been updated since your last visit and highlights the changed course tab.
* Works automatically on the Marks page
* Changed course tabs glow with a teal UPDATED badge
* A banner appears listing all changed courses
* Snapshot resets when you click the highlighted tab (marks seen)

Theme Engine
Three full UI themes that restyle the entire FlexStudent portal.
ThemeDescriptionClassicClean white/blue premium light themeMidnightDeep navy/slate dark themeNordicNord Arctic blue-grey dark themeSelect a theme from the popup — applies instantly across the whole portal via injected CSS.

Scroll to Top
A floating ? button appears on long pages after scrolling 300px. Smooth-scrolls back to top.

Installation
No dependencies. Chrome only.
1. Clone or download this repository
2. Go to chrome://extensions/
3. Enable Developer mode (top right toggle)
4. Click Load unpacked and select the project folder
5. Pin the extension for easy access

Keyboard Shortcuts
ShortcutActionCtrl+Shift+FFix Grand Total MarksCtrl+Shift+SToggle GPA Calculator
File Structure
flex-prime/
??? manifest.json      # Extension config, permissions, shortcuts
??? popup.html         # Popup UI
??? popup.js           # Popup logic — button handlers, theme switcher
??? background.js      # Service worker — keyboard shortcut listener, injected functions
??? content.js         # Content script — theming, attendance badges, marks highlighter
??? favicon.png        # Extension icon

Disclaimer
This extension performs client-side DOM manipulation only. It does not send any data anywhere, does not modify server-side records, and does not bypass any authentication. Use responsibly and at your own risk.

Built for FAST-NUCES Islamabad · by Abdul Rauf

