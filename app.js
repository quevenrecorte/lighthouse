import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMZxgShqE5g_bA4-Y8ShUux_FhMITWEFs",
  authDomain: "lighthouse-8bf51.firebaseapp.com",
  projectId: "lighthouse-8bf51",
  storageBucket: "lighthouse-8bf51.firebasestorage.app",
  messagingSenderId: "1040589784841",
  appId: "1:1040589784841:web:46b16ab5c5c6a7f08af5d8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const signinButton = document.getElementById('signinButton');

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

function getFriendlyAuthError(errorCode) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email format.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Sign in failed. Please try again.';
  }
}

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.textContent = isPassword ? 'Hide' : 'Show';
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = 'chat.html';
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  signinButton.disabled = true;
  showStatus('Signing in...');

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    showStatus('Signed in. Opening...');
    window.location.href = 'chat.html';
  } catch (error) {
    showStatus(getFriendlyAuthError(error.code), true);
    signinButton.disabled = false;
  }
});
