# 🟢 PaciBot – WhatsApp Group Monitoring & Support Assistant

PaciBot is an intelligent, automated assistant built on top of the WhatsApp Web.js library to streamline client communication and support workflows. It monitors predefined WhatsApp groups, tracks client queries, escalates issues, and logs all activities into Google Sheets. Designed specifically for financial service operations, it also collects client feedback and provides automated daily summaries.

---

## 🔧 Features

* **Group Monitoring**: Watches selected WhatsApp groups and logs all client messages and accountant replies.
* **Auto-Escalation**: Triggers alerts to Google Chat if a client message remains unanswered for 30 minutes.
* **After-Hours Flow**: During non-working hours, prompts clients for urgency and escalates if the score is ≥8 or if the client explicitly says “yes”.
* **Feedback System**: Automatically prompts for feedback on the last working day of the month and logs responses + comments.
* **Google Sheets Logging**: All messages, replies, and feedback are appended to designated Google Sheets for auditing and analytics.
* **Chat Health Monitor**: Posts a health ping every 30 minutes and sends daily summaries at 7 PM and 10 AM via Google Chat.
* **Session Persistence**: Uses local authentication to maintain WhatsApp session across restarts.

---

## 🗂️ Folder Structure

```bash
paci-wa-bot/
├── index.js               # Main bot logic
├── creds.json             # Google Sheets API credentials
├── .env                   # Environment variables (secrets)
├── package.json           # Node dependencies
├── node_modules/          # Installed packages
└── README.md              # This file
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites

* Node.js (v16+)
* WhatsApp account with stable web access
* Google Cloud Platform project with Sheets API enabled

### 2. Clone & Install

```bash
git clone https://github.com/your-org/paci-wa-bot.git
cd paci-wa-bot
npm install
```

### 3. Configure Environment

Create a `.env` file:

```
SHEET_ID=your_google_sheet_id
CHAT_WEBHOOK=https://chat.googleapis.com/...
```

Place your `creds.json` from Google Cloud in the root directory.

### 4. Run the Bot

```bash
node index.js
```

On first run, scan the QR code from your WhatsApp account to authenticate.

---

## ⏰ Time Zone Behavior

* Working hours: **9:00 AM – 7:00 PM IST** (configurable)
* Logs both IST and GST (Gulf Standard Time) timestamps for accuracy.

---

## 📝 Google Sheets Format

### Sheet1 (Main Log)

\| IST Time | GST Time | Group | Message | Status | Responded By | Delay (min) |

### FeedbackResponses

\| IST Time | Group | Client Number | Rating (1-5) | Comment |

---

## 📣 Alerts & Summaries

* **Google Chat Alerts**:

  * If no accountant replies in 30 minutes
  * After-hours high urgency or "yes" triggers
* **Daily Summary**:

  * 7 PM: Summary of working hour queries
  * 10 AM: Summary of overnight queries

---

## 👨‍💪 Maintenance & Troubleshooting

* Logs show all incoming group messages.
* Bot health checks every 30 minutes.
* If WhatsApp session breaks, rescan QR.
* You can run the bot in background using [PM2](https://pm2.keymetrics.io/):

```bash
pm2 start index.js --name paci-bot
```

---

## 🧐 Customization

You can easily customize:

* `CLIENTS`: Add or remove WhatsApp numbers
* `allowedGroups`: Add new WhatsApp group names
* `ACCOUNTANTS`: Map new accountant numbers to names
* Feedback triggers, time thresholds, escalation rules

---

## 📜 License

This project is proprietary and developed by the Paci team for internal automation. Contact the maintainers for collaboration or licensing inquiries.

---

## 🤛 Maintainer

**Paci Fintech FZ LLC**
Dubai, UAE
📧 [support@paci.ai](mailto:sahil@paci.ai)
