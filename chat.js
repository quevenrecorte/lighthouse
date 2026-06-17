import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  limitToLast,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMZxgShqE5g_bA4-Y8ShUux_FhMITWEFs",
  authDomain: "lighthouse-8bf51.firebaseapp.com",
  databaseURL: "https://lighthouse-8bf51-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lighthouse-8bf51",
  storageBucket: "lighthouse-8bf51.firebasestorage.app",
  messagingSenderId: "1040589784841",
  appId: "1:1040589784841:web:46b16ab5c5c6a7f08af5d8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const userLabel = document.getElementById('userLabel');
const signOutBtn = document.getElementById('signOutBtn');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const chatStatus = document.getElementById('chatStatus');

let currentUser = null;
let userDisplayName = 'User';
let unsubscribeMessages = null;

function getDisplayName(user) {
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function escapeText(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function renderMessages(snapshot) {
  const data = snapshot.val();
  messagesEl.innerHTML = '';

  if (!data) {
    messagesEl.innerHTML = '<p class="empty-state">No messages yet.</p>';
    return;
  }

  Object.entries(data).forEach(([id, message]) => {
    const messageDiv = document.createElement('article');
    messageDiv.className = message.uid === currentUser.uid ? 'message own' : 'message';

    messageDiv.innerHTML = `
      <div class="message-meta">
        <span>${escapeText(message.name || 'User')}</span>
        <span>${formatTime(message.createdAt)}</span>
      </div>
      <p class="message-text">${escapeText(message.text)}</p>
    `;

    messagesEl.appendChild(messageDiv);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function startMessageListener() {
  const messagesRef = query(ref(db, 'rooms/main/messages'), limitToLast(100));
  unsubscribeMessages = onValue(messagesRef, renderMessages, (error) => {
    chatStatus.classList.add('error');
    chatStatus.textContent = 'Unable to load messages. Check database rules.';
    console.error(error);
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  userDisplayName = getDisplayName(user);
  userLabel.textContent = `Signed in as ${userDisplayName}`;
  startMessageListener();
});

messageForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  chatStatus.classList.remove('error');
  chatStatus.textContent = 'Sending...';

  try {
    await push(ref(db, 'rooms/main/messages'), {
      text,
      uid: currentUser.uid,
      name: userDisplayName,
      email: currentUser.email || '',
      createdAt: serverTimestamp()
    });

    messageInput.value = '';
    chatStatus.textContent = '';
  } catch (error) {
    chatStatus.classList.add('error');
    chatStatus.textContent = 'Message not sent. Check database rules.';
    console.error(error);
  }
});

signOutBtn.addEventListener('click', async () => {
  if (unsubscribeMessages) unsubscribeMessages();
  await signOut(auth);
  window.location.href = 'index.html';
});
