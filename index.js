  // Client Numbers Tracked
  const CLIENTS = [
    '8360446897@c.us'
  ];

  // Groups Tracked
  const allowedGroups = [
    'Paci testing',
  ];

  //Accountants Tracked
  const ACCOUNTANTS = {
    '9719620604923@c.us': 'Ram',
    '971505415707@c.us': 'Ram UAE',
    '971581786407@c.us': 'Nahas',
    '917760780877@c.us': 'Vindhya',
    '971503478717@c.us': 'Vindhya UAE',
    '971502030076@c.us': 'Gulnar'
  };

  //Name of the bot
  const BOT_NAME = 'PaciBot';

  // === Required Libraries and Config ===
  require('dotenv').config();
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const qrcode = require('qrcode-terminal');
  const axios = require('axios');
  const { google } = require('googleapis');

  // === Environment Variables ===
  const CHAT_WEBHOOK = process.env.CHAT_WEBHOOK;
  const SHEET_ID     = process.env.SHEET_ID;
  const WORK_START   = 10; // 10 AM IST
  const WORK_END     = 19; // 7 PM GST

  // === WhatsApp Client Setup ===
  const wa = new Client({ authStrategy: new LocalAuth() });
  const pending = new Map(); // Tracks pending client messages
  const afterHoursStage = new Map(); // Tracks conversation stage after hours
  const feedbackPrompted = new Map(); // Tracks if feedback asked
  const feedbackWindow = new Map(); // Tracks feedback window for rating
  const feedbackCommentWindow = new Map(); // Tracks window for collecting comment

  // === Daily Stats Tracker ===
  let dailyStats = {
    receivedToday: 0,
    answeredToday: 0,
    receivedOvernight: 0
  };

  // === Google Sheets Setup ===
  const auth = new google.auth.GoogleAuth({
    keyFile: 'creds.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // === Append Message to Sheet  ===
  async function appendRow(row) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:G',
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    });
  }

  // === Append Feedback to Sheet ===
  async function appendFeedback(row) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'FeedbackResponses!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    });
  }

  // === QR Code Event ===
  wa.on('qr', qr => qrcode.generate(qr, { small: true }));
  // === Ready Event ===
  wa.on('ready', () => console.log('✅ WhatsApp connected'));
  // === Disconnection and Failure Events ===
  wa.on('disconnected', (reason) => {
    console.error(`❌ WhatsApp disconnected: ${reason}`);
    axios.post(CHAT_WEBHOOK, { text: `❌ *PaciBot disconnected from WhatsApp.* Reason: ${reason}` })
      .catch(err => console.error('❌ Failed to notify Chat:', err.message));
  });

  wa.on('auth_failure', (msg) => {
    console.error(`❌ Authentication failed: ${msg}`);
    axios.post(CHAT_WEBHOOK, { text: `❌ *PaciBot authentication failed.* Check if the number is still logged in.` })
      .catch(err => console.error('❌ Failed to notify Chat:', err.message));
  });

  // === Core Message Handler ===
  wa.on('message_create', async msg => {
    const chat = await msg.getChat();
    if (!chat.isGroup || !allowedGroups.includes(chat.name.trim())) return;

    const sender = (msg.author || '').toLowerCase();
    const isClient = CLIENTS.includes(sender);
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const gstTime = now.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });

    const inHours = now.getHours() >= WORK_START && now.getHours() < WORK_END;
    const groupId = chat.id._serialized;

    // === After-Hours Message Handling ===
    if (isClient && !inHours) {
      // Log every after-hours message from client
    console.log(`🌙 [AFTER HOURS] Message from ${sender} in group "${chat.name}": ${msg.body}`);
  // Check current conversation stage with this group
      const stage = afterHoursStage.get(groupId);

      // Check current conversation stage with this group
      if (!stage) {
        await chat.sendMessage(`${BOT_NAME}: Our office active hours are 7:30 AM – 5:30 PM GST (Monday to Friday).\nCan you let me know how urgent this is (1–10)?`);
        afterHoursStage.set(groupId, 'askedUrgency');
        console.log('📨 Asked client for urgency level.');
        return;
      }

      // Second message – client has responded with urgency rating
      if (stage === 'askedUrgency') {
        const urgency = msg.body.trim();
        console.log(`📩 Urgency received: "${urgency}" from ${chat.name}`);
      
        if (/^([1-9]|10)$/.test(urgency)) {
          const level = parseInt(urgency);
          dailyStats.receivedOvernight++;
      
          // Store urgency message in sheet
          await appendRow([istTime, gstTime, chat.name, msg.body, 'After-Hours', '', '']);
      
          if (level >= 8) {
            await alertChat(chat, msg);
            await chat.sendMessage(`⚠️ ${BOT_NAME} has marked this as high urgency and alerted the team. They'll respond shortly.`);
            afterHoursStage.delete(groupId);
          } else if (level <= 3) {
            await chat.sendMessage(`👍 ${BOT_NAME} has noted it. The team will follow up in the morning.`);
            afterHoursStage.delete(groupId);
          } else {
            await chat.sendMessage(`${BOT_NAME}: Would you like me to alert the accountant team now? (yes/no)`);
            afterHoursStage.set(groupId, 'askedAlert');
          }
        } else {
          await chat.sendMessage(`${BOT_NAME}: Please reply with a number between 1 and 10.`);
        }
        return;
      }

  // Third message – client replied with yes/no
      if (stage === 'askedAlert') {
        const reply = msg.body.trim().toLowerCase();
        if (reply === 'yes') {
          await alertChat(chat, msg);
          await chat.sendMessage(`✅ ${BOT_NAME} has alerted the team. You’ll get a response shortly.`);
          afterHoursStage.delete(groupId);
        } else if (reply === 'no') {
          await chat.sendMessage(`👍 ${BOT_NAME} has noted it. The team will follow up in the morning.`);
          afterHoursStage.delete(groupId);
        } else {
          await chat.sendMessage(`${BOT_NAME}: Please reply with 'yes' or 'no'.`);
        }
        return;
      }
    }

      // === In-Hours Client Message ===
    if (isClient && inHours) {
      const key = chat.id._serialized;
      if (pending.has(key)) clearTimeout(pending.get(key).timer);
      const timer = setTimeout(() => alertChat(chat, msg), 30 * 60 * 1000);
      pending.set(key, { timer, ts: now, msg });
      await appendRow([istTime, gstTime, chat.name, msg.body, 'Pending', '', '']);
      dailyStats.receivedToday++;
    }

      // === Accountant Reply Handling ===
    if (!isClient && pending.has(chat.id._serialized)) {
      const first = pending.get(chat.id._serialized);
      clearTimeout(first.timer);
      pending.delete(chat.id._serialized);
      const mins = Math.round((now - first.ts) / 60000);
      const istFirst = first.ts.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const gstFirst = first.ts.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });
      const accountantName = ACCOUNTANTS[sender] || 'Accountant';
      appendRow([istFirst, gstFirst, chat.name, first.msg.body, 'Answered', accountantName, mins]);
      dailyStats.answeredToday++;
    }
  });

  // === Alert Function for Missed Messages ===
  async function alertChat(chat, orig) {
    const txt = `🚨 *${BOT_NAME} ALERT!!*\nClient *${chat.name}* sent the message:\n“${orig.body.slice(0, 120)}”\nThis has been unattended for over *30 minutes*.`;
    try {
      await axios.post(CHAT_WEBHOOK, { text: txt });
    } catch (error) {
      console.error('❌ Failed to send alert:', error.message);
    }
  }

  // === Daily Summary Sender ===
  setInterval(() => {
    const now = new Date();
    const istHour = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false });

    if (istHour == '19' && !global._summarySent) {
      sendDailySummary('evening');
      global._summarySent = true;
    }

    if (istHour == '10' && !global._morningSent) {
      sendDailySummary('morning');
      global._morningSent = true;
    }

    if (istHour == '00') {
      global._summarySent = false;
      global._morningSent = false;
      dailyStats = { receivedToday: 0, answeredToday: 0, receivedOvernight: 0 };
    }
  }, 60 * 1000);

  // === Sends Daily or Overnight Summary ===
  async function sendDailySummary(type) {
    if (type === 'evening') {
      const txt = `📋 *${BOT_NAME} Daily Summary*\nQueries Received: ${dailyStats.receivedToday}\nAnswered: ${dailyStats.answeredToday}\nPending: ${dailyStats.receivedToday - dailyStats.answeredToday}`;
      await axios.post(CHAT_WEBHOOK, { text: txt });
    }

    if (type === 'morning') {
      const txt = `🌙 *${BOT_NAME} Overnight Summary*\nAfter-hours Queries: ${dailyStats.receivedOvernight}`;
      await axios.post(CHAT_WEBHOOK, { text: txt });
    }
  }

  // === Health Monitor === 
  setInterval(() => {
    const now = new Date();
    console.log('🟢 Bot health check at', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  }, 30 * 60 * 1000);

  // === Start WhatsApp Bot ===
  wa.initialize();
