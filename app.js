import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
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

const FIRST_ADMIN_EMAIL = 'quevenrecorte@gmail.com';
const USERNAME_DOMAIN = 'lighthouse.local';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const statusMessage = document.getElementById('statusMessage');
const signupStatus = document.getElementById('signupStatus');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const showSignupBtn = document.getElementById('showSignupBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
let isSubmitting = false;

// Never keep email/password query parameters in the browser address bar.
if (window.location.search) {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function cleanUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function usernameToEmail(username) {
  const cleaned = cleanUsername(username);
  return cleaned.includes('@') ? cleaned : `${cleaned}@${USERNAME_DOMAIN}`;
}

function displayFromEmail(email) {
  return String(email || 'user').split('@')[0];
}

function showStatus(el, message, isError = false) {
  el.classList.toggle('error', isError);
  el.textContent = message;
}

function firebaseMessage(error) {
  const code = error && error.code ? error.code : '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Invalid username or password.';
  if (code.includes('email-already-in-use')) return 'Username already exists.';
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
  if (code.includes('permission-denied')) return 'Access denied. Check your access code or database rules.';
  return 'Something went wrong. Please try again.';
}

async function ensureProfileAfterLogin(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);
  const fallbackName = displayFromEmail(user.email);
  const isFirstAdmin = user.email === FIRST_ADMIN_EMAIL;

  if (!snapshot.exists()) {
    await set(userRef, {
      displayName: fallbackName,
      username: fallbackName,
      email: user.email || '',
      role: isFirstAdmin ? 'admin' : 'member',
      approved: isFirstAdmin,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      online: true
    });
    return;
  }

  const profile = snapshot.val() || {};
  const updates = {
    email: user.email || '',
    lastSeen: serverTimestamp(),
    online: true
  };

  if (!profile.displayName) updates.displayName = fallbackName;
  if (!profile.username) updates.username = fallbackName;
  if (isFirstAdmin) {
    updates.role = 'admin';
    updates.approved = true;
  }

  await update(userRef, updates);
}

if (togglePassword && passwordInput) togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.textContent = isPassword ? 'Hide' : 'Show';
});

if (showSignupBtn && signupForm) showSignupBtn.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

if (showLoginBtn && signupForm) showLoginBtn.addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

if (loginForm) loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('email').value;
  const password = passwordInput.value;
  const email = usernameToEmail(username);

  showStatus(statusMessage, 'Signing in...');
  isSubmitting = true;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensureProfileAfterLogin(credential.user);
    showStatus(statusMessage, 'Signed in. Opening...');
    window.location.href = 'chat.html';
  } catch (error) {
    console.error(error);
    showStatus(statusMessage, firebaseMessage(error), true);
    isSubmitting = false;
  }
});

if (signupForm) signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = cleanUsername(document.getElementById('signupUsername').value);
  const password = document.getElementById('signupPassword').value;
  const inviteCode = cleanUsername(document.getElementById('inviteCode').value).toUpperCase();

  if (!username || username.includes('@')) {
    showStatus(signupStatus, 'Use a simple username only.', true);
    return;
  }

  if (!inviteCode) {
    showStatus(signupStatus, 'Access code required.', true);
    return;
  }

  showStatus(signupStatus, 'Checking access...');
  isSubmitting = true;

  try {
    const inviteSnap = await get(ref(db, `invites/${inviteCode}`));
    const invite = inviteSnap.val();

    if (!invite || invite.active !== true || invite.usedBy) {
      showStatus(signupStatus, 'Invalid or used access code.', true);
      isSubmitting = false;
      return;
    }

    const email = usernameToEmail(username);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const displayName = username;

    await set(ref(db, `users/${uid}`), {
      displayName,
      username,
      email,
      role: 'member',
      approved: true,
      inviteCode,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      online: true
    });

    try {
  await update(ref(db, `invites/${inviteCode}`), {
    active: false,
    usedBy: uid,
    usedByName: username,
    usedAt: serverTimestamp()
  });
} catch (e) {
  console.warn('Invite update skipped:', e);
});

    showStatus(signupStatus, 'Account created. Opening...');
window.location.href = 'chat.html';
  } catch (error) {
    console.error(error);
    showStatus(signupStatus, firebaseMessage(error), true);
    isSubmitting = false;
  }
});

onAuthStateChanged(auth, (user) => {
  if (user && !isSubmitting) window.location.href = 'chat.html';
});
