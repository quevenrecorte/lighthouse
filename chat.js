import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  child,
  get,
  set,
  update,
  remove,
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

const FIRST_ADMIN_EMAIL = 'quevenrecorte@gmail.com';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
console.log("chat.js loaded");

const userLabel = document.getElementById('userLabel');
const signOutBtn = document.getElementById('signOutBtn');
const accountBtn = document.getElementById('accountBtn');
const accountModal = document.getElementById('accountModal');
const memberInfoModal = document.getElementById('memberInfoModal');
const closeMemberInfoBtn = document.getElementById('closeMemberInfoBtn');
const infoDisplayName = document.getElementById('infoDisplayName');
const infoEmail = document.getElementById('infoEmail');
const infoRole = document.getElementById('infoRole');
const infoAccountType = document.getElementById('infoAccountType');
const infoStatus = document.getElementById('infoStatus');
const infoCreatedDate = document.getElementById('infoCreatedDate');
const infoLastOnline = document.getElementById('infoLastOnline');
const toggleAccountBtn = document.getElementById('toggleAccountBtn');
const closeAccountBtn = document.getElementById('closeAccountBtn');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const chatStatus = document.getElementById('chatStatus');
const fileInput = document.getElementById('fileInput');
const attachBtn = document.getElementById('attachBtn');
const profileForm = document.getElementById('profileForm');
const displayNameInput = document.getElementById('displayNameInput');
const onlineList = document.getElementById('onlineList');
const adminPanel = document.getElementById('adminPanel');
const clearChatBtn = document.getElementById('clearChatBtn');
const createInviteBtn = document.getElementById('createInviteBtn');
const exportChatBtn = document.getElementById('exportChatBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const createRoomModal = document.getElementById('createRoomModal');
const roomNameInput = document.getElementById('roomNameInput');
const roomModalTitle = document.getElementById('roomModalTitle');
const cancelCreateRoomBtn = document.getElementById('cancelCreateRoomBtn');
const confirmCreateRoomBtn = document.getElementById('confirmCreateRoomBtn');
const inviteResult = document.getElementById('inviteResult');
const memberList = document.getElementById('memberList');
const roomMemberManager = document.getElementById('roomMemberManager');
const replyPreview = document.getElementById('replyPreview');
const replySender = document.getElementById('replySender');
const replyText = document.getElementById('replyText');
const cancelReplyBtn = document.getElementById('cancelReplyBtn');
const reactionPicker = document.getElementById('reactionPicker');
const roomDropdown = document.getElementById('roomDropdown');
console.log("roomDropdown =", roomDropdown);

let currentUser = null;
let currentProfile = null;
let userDisplayName = 'User';
let isAdmin = false;
let latestMessages = {};
let allUsers = {};
let unsubscribeMessages = null;
let unsubscribeOnline = null;
let unsubscribeProfile = null;
let unsubscribeUsers = null;
let selectedFile = null;
let replyTarget = null;
let activeReactionMessage = null;
let activeRoom = 'main';
let roomsData = {};
let roomModalMode = 'create';
let renameTargetRoom = null;
let roomMembers = {};
let activeRoomPanels = {};

function defaultName(user) {
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

function listenToRooms() {
  console.log("listenToRooms started");

  onValue(ref(db, 'rooms'), (snapshot) => {
    console.log("rooms callback fired");

    roomsData = snapshot.val() || {};
    console.log("roomsData =", roomsData);

    Object.keys(roomsData).forEach(roomId => {
      roomMembers[roomId] = roomsData[roomId].members || {};
    });

    renderRoomDropdown();
    renderRoomMemberManager();
    updateRoomVisibility();
  });
}

function renderRoomDropdown() {
  if (!roomDropdown) return;

  roomDropdown.innerHTML = '';

  Object.entries(roomsData).forEach(([roomId, room]) => {
    const option = document.createElement('option');
    option.value = roomId;
    option.textContent = room.name || roomId;
    roomDropdown.appendChild(option);
  });

  updateRoomVisibility();

  if (isAdmin) {
    roomDropdown.value = activeRoom;
    startMessageListener();
    return;
  }

  const allowedRooms = Object.keys(roomsData).filter(
    roomId => roomMembers[roomId]?.[currentUser?.uid]
  );

  if (allowedRooms.length === 0) {
  roomDropdown.innerHTML = '';
  
  const option = document.createElement('option');
  option.textContent = 'No rooms available';
  option.disabled = true;
  option.selected = true;
  roomDropdown.appendChild(option);

  messagesEl.innerHTML = '<p class="empty-state">No rooms available.</p>';

  messageInput.disabled = true;
  attachBtn.disabled = true;
  messageForm.querySelector('button[type="submit"]').disabled = true;

  return;
}

  if (!allowedRooms.includes(activeRoom)) {
    activeRoom = allowedRooms[0];
  }

  roomDropdown.value = activeRoom;

  if (unsubscribeMessages) unsubscribeMessages();

  messageInput.disabled = false;
  attachBtn.disabled = false;
  messageForm.querySelector('button[type="submit"]').disabled = false;
  
  startMessageListener();
}

function cleanName(value) {
  return (value || '').trim().replace(/\s+/g, ' ').slice(0, 30);
}

function createRoomId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function cleanMessage(value) {
  return (value || '').trim().slice(0, 500);
}

function formatTime(timestamp) {
  if (!timestamp) return 'Sending...';
  const date = new Date(timestamp);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDate(timestamp) {
  if (!timestamp) return '-';

  const date = new Date(timestamp);

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatLastSeen(timestamp) {
  if (!timestamp) return '-';

  const date = new Date(timestamp);

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function escapeText(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function setStatus(message = '', isError = false) {
  chatStatus.classList.toggle('error', isError);
  chatStatus.textContent = message;
}
function truncateText(text, max = 60) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function showReplyPreview(messageId, message) {
  replyTarget = {
    messageId,
    sender: message.name || 'User',
    text: message.text || '[Attachment]'
  };

  replySender.textContent = replyTarget.sender;
  replyText.textContent = truncateText(replyTarget.text);
  replyPreview.classList.remove('hidden');
}

function clearReplyPreview() {
  replyTarget = null;
  replyPreview.classList.add('hidden');
}


function renderReactions(message) {
  if (!message.reactions) return '';

  let html = '<div class="reactions-bar">';

  Object.entries(message.reactions).forEach(([emoji, users]) => {
    const count = Object.keys(users || {}).length;
    if (count === 0) return;

    const active = currentUser && users[currentUser.uid];
    html += `
      <div class="reaction-pill ${active ? 'active' : ''}">
        ${emoji} ${count}
      </div>
    `;
  });

  html += '</div>';
  return html;
}

async function toggleReaction(messageId, emoji) {
  if (!currentUser) return;

  const message = latestMessages[messageId];
  if (!message) return;

  const updates = {};
  const reactions = message.reactions || {};
  let clickedSameReaction = false;

  Object.entries(reactions).forEach(([existingEmoji, users]) => {
    if (users && users[currentUser.uid]) {
      if (existingEmoji === emoji) {
        clickedSameReaction = true;
      }

      updates[`rooms/${activeRoom}/messages/${messageId}/reactions/${existingEmoji}/${currentUser.uid}`] = null;
    }
  });

  if (!clickedSameReaction) {
    updates[`rooms/${activeRoom}/messages/${messageId}/reactions/${emoji}/${currentUser.uid}`] = true;
  }

  try {
    await update(ref(db), updates);
  } catch (error) {
    console.error(error);
    setStatus('Reaction failed.', true);
  }

  reactionPicker.classList.add('hidden');
  activeReactionMessage = null;
}


function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 1280;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.60));
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isProfileAdmin(profile) {
  return profile && profile.approved === true && profile.role === 'admin';
}

async function ensureUserProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);
  const fallbackName = defaultName(user);
  const firstAdmin = user.email === FIRST_ADMIN_EMAIL;

  if (!snapshot.exists()) {
    await set(userRef, {
  displayName: fallbackName,
  username: fallbackName,
  email: user.email || '',
  role: firstAdmin ? 'admin' : 'member',
  approved: firstAdmin,
  accountType: firstAdmin ? 'admin-created' : 'invite-registered',
  createdAt: serverTimestamp(),
  lastSeen: serverTimestamp(),
  online: true
});
    return { displayName: fallbackName, role: firstAdmin ? 'admin' : 'member', approved: firstAdmin };
  }

  const profile = snapshot.val() || {};
  const name = cleanName(profile.displayName) || fallbackName;
  const updates = { displayName: name, email: user.email || '', lastSeen: serverTimestamp(), online: true };

  if (firstAdmin) {
    updates.role = 'admin';
    updates.approved = true;
  }

  if (!profile.role) updates.role = firstAdmin ? 'admin' : 'member';
  if (profile.approved === undefined) updates.approved = firstAdmin;

  await update(userRef, updates);
  return { ...profile, ...updates, displayName: name };
}

function setupPresence(user) {
  const connectedRef = ref(db, '.info/connected');
  const userRef = ref(db, `users/${user.uid}`);

  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      update(userRef, { online: true, lastSeen: serverTimestamp() });
      onDisconnect(userRef).update({ online: false, lastSeen: serverTimestamp() });
    }
  });
}

function listenToProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  unsubscribeProfile = onValue(userRef, (snapshot) => {
    currentProfile = snapshot.val() || {};
    userDisplayName = cleanName(currentProfile.displayName) || defaultName(user);
    isAdmin = isProfileAdmin(currentProfile);
    userLabel.textContent = `Signed in as ${userDisplayName}`;
    displayNameInput.value = userDisplayName;
    adminPanel.classList.toggle('hidden', !isAdmin);
  });
}

function listenToUsers() {
  unsubscribeUsers = onValue(ref(db, 'users'), (snapshot) => {
    allUsers = snapshot.val() || {};
    renderOnlineUsers();
    renderMemberList();
    renderRoomMemberManager();
  }, (error) => {
    console.error('Users listener failed:', error);
    setStatus('Some account tools are blocked by rules.', true);
  });
}

function renderOnlineUsers() {
  onlineList.innerHTML = '';
  const onlineUsers = Object.values(allUsers).filter(user => user && user.online && user.approved !== false)
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
}

function seenText(message) {
  if (!message.seenBy || !currentUser || message.uid !== currentUser.uid) return '';
  const names = Object.entries(message.seenBy)
    .filter(([uid]) => uid !== currentUser.uid)
    .map(([, seen]) => cleanName(seen.name) || 'Someone');

  if (names.length === 0) return 'Sent';
  if (names.length === 1) return `Seen by ${names[0]}`;
  return `Seen by ${names.length} people`;
}

const seenWriteCache = new Set();

async function markMessageSeen(id, message) {
  if (!currentUser || !id || !message || message.uid === currentUser.uid) return;

  // Prevent infinite listener loops:
  // once this user is already recorded in seenBy, do not write again.
  if (message.seenBy && message.seenBy[currentUser.uid]) return;
  if (seenWriteCache.has(id)) return;

  seenWriteCache.add(id);
  try {
    await update(ref(db, `rooms/${activeRoom}/messages/${id}/seenBy/${currentUser.uid}`), {
      name: userDisplayName,
      seenAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('Seen marker not saved.', error);
    seenWriteCache.delete(id);
  }
}

function renderMessages(snapshot) {
  const data = snapshot.val();
  latestMessages = data || {};
  messagesEl.innerHTML = '';

  if (!data) {
    messagesEl.innerHTML = '<p class="empty-state">No messages yet.</p>';
    return;
  }

  Object.entries(data).forEach(([id, message]) => {
    if (!message || message.deleted) return;

    const isOwn = currentUser && message.uid === currentUser.uid;
    const messageDiv = document.createElement('article');
    messageDiv.className = isOwn ? 'message own' : 'message';
    messageDiv.dataset.id = id;

    const edited = message.editedAt ? '<span class="edited-note">edited</span>' : '';
    const seen = seenText(message);
    const canManage = isOwn || isAdmin;

    messageDiv.innerHTML = `
  <div class="message-meta">
    <span>${escapeText(message.name || 'User')}</span>
    <span>${formatTime(message.createdAt)}</span>
  </div>

  ${message.replyTo ? `
    <div class="reply-box">
      <strong>${escapeText(message.replyTo.sender)}</strong>
      <p>${escapeText(message.replyTo.text)}</p>
    </div>
  ` : ''}

  <p class="message-text">${escapeText(message.text || '')}</p>

  ${message.fileType === 'image'
    ? `<img src="${message.fileData}" class="chat-image">`
    : ''}

  ${message.fileType === 'file'
    ? `<div class="file-box">
         <a href="${message.fileData}" download="${message.fileName}">
           📄 ${message.fileName}
         </a>
       </div>`
    : ''}

  ${renderReactions(message)}

  <div class="message-footer">
    <span>${edited}</span>
    <span>${escapeText(seen)}</span>
  </div>

  <div class="message-actions">
    <button class="mini-action reply-message" type="button">Reply</button>
    <button class="mini-action react-message react-btn" type="button">🙂</button>

    ${isOwn ? '<button class="mini-action edit-message" type="button">Edit</button>' : ''}

    ${canManage ? '<button class="mini-action delete-message" type="button">Delete</button>' : ''}
  </div>
`;

    messagesEl.appendChild(messageDiv);
    markMessageSeen(id, message);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function startMessageListener() {
  const messagesRef = query(ref(db, `rooms/${activeRoom}/messages`), limitToLast(150));
  unsubscribeMessages = onValue(messagesRef, renderMessages, (error) => {
    setStatus('Unable to load messages. Check database rules.', true);
    console.error(error);
  });
}

function renderMemberList() {
  if (!memberList) return;
  if (!isAdmin) {
    memberList.innerHTML = '';
    return;
  }
  memberList.innerHTML = '';

  const entries = Object.entries(allUsers).sort(([, a], [, b]) => String(a.displayName || '').localeCompare(String(b.displayName || '')));
  if (entries.length === 0) return;

  const title = document.createElement('div');
  title.className = 'member-title';
  title.textContent = 'Members';
  memberList.appendChild(title);

  entries.forEach(([uid, user]) => {
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `
  <div class="member-header">
    <span>${escapeText(cleanName(user.displayName) || user.email || 'User')}</span>
    <span>⌄</span>
  </div>

  <div class="member-content hidden">
    <select data-uid="${uid}" class="role-select">
      <option value="member" ${user.role === 'member' ? 'selected' : ''}>member</option>
      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
    </select>

    <button class="account-info-btn" data-uid="${uid}" type="button">
      Account Info
    </button>
  </div>
`;
    memberList.appendChild(row);
  });
}


function updateRoomVisibility() {
  if (!roomDropdown) return;

  Array.from(roomDropdown.options).forEach(option => {
    const room = option.value;

    if (isAdmin) {
      option.hidden = false;
      return;
    }

    const allowed = roomMembers[room]?.[currentUser?.uid];
    option.hidden = !allowed;
  });
}

function renderRoomMemberManager() {
  if (!roomMemberManager) return;
  if (!isAdmin) {
    roomMemberManager.innerHTML = '';
    return;
  }

  const users = Object.entries(allUsers);
  if (users.length === 0) {
    roomMemberManager.innerHTML = 'No users found.';
    return;
  }

  let html = '';

  Object.keys(roomsData).forEach(room => {
    html += `
  <div class="room-manager-box">
    <div class="room-manager-header">
  <h4>${escapeText(roomsData[room]?.name || room)}</h4>
  <button class="rename-room-btn" data-room="${room}" type="button">
    Rename
  </button>
</div>
`;
    const hiddenClass = activeRoomPanels[room] ? '' : 'hidden';
html += `<div class="room-manager-content ${hiddenClass}"><div class="room-members-grid">`;
    users.forEach(([uid, user]) => {
      const name = user.displayName || user.email || 'User';

      const checked = roomMembers[room]?.[uid] ? 'checked' : '';

html += `
  <label class="room-member-item">
    <input type="checkbox" data-room="${room}" data-uid="${uid}" ${checked}>
    ${escapeText(name)}
  </label>
`;
    });

    html += `</div></div></div>`;
  });

  roomMemberManager.innerHTML = html;
}

function createInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'LH-';
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}


function switchRoom(roomName) {
  if (activeRoom === roomName) return;

  activeRoom = roomName;

  latestMessages = {};
  messagesEl.innerHTML = '<p class="empty-state">Loading messages...</p>';

  if (unsubscribeMessages) unsubscribeMessages();

  startMessageListener();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  isAdmin = false;
  adminPanel.classList.add('hidden');
  memberList.innerHTML = '';
  inviteResult.innerHTML = '';
  userLabel.textContent = 'Loading profile...';

  try {
    currentProfile = await ensureUserProfile(user);

    if (currentProfile.approved === false) {
      setStatus('This account is not approved.', true);
      await signOut(auth);
      window.location.href = 'index.html';
      return;
    }

    userDisplayName = cleanName(currentProfile.displayName) || defaultName(user);
    isAdmin = isProfileAdmin(currentProfile);
    userLabel.textContent = `Signed in as ${userDisplayName}`;
    displayNameInput.value = userDisplayName;
    adminPanel.classList.toggle('hidden', !isAdmin);

    setupPresence(user);
    listenToProfile(user);
    listenToUsers();
    listenToRooms();

  } catch (error) {
    setStatus('Unable to load profile. Check database rules.', true);
    console.error(error);
  }
});

cancelReplyBtn?.addEventListener('click', clearReplyPreview);
reactionPicker?.addEventListener('click', async (event) => {
  const button = event.target.closest('.reaction-option');
  if (!button || !activeReactionMessage) return;

  const emoji = button.textContent.trim();
  await toggleReaction(activeReactionMessage, emoji);
});
document.addEventListener('click', (event) => {
  if (
    reactionPicker &&
    !reactionPicker.contains(event.target) &&
    !event.target.closest('.react-message')
  ) {
    reactionPicker.classList.add('hidden');
  }
});
attachBtn?.addEventListener('click', ()=> fileInput.click());
fileInput?.addEventListener('change', (event) => {
  selectedFile = event.target.files[0];
  if (selectedFile) setStatus(`Selected: ${selectedFile.name}`);
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const newName = cleanName(displayNameInput.value);
  if (!newName) {
    setStatus('Display name cannot be empty.', true);
    return;
  }

  try {
    await update(ref(db, `users/${currentUser.uid}`), { displayName: newName, lastSeen: serverTimestamp() });
    userDisplayName = newName;
    setStatus('Display name saved.');
    setTimeout(() => { if (chatStatus.textContent === 'Display name saved.') setStatus(''); }, 1200);
  } catch (error) {
    setStatus('Display name not saved. Check database rules.', true);
    console.error(error);
  }
});

messageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = cleanMessage(messageInput.value);
  if ((!text && !selectedFile) || !currentUser) return;

  setStatus('Sending...');
  try {
    let payload = {
  text,
  uid: currentUser.uid,
  name: userDisplayName,
  email: currentUser.email || '',
  createdAt: serverTimestamp(),
  editedAt: null,
  seenBy: {
    [currentUser.uid]: {
      name: userDisplayName,
      seenAt: serverTimestamp()
    }
  }
};

if (replyTarget) {
  payload.replyTo = {
    messageId: replyTarget.messageId,
    sender: replyTarget.sender,
    text: replyTarget.text
  };
};
    if (selectedFile) {
      const isImage = selectedFile.type.startsWith('image/');
      if (isImage) {
        const rawLimit = 10 * 1024 * 1024;
        if (selectedFile.size > rawLimit) {
          setStatus('Image too large. Max raw size is 10MB.', true);
          return;
        }
      } else {
        const fileLimit = 300 * 1024;
        if (selectedFile.size > fileLimit) {
          setStatus('File too large.', true);
          return;
        }
      }

      let fileData;
      if (isImage) {
        fileData = await compressImage(selectedFile);
        const compressedSize = Math.round((fileData.length * 3) / 4);
        if (compressedSize > 500 * 1024) {
          setStatus('Compressed image still too large.', true);
          return;
        }
      } else {
        fileData = await fileToBase64(selectedFile);
      }
      payload.fileName = selectedFile.name;
      payload.fileData = fileData;
      payload.fileType = isImage ? 'image' : 'file';
    }
    await push(ref(db, `rooms/${activeRoom}/messages`), payload);
    messageInput.value = '';
    selectedFile = null;
    fileInput.value = '';
    clearReplyPreview();
    messageInput.focus();
    setStatus('');
  } catch (error) {
    setStatus('Message not sent. Check database rules.', true);
    console.error(error);
  }
});

messagesEl.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const messageEl = event.target.closest('.message');
  if (!messageEl) return;
  const id = messageEl.dataset.id;
  const message = latestMessages[id];
  if (!id || !message) return;
  if (button.classList.contains('reply-message')) {
  showReplyPreview(id, message);
  messageInput.focus();
  return;
}

if (button.classList.contains('react-message')) {
  

  activeReactionMessage = id;

  const rect = button.getBoundingClientRect();
  const cardRect = document.querySelector('.chat-card').getBoundingClientRect();

  let left = rect.left - cardRect.left - 150;
  let top = rect.top - cardRect.top - 70;

  reactionPicker.style.left = `${left}px`;
  reactionPicker.style.top = `${top}px`;
  reactionPicker.classList.remove('hidden');

  return;
}

  if (button.classList.contains('edit-message')) {
    const nextText = prompt('Edit message:', message.text || '');
    const text = cleanMessage(nextText);
    if (!text || text === message.text) return;

    try {
      await update(ref(db, `rooms/${activeRoom}/messages/${id}`), {
        text,
        name: userDisplayName,
        editedAt: serverTimestamp()
      });
    } catch (error) {
      setStatus('Message not edited. Check database rules.', true);
      console.error(error);
    }
  }

  if (button.classList.contains('delete-message')) {
    if (!confirm('Delete this message?')) return;
    try {
      await remove(ref(db, `rooms/${activeRoom}/messages/${id}`));
    } catch (error) {
      setStatus('Message not deleted. Check database rules.', true);
      console.error(error);
    }
  }
});

memberList.addEventListener('change', async (event) => {
  const select = event.target.closest('.role-select');
  if (!select || !isAdmin) return;
  const uid = select.dataset.uid;
  const role = select.value;

  try {
    await update(ref(db, `users/${uid}`), { role, approved: true });
    setStatus('Role updated.');
    setTimeout(() => { if (chatStatus.textContent === 'Role updated.') setStatus(''); }, 1200);
  } catch (error) {
    setStatus('Role not updated. Check database rules.', true);
    console.error(error);
  }
});

memberList.addEventListener('click', (event) => {
  const header = event.target.closest('.member-header');
  if (!header) return;

  const content = header.nextElementSibling;
  if (!content) return;

  content.classList.toggle('hidden');
});

createRoomBtn?.addEventListener('click', () => {
  if (!isAdmin) return;

  roomModalMode = 'create';
  renameTargetRoom = null;

  roomModalTitle.textContent = 'Create Room';
  confirmCreateRoomBtn.textContent = 'Create';
  roomNameInput.value = '';

  createRoomModal.classList.remove('hidden');
  roomNameInput.focus();
});

roomMemberManager?.addEventListener('click', (event) => {

  if (
  event.target.matches('input') ||
  event.target.closest('.room-member-item') ||
  event.target.closest('.rename-room-btn')
) {
  return;
}

  const header = event.target.closest('.room-manager-header');
  if (!header) return;

  const content = header.nextElementSibling;
  if (!content) return;

  const isHidden = content.classList.toggle('hidden');

const roomName = header.querySelector('h4')?.textContent?.toLowerCase();
if (!roomName) return;

activeRoomPanels[roomName] = !isHidden;
});

roomMemberManager?.addEventListener('click', (event) => {
  const button = event.target.closest('.rename-room-btn');
  if (!button || !isAdmin) return;

  const roomId = button.dataset.room;
  if (!roomId) return;

  roomModalMode = 'rename';
  renameTargetRoom = roomId;

  roomModalTitle.textContent = 'Rename Room';
  confirmCreateRoomBtn.textContent = 'Save';
  roomNameInput.value = roomsData[roomId]?.name || roomId;

  createRoomModal.classList.remove('hidden');
  roomNameInput.focus();
  roomNameInput.select();
});

cancelCreateRoomBtn?.addEventListener('click', () => {
  createRoomModal.classList.add('hidden');
});



confirmCreateRoomBtn?.addEventListener('click', async () => {
  if (!isAdmin) return;

  const roomName = roomNameInput.value.trim();
  if (!roomName) return;

  const roomId = createRoomId(roomName);

  if (!roomId) {
    setStatus('Invalid room name.', true);
    return;
  }

  if (roomsData[roomId]) {
    setStatus('Room already exists.', true);
    return;
  }

  try {
  if (roomModalMode === 'create') {
    await set(ref(db, `rooms/${roomId}`), {
      name: roomName,
      members: {},
      messages: {}
    });

    setStatus(`Room "${roomName}" created.`);
  } else if (roomModalMode === 'rename') {
    await update(ref(db, `rooms/${renameTargetRoom}`), {
      name: roomName
    });

    setStatus(`Room renamed to "${roomName}".`);
  }

  createRoomModal.classList.add('hidden');
} catch (error) {
    setStatus('Room creation failed.', true);
    console.error(error);
  }
});

roomMemberManager?.addEventListener('click', async (event) => {
  const button = event.target.closest('.rename-room-btn');
  if (!button || !isAdmin) return;

  const roomId = button.dataset.room;
  if (!roomId) return;

  const currentName = roomsData[roomId]?.name || roomId;
  const nextName = prompt(`Rename room "${currentName}" to:`);

  if (!nextName) return;

  const cleanName = nextName.trim();
  if (!cleanName) return;

  try {
    await update(ref(db, `rooms/${roomId}`), {
      name: cleanName
    });

    setStatus('Room renamed.');
  } catch (error) {
    setStatus('Room rename failed.', true);
    console.error(error);
  }
});

roomMemberManager?.addEventListener('change', async (event) => {
  const checkbox = event.target;
  if (!checkbox.matches('input[type="checkbox"]')) return;
  if (!isAdmin) return;

  const room = checkbox.dataset.room;
  const uid = checkbox.dataset.uid;

  if (!room || !uid) return;

  try {
    if (checkbox.checked) {
      await set(ref(db, `rooms/${room}/members/${uid}`), true);
    } else {
      await remove(ref(db, `rooms/${room}/members/${uid}`));
    }

    setStatus('Room membership updated.');
    setTimeout(() => {
      if (chatStatus.textContent === 'Room membership updated.') {
        setStatus('');
      }
    }, 1200);

  } catch (error) {
    checkbox.checked = !checkbox.checked;
    setStatus('Room membership update failed.', true);
    console.error(error);
  }
});

memberList.addEventListener('click', (event) => {
  const button = event.target.closest('.account-info-btn');
  if (!button || !isAdmin) return;

  const uid = button.dataset.uid;
  if (!uid) return;

  const user = allUsers[uid];
  if (!user) return;

  infoDisplayName.textContent = user.displayName || '-';
  infoEmail.textContent = user.email || '-';
  infoRole.textContent = user.role || 'member';
  if (!user.accountType) {
  infoAccountType.textContent = 'Legacy Account';
} else {
  infoAccountType.textContent =
    user.accountType === 'admin-created'
      ? 'Admin-Created'
      : 'Invite-Registered';
}
  infoCreatedDate.textContent = formatDate(user.createdAt);
  infoLastOnline.textContent = user.online
  ? '🟢 Online Now'
  : formatLastSeen(user.lastSeen);
  infoStatus.textContent = user.disabled ? '🔴 Disabled' : '🟢 Active';

  infoStatus.classList.remove('status-active', 'status-disabled');
  infoStatus.classList.add(user.disabled ? 'status-disabled' : 'status-active');

  toggleAccountBtn.textContent = user.disabled
    ? 'Enable Account'
    : 'Disable Account';

  toggleAccountBtn.dataset.uid = uid;

  memberInfoModal.classList.remove('hidden');
});

toggleAccountBtn?.addEventListener('click', async () => {
  const uid = toggleAccountBtn.dataset.uid;
  if (!uid || !isAdmin) return;

  if (uid === currentUser.uid) {
  setStatus('You cannot disable your own admin account.', true);
  return;
}

  const user = allUsers[uid];
  if (!user) return;

  const newStatus = !user.disabled;

  try {
    await update(ref(db, `users/${uid}`), {
      disabled: newStatus
    });

    infoStatus.textContent = newStatus ? '🔴 Disabled' : '🟢 Active';

    infoStatus.classList.remove('status-active', 'status-disabled');
    infoStatus.classList.add(newStatus ? 'status-disabled' : 'status-active');
    toggleAccountBtn.textContent = newStatus
      ? 'Enable Account'
      : 'Disable Account';

    setStatus(newStatus ? 'Account disabled.' : 'Account enabled.');
  } catch (error) {
    setStatus('Account status update failed.', true);
    console.error(error);
  }
});

clearChatBtn.addEventListener('click', async () => {
  if (!isAdmin) return;
  if (!confirm('Clear all chat messages? This cannot be undone.')) return;
  try {
    await remove(ref(db, `rooms/${activeRoom}/messages`));
    setStatus('Chat cleared.');
  } catch (error) {
    setStatus('Chat not cleared. Check database rules.', true);
    console.error(error);
  }
});

createInviteBtn.addEventListener('click', async () => {
  if (!isAdmin) return;
  const code = createInviteCode();
  try {
    await set(ref(db, `invites/${code}`), {
  active: true,
  createdBy: currentUser.uid,
  createdByName: userDisplayName,
  createdAt: Date.now(),
  expiresAt: Date.now() + (5 * 60 * 1000)
});
    inviteResult.innerHTML = `
  Access Code: <strong>${escapeText(code)}</strong><br>
  Expires in: <strong>5 minutes</strong>
`;
  } catch (error) {
    setStatus('Access code not created. Check database rules.', true);
    console.error(error);
  }
});

exportChatBtn.addEventListener('click', () => {
  const rows = Object.values(latestMessages || {}).filter(msg => msg && !msg.deleted).map(msg => {
    return `[${formatTime(msg.createdAt)}] ${msg.name || 'User'}: ${msg.text || ''}`;
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lighthouse-chat-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

roomDropdown?.addEventListener('change', (event) => {
  switchRoom(event.target.value);
});


accountBtn?.addEventListener('click', () => {
  accountModal.classList.remove('hidden');
});

closeAccountBtn?.addEventListener('click', () => {
  accountModal.classList.add('hidden');
});

closeMemberInfoBtn?.addEventListener('click', () => {
  memberInfoModal.classList.add('hidden');
});

signOutBtn.addEventListener('click', async () => {
  signOutBtn.disabled = true;
  signOutBtn.textContent = 'Signing out...';

  try {
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeOnline) unsubscribeOnline();
    if (unsubscribeProfile) unsubscribeProfile();
    if (unsubscribeUsers) unsubscribeUsers();

    if (currentUser) {
      try {
        await update(ref(db, `users/${currentUser.uid}`), { online: false, lastSeen: serverTimestamp() });
      } catch (presenceError) {
        console.warn('Presence update skipped during sign out.', presenceError);
      }
    }

    await signOut(auth);
    window.location.replace('index.html');
  } catch (error) {
    console.error(error);
    signOutBtn.disabled = false;
    signOutBtn.textContent = 'Sign Out';
    setStatus('Sign out failed. Please refresh and try again.', true);
  }
});
