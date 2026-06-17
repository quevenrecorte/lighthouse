import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  child,
  get,
  set,
  update,
  push,
  onValue,
  query,
  limitToLast,
  serverTimestamp,
  onDisconnect
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
const profileForm = document.getElementById('profileForm');
const displayNameInput = document.getElementById('displayNameInput');
const onlineList = document.getElementById('onlineList');

let currentUser = null;
let userDisplayName = 'User';
let unsubscribeMessages = null;
let unsubscribeOnline = null;
let unsubscribeProfile = null;

function defaultName(user) {
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

function cleanName(value) {
  return (value || '').trim().replace(/\s+/g, ' ').slice(0, 30);
}

function formatTime(timestamp) {
  if (!timestamp) return 'Sending...';
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

async function ensureUserProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);
  const fallbackName = defaultName(user);

  if (!snapshot.exists()) {
    await set(userRef, {
      displayName: fallbackName,
      email: user.email || '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      online: true
    });
    return fallbackName;
  }

  const profile = snapshot.val() || {};
  const name = cleanName(profile.displayName) || fallbackName;

  await update(userRef, {
    displayName: name,
    email: user.email || '',
    lastSeen: serverTimestamp(),
    online: true
  });

  return name;
}

function setupPresence(user) {
  const connectedRef = ref(db, '.info/connected');
  const userRef = ref(db, `users/${user.uid}`);

  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      update(userRef, {
        online: true,
        lastSeen: serverTimestamp()
      });

      onDisconnect(userRef).update({
        online: false,
        lastSeen: serverTimestamp()
      });
    }
  });
}

function listenToProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  unsubscribeProfile = onValue(userRef, (snapshot) => {
    const profile = snapshot.val() || {};
    userDisplayName = cleanName(profile.displayName) || defaultName(user);
    userLabel.textContent = `Signed in as ${userDisplayName}`;
    displayNameInput.value = userDisplayName;
  });
}

function listenToOnlineUsers() {
  unsubscribeOnline = onValue(ref(db, 'users'), (snapshot) => {
    const data = snapshot.val();
    onlineList.innerHTML = '';

    if (!data) {
      onlineList.textContent = 'No online users.';
      return;
    }

    const onlineUsers = Object.values(data)
      .filter(user => user && user.online)
      .sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')));

    if (onlineUsers.length === 0) {
      onlineList.textContent = 'No online users.';
      return;
    }

    onlineUsers.forEach((user) => {
      const person = document.createElement('span');
      person.className = 'online-person';
      person.innerHTML = `<span class="online-dot"></span>${escapeText(cleanName(user.displayName) || 'User')}`;
      onlineList.appendChild(person);
    });
  });
}

function renderMessages(snapshot) {
  const data = snapshot.val();
  messagesEl.innerHTML = '';

  if (!data) {
    messagesEl.innerHTML = '<p class="empty-state">No messages yet.</p>';
    return;
  }

  Object.entries(data).forEach(([id, message]) => {
    const isOwn = currentUser && message.uid === currentUser.uid;
    const messageDiv = document.createElement('article');
    messageDiv.className = isOwn ? 'message own' : 'message';

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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  userLabel.textContent = 'Loading profile...';

  try {
    userDisplayName = await ensureUserProfile(user);
    userLabel.textContent = `Signed in as ${userDisplayName}`;
    displayNameInput.value = userDisplayName;

    setupPresence(user);
    listenToProfile(user);
    listenToOnlineUsers();
    startMessageListener();
  } catch (error) {
    chatStatus.classList.add('error');
    chatStatus.textContent = 'Unable to load profile. Check database rules.';
    console.error(error);
  }
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const newName = cleanName(displayNameInput.value);
  if (!newName) {
    chatStatus.classList.add('error');
    chatStatus.textContent = 'Display name cannot be empty.';
    return;
  }

  try {
    await update(ref(db, `users/${currentUser.uid}`), {
      displayName: newName,
      lastSeen: serverTimestamp()
    });

    userDisplayName = newName;
    chatStatus.classList.remove('error');
    chatStatus.textContent = 'Display name saved.';

    setTimeout(() => {
      if (chatStatus.textContent === 'Display name saved.') chatStatus.textContent = '';
    }, 1200);
  } catch (error) {
    chatStatus.classList.add('error');
    chatStatus.textContent = 'Display name not saved. Check database rules.';
    console.error(error);
  }
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
    messageInput.focus();
    chatStatus.textContent = '';
  } catch (error) {
    chatStatus.classList.add('error');
    chatStatus.textContent = 'Message not sent. Check database rules.';
    console.error(error);
  }
});

signOutBtn.addEventListener('click', async () => {
  try {
    if (currentUser) {
      await update(ref(db, `users/${currentUser.uid}`), {
        online: false,
        lastSeen: serverTimestamp()
      });
    }

    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeOnline) unsubscribeOnline();
    if (unsubscribeProfile) unsubscribeProfile();

    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error(error);
    window.location.href = 'index.html';
  }
});
