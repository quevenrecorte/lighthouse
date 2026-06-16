const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.textContent = isPassword ? 'Hide' : 'Show';
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  statusMessage.classList.remove('error');
  statusMessage.textContent = 'Firebase login is not connected yet.';

  setTimeout(() => {
    statusMessage.classList.add('error');
    statusMessage.textContent = 'Next step: connect Firebase Auth.';
  }, 600);
});
