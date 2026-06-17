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
  databaseURL: "https://lighthouse-8bf51-default-rtdb.asia-southeast1.firebasedatabase.app",
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
const emailInput = document.getElementById('email');

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

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  statusMessage.classList.remove('error');
  statusMessage.textContent = 'Signing in...';

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    statusMessage.textContent = 'Signed in.';
    window.location.href = 'chat.html';
  } catch (error) {
    statusMessage.classList.add('error');

    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      statusMessage.textContent = 'Invalid email or password.';
    } else if (error.code === 'auth/user-not-found') {
      statusMessage.textContent = 'Account not found.';
    } else if (error.code === 'auth/too-many-requests') {
      statusMessage.textContent = 'Too many attempts. Try again later.';
    } else {
      statusMessage.textContent = 'Unable to sign in. Please try again.';
    }
  }
});
