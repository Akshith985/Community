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

// Modal Controls
function openAuthModal(mode) {
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
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.remove('active');
}

// Global window registration for dynamic inline HTML buttons
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

// Auth Handlers
async function handleEmailAuth(event) {
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
}

async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  } catch (error) {
    alert("Google Auth Error: " + error.message);
  }
}

async function loginWithGithub() {
  try {
    await signInWithPopup(auth, githubProvider);
    closeAuthModal();
  } catch (error) {
    alert("GitHub Auth Error: " + error.message);
  }
}

async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Logout Error: " + error.message);
  }
}

window.logoutUser = logoutUser;

// DOM Event Listeners Binding
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-login-trigger')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btn-signup-trigger')?.addEventListener('click', () => openAuthModal('signup'));
  document.getElementById('btn-close-modal')?.addEventListener('click', closeAuthModal);
  
  document.getElementById('btn-google-auth')?.addEventListener('click', loginWithGoogle);
  document.getElementById('btn-github-auth')?.addEventListener('click', loginWithGithub);
  document.getElementById('btn-logout')?.addEventListener('click', logoutUser);

  document.getElementById('auth-form')?.addEventListener('submit', handleEmailAuth);
  document.getElementById('admin-create-form')?.addEventListener('submit', handleCreateProject);
});

// Create Mission
async function handleCreateProject(event) {
  event.preventDefault();
  if (!currentUser || currentUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    alert("Unauthorized action!");
    return;
  }

  const title = document.getElementById('proj-title').value;
  const tech_stack = document.getElementById('proj-tech').value;
  const description = document.getElementById('proj-desc').value;

  const { error } = await supabaseClient
    .from('projects')
    .insert([{ title, tech_stack, description }]);

  if (error) {
    alert('Error publishing mission: ' + error.message);
  } else {
    document.getElementById('proj-title').value = '';
    document.getElementById('proj-tech').value = '';
    document.getElementById('proj-desc').value = '';
    renderDashboard();
  }
}

// Complete Mission
window.completeProject = async (projId, encTitle, encTech, encDesc) => {
  if (!currentUser) return;

  const email = currentUser.email.toLowerCase();
  const title = decodeURIComponent(encTitle);
  const tech_stack = decodeURIComponent(encTech);
  const description = decodeURIComponent(encDesc);

  const { error: insertError } = await supabaseClient
    .from('completed_missions')
    .insert([{ user_email: email, project_id: projId }]);

  if (insertError) {
    if (insertError.code === '23505') {
      alert("You have already completed this mission!");
    } else {
      alert("Error completing mission: " + insertError.message);
    }
    return;
  }

  await supabaseClient
    .from('done_projects')
    .insert([{
      project_id: projId,
      title: title,
      tech_stack: tech_stack,
      description: description,
      completed_by: email
    }]);

  const { count, error: countError } = await supabaseClient
    .from('completed_missions')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', email);

  if (!countError) {
    const totalPoints = count * 5;

    await supabaseClient
      .from('leaderboard')
      .upsert({
        email: email,
        completed_missions: count,
        total_points: totalPoints,
        updated_at: new Date()
      }, { onConflict: 'email' });

    alert(`Mission Completed! +5 Points awarded (${totalPoints} Total PTS).`);
    renderDashboard();
  }
};

// UI Dashboard Sync Pipeline
async function renderDashboard() {
  if (!currentUser) return;

  const email = currentUser.email.toLowerCase();
  const isAdmin = email === ADMIN_EMAIL.toLowerCase();

  document.getElementById('dash-user-email').textContent = currentUser.email;
  const roleEl = document.getElementById('dash-user-role');
  if (roleEl) {
    if (isAdmin) {
      roleEl.textContent = 'ADMIN';
      roleEl.className = 'badge-admin';
      document.getElementById('admin-panel').style.display = 'block';
    } else {
      roleEl.textContent = 'MEMBER';
      roleEl.className = 'badge-member';
      document.getElementById('admin-panel').style.display = 'none';
    }
  }

  let userCompletions = [];
  const { data: completions } = await supabaseClient
    .from('completed_missions')
    .select('project_id')
    .eq('user_email', email);

  if (completions) {
    userCompletions = completions.map(c => c.project_id);
  }

  const countEl = document.getElementById('dash-completed-count');
  const pointsEl = document.getElementById('dash-total-points');
  if (countEl) countEl.textContent = userCompletions.length;
  if (pointsEl) pointsEl.textContent = userCompletions.length * 5;

  // Render Leaderboard
  const lbContainer = document.getElementById('leaderboard-list');
  if (lbContainer) {
    const { data: lbData } = await supabaseClient
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false });

    if (lbData && lbData.length > 0) {
      lbContainer.innerHTML = lbData.map((entry, index) => {
        const handle = entry.email ? entry.email.split('@')[0] : 'Member';
        const isCurrent = entry.email === email;
        return `
          <div class="nes-container is-dark is-rounded" style="margin-bottom: 0.8rem; padding: 0.8rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; ${isCurrent ? 'border-color: #f7d51d;' : ''}">
            <div>
              <span style="color: #f7d51d;">#${index + 1}</span>
              <span style="margin-left: 8px;">${handle} ${isCurrent ? '(You)' : ''}</span>
            </div>
            <div>
              <span style="color: #92cc41;">${entry.total_points} PTS</span>
              <span style="color: #aaa; font-size: 0.55rem; margin-left: 6px;">(${entry.completed_missions} missions)</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      lbContainer.innerHTML = `<p style="font-size: 0.6rem; color: #aaa; text-align: center;">No rankings recorded yet.</p>`;
    }
  }

  // Render Completed Projects Archive
  const doneContainer = document.getElementById('done-projects-container');
  if (doneContainer) {
    const { data: doneData } = await supabaseClient
      .from('done_projects')
      .select('*')
      .order('completed_at', { ascending: false });

    if (doneData && doneData.length > 0) {
      doneContainer.innerHTML = doneData.map(item => {
        const userHandle = item.completed_by ? item.completed_by.split('@')[0] : 'Member';
        const tags = item.tech_stack.split(',').map(t => `<span class="tech-tag" style="background-color: #209cee; color: #fff;">${t.trim()}</span>`).join('');
        return `
          <div class="nes-container is-dark is-rounded" style="margin-bottom: 0.8rem; padding: 0.8rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <h4 style="font-size: 0.75rem; color: #92cc41; margin: 0;">${item.title}</h4>
              <span style="font-size: 0.55rem; color: #f7d51d;">Completed by ${userHandle}</span>
            </div>
            <div style="margin-bottom: 0.5rem;">${tags}</div>
            <p style="font-size: 0.58rem; color: #aaa; margin: 0;">${item.description}</p>
          </div>
        `;
      }).join('');
    } else {
      doneContainer.innerHTML = `<p style="font-size: 0.6rem; color: #aaa; text-align: center;">No archived project completions.</p>`;
    }
  }

  // Render Missions
  const projContainer = document.getElementById('projects-container');
  if (projContainer) {
    const { data: projects } = await supabaseClient
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projects && projects.length > 0) {
      projContainer.innerHTML = projects.map(proj => {
        const isCompleted = userCompletions.includes(proj.id);
        const techTags = proj.tech_stack.split(',').map(t => `<span class="tech-tag">${t.trim()}</span>`).join('');

        return `
          <div class="nes-container is-dark with-title project-card ${isCompleted ? 'is-rounded' : ''}">
            <p class="title" style="font-size: 0.75rem; color: ${isCompleted ? '#92cc41' : '#209cee'};">${proj.title}</p>
            <div>
              <p style="font-size: 0.65rem; color: #ccc; line-height: 1.2rem; margin-bottom: 1rem;">${proj.description}</p>
              <div style="margin-bottom: 1rem;">${techTags}</div>
            </div>
            <div style="border-top: 2px dashed #444; padding-top: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.6rem; color: #f7d51d;">+5 PTS</span>
              ${
                isCompleted 
                  ? `<button class="nes-btn is-disabled" disabled style="font-size: 0.55rem;">Completed ✔</button>`
                  : `<button class="nes-btn is-success" style="font-size: 0.55rem;" onclick="completeProject('${proj.id}', '${encodeURIComponent(proj.title)}', '${encodeURIComponent(proj.tech_stack)}', '${encodeURIComponent(proj.description)}')">Mark Complete</button>`
              }
            </div>
          </div>
        `;
      }).join('');
    } else {
      projContainer.innerHTML = `<p style="font-size: 0.65rem; color: #aaa;">No active missions posted.</p>`;
    }
  }
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const userSection = document.getElementById("user-profile");
  const authBtns = document.getElementById("auth-buttons");
  const userNameEl = document.getElementById("user-name");
  const userAvatarEl = document.getElementById("user-avatar");

  const guestView = document.getElementById("guest-view");
  const dashboardView = document.getElementById("dashboard-view");

  if (user) {
    if (userNameEl) userNameEl.textContent = user.displayName || user.email.split('@')[0];
    if (userAvatarEl) userAvatarEl.src = user.photoURL || "https://nescss.github.io/nes.css/favicon.png";
    
    if (authBtns) authBtns.style.display = "none";
    if (userSection) userSection.style.display = "flex";

    if (guestView) guestView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "block";

    renderDashboard();
  } else {
    if (authBtns) authBtns.style.display = "flex";
    if (userSection) userSection.style.display = "none";

    if (guestView) guestView.style.display = "block";
    if (dashboardView) dashboardView.style.display = "none";
  }
});
