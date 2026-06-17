import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
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

const userStatus = document.getElementById('userStatus');
const logoutButton = document.getElementById('logoutButton');

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  userStatus.textContent = `Signed in as ${user.email}`;
});

logoutButton.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});
