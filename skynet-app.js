// Fetch and render Available Missions (Projects)
async function fetchMissions() {
  const container = document.getElementById('projects-container');
  if (!container) return;

  const { data, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching missions:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p style="font-size: 0.65rem; color: #aaa;">No missions posted yet.</p>`;
    return;
  }

  container.innerHTML = data.map(project => {
    const tags = project.tech_stack.split(',').map(t => `<span class="tech-tag">${t.trim()}</span>`).join('');
    return `
      <div class="nes-container is-dark is-rounded project-card">
        <div>
          <h3 style="font-size: 0.8rem; color: #f7d51d; margin-bottom: 0.5rem;">${project.title}</h3>
          <div style="margin-bottom: 0.8rem;">${tags}</div>
          <p style="font-size: 0.6rem; color: #ccc; line-height: 1.1rem;">${project.description}</p>
        </div>
        <div style="margin-top: 1rem; display: flex; gap: 8px;">
          <button type="button" class="nes-btn is-success" style="font-size: 0.55rem; flex: 1;" onclick="completeMission('${project.id}')">Complete (+5 Pts)</button>
          <button type="button" class="nes-btn is-error" style="font-size: 0.55rem;" onclick="removeMission('${project.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// Create new Mission (Admin)
async function handleCreateProject(event) {
  event.preventDefault();
  const title = document.getElementById('proj-title').value;
  const tech_stack = document.getElementById('proj-tech').value;
  const description = document.getElementById('proj-desc').value;

  const { error } = await supabaseClient
    .from('projects')
    .insert([{ title, tech_stack, description }]);

  if (error) {
    alert('Error publishing mission: ' + error.message);
  } else {
    event.target.reset();
    fetchMissions();
  }
}

// Remove Mission
async function removeMission(projectId) {
  if (!confirm("Are you sure you want to remove this mission?")) return;

  const { error } = await supabaseClient
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    alert('Failed to delete mission: ' + error.message);
  } else {
    fetchMissions();
  }
}

// Save or Update User Leaderboard Entry
async function syncUserLeaderboard(userId, email, pointsToAdd = 0, missionsToAdd = 0) {
  const { data: current } = await supabaseClient
    .from('leaderboard')
    .select('*')
    .eq('user_id', userId)
    .single();

  const newPoints = (current?.total_points || 0) + pointsToAdd;
  const newMissions = (current?.completed_missions || 0) + missionsToAdd;

  const { error } = await supabaseClient
    .from('leaderboard')
    .upsert({
      user_id: userId,
      email: email,
      completed_missions: newMissions,
      total_points: newPoints,
      updated_at: new Date()
    }, { onConflict: 'user_id' });

  if (!error) {
    document.getElementById('dash-total-points').innerText = newPoints;
    document.getElementById('dash-completed-count').innerText = newMissions;
  }
}

// Handle Mission Completion
async function completeMission(projectId) {
  const email = document.getElementById('dash-user-email')?.innerText;
  if (!email) {
    alert("Please log in to claim points!");
    return;
  }
  await syncUserLeaderboard(email, email, 5, 1);
  alert("Mission completed! +5 Points added.");
}

window.addEventListener('DOMContentLoaded', fetchMissions);