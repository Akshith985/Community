import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyACty8LDYlv940GgVko67K6h5Fr0hv5WFU",
  authDomain: "hackathon-c348c.firebaseapp.com",
  projectId: "hackathon-c348c",
  storageBucket: "hackathon-c348c.firebasestorage.app",
  messagingSenderId: "704711927529",
  appId: "1:704711927529:web:fae0c151e83cc29910f278",
  measurementId: "G-29PMXKGH4Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

const ADMIN_EMAIL = "akshithclg@gmail.com";
let currentAuthMode = 'login';
let currentUser = null;

let defaultProjects = [
  {
    id: "p1",
    title: "Distributed Key-Value Store",
    tech: ["Java", "Docker", "WAL"],
    desc: "Build a light distributed key-value store with replication and write-ahead logging."
  },
  {
    id: "p2",
    title: "Aptos Escrow Smart Contract",
    tech: ["Move", "Next.js", "TypeScript"],
    desc: "Develop and deploy an automated token escrow module on Aptos testnet."
  }
];

function getStoredProjects() {
  const data = localStorage.getItem("skynet_projects");
  return data ? JSON.parse(data) : defaultProjects;
}

function saveProjects(projects) {
  localStorage.setItem("skynet_projects", JSON.stringify(projects));
}

function getUserProgress(email) {
  const data = localStorage.getItem("skynet_user_" + email);
  return data ? JSON.parse(data) : { completedIds: [], points: 0 };
}

function saveUserProgress(email, progress) {
  localStorage.setItem("skynet_user_" + email, JSON.stringify(progress));
}

window.openAuthModal = (mode) => {
  currentAuthMode = mode;
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('modal-title');
  const submitBtn = document.getElementById('modal-submit-btn');

  if (mode === 'signup') {
    title.textContent = 'Create SKYNET Account';
    submitBtn.textContent = 'Sign Up';
    submitBtn.className = 'nes-btn is-success';
  } else {
    title.textContent = 'Login to SKYNET';
    submitBtn.textContent = 'Login';
    submitBtn.className = 'nes-btn is-primary';
  }

  modal.classList.add('active');
};

window.closeAuthModal = () => {
  const modal = document.getElementById('auth-modal');
  modal.classList.remove('active');
};

window.handleEmailAuth = async (event) => {
  event.preventDefault();
  const email = document.getElementById('modal-email').value;
  const password = document.getElementById('modal-password').value;

  try {
    if (currentAuthMode === 'signup') {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('Welcome to SKYNET!');
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    closeAuthModal();
  } catch (error) {
    alert("Auth Error: " + error.message);
  }
};

window.loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  } catch (error) {
    alert("Google Auth Error: " + error.message);
  }
};

window.loginWithGithub = async () => {
  try {
    await signInWithPopup(auth, githubProvider);
    closeAuthModal();
  } catch (error) {
    alert("GitHub Auth Error: " + error.message);
  }
};

window.logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Logout Error: " + error.message);
  }
};

window.handleCreateProject = (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    alert("Unauthorized action!");
    return;
  }

  const title = document.getElementById('proj-title').value;
  const techRaw = document.getElementById('proj-tech').value;
  const desc = document.getElementById('proj-desc').value;

  const tech = techRaw.split(',').map(t => t.trim()).filter(Boolean);
  const projects = getStoredProjects();

  const newProj = {
    id: "p_" + Date.now(),
    title,
    tech,
    desc
  };

  projects.push(newProj);
  saveProjects(projects);

  document.getElementById('proj-title').value = '';
  document.getElementById('proj-tech').value = '';
  document.getElementById('proj-desc').value = '';

  renderDashboard();
};

window.completeProject = (projId) => {
  if (!currentUser) return;

  const email = currentUser.email.toLowerCase();
  const progress = getUserProgress(email);

  if (!progress.completedIds.includes(projId)) {
    progress.completedIds.push(projId);
    progress.points += 5;
    saveUserProgress(email, progress);
    renderDashboard();
  }
};

function renderDashboard() {
  if (!currentUser) return;

  const email = currentUser.email.toLowerCase();
  const isAdmin = email === ADMIN_EMAIL.toLowerCase();

  document.getElementById('dash-user-email').textContent = currentUser.email;
  const roleEl = document.getElementById('dash-user-role');
  if (isAdmin) {
    roleEl.textContent = 'ADMIN';
    roleEl.className = 'badge-admin';
    document.getElementById('admin-panel').style.display = 'block';
  } else {
    roleEl.textContent = 'MEMBER';
    roleEl.className = 'badge-member';
    document.getElementById('admin-panel').style.display = 'none';
  }

  const progress = getUserProgress(email);
  document.getElementById('dash-completed-count').textContent = progress.completedIds.length;
  document.getElementById('dash-total-points').textContent = progress.points;

  const projects = getStoredProjects();
  const container = document.getElementById('projects-container');
  container.innerHTML = '';

  projects.forEach((proj) => {
    const isCompleted = progress.completedIds.includes(proj.id);
    const card = document.createElement('div');
    card.className = `nes-container is-dark with-title project-card ${isCompleted ? 'is-rounded' : ''}`;
    
    let techTags = proj.tech.map(t => `<span class="tech-tag">${t}</span>`).join('');
    
    card.innerHTML = `
      <p class="title" style="font-size: 0.75rem; color: ${isCompleted ? '#92cc41' : '#209cee'};">${proj.title}</p>
      <div>
        <p style="font-size: 0.65rem; color: #ccc; line-height: 1.2rem; margin-bottom: 1rem;">${proj.desc}</p>
        <div style="margin-bottom: 1rem;">${techTags}</div>
      </div>
      <div style="border-top: 2px dashed #444; padding-top: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.6rem; color: #f7d51d;">+5 PTS</span>
        ${
          isCompleted 
            ? `<button class="nes-btn is-disabled" disabled style="font-size: 0.55rem;">Completed ✔</button>`
            : `<button class="nes-btn is-success" style="font-size: 0.55rem;" onclick="completeProject('${proj.id}')">Mark Complete</button>`
        }
      </div>
    `;

    container.appendChild(card);
  });
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const userSection = document.getElementById("user-profile");
  const authBtns = document.getElementById("auth-buttons");
  const userNameEl = document.getElementById("user-name");
  const userAvatarEl = document.getElementById("user-avatar");

  const guestView = document.getElementById("guest-view");
  const dashboardView = document.getElementById("dashboard-view");

  if (user) {
    userNameEl.textContent = user.displayName || user.email.split('@')[0];
    userAvatarEl.src = user.photoURL || "https://nescss.github.io/nes.css/favicon.png";
    
    if (authBtns) authBtns.style.display = "none";
    if (userSection) userSection.style.display = "flex";

    guestView.style.display = "none";
    dashboardView.style.display = "block";

    renderDashboard();
  } else {
    if (authBtns) authBtns.style.display = "flex";
    if (userSection) userSection.style.display = "none";

    guestView.style.display = "block";
    dashboardView.style.display = "none";
  }
});
