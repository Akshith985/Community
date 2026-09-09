// Fetch and render Leaderboard
async function loadLeaderboard() {
  const leaderboardList = document.getElementById('leaderboard-list');
  if (!leaderboardList) return;

  const { data, error } = await supabaseClient
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false });

  if (error) {
    console.error('Error fetching leaderboard:', error.message);
    return;
  }

  leaderboardList.innerHTML = data.length === 0 
    ? `<p style="text-align: center; opacity: 0.7;">No entries yet. Be the first!</p>`
    : data.map((entry, index) => `
        <div class="nes-container is-rounded" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span><strong>#${index + 1} ${entry.username}</strong></span>
          <span class="accent">${entry.score} PTS</span>
        </div>
      `).join('');
}

// Fetch and render Projects with Delete action
async function loadProjects() {
  const projectsGrid = document.getElementById('projects-grid');
  if (!projectsGrid) return;

  const { data, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error.message);
    return;
  }

  projectsGrid.innerHTML = data.length === 0
    ? `<p style="text-align: center; opacity: 0.7;">No projects submitted yet.</p>`
    : data.map(project => `
        <article class="nes-container is-rounded event-card">
          <span class="tag">${project.track.toUpperCase()}</span>
          <h3>${project.title}</h3>
          <p><strong>Builder:</strong> ${project.author_name}</p>
          <p>${project.description || ''}</p>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            ${project.github_url ? `<a href="${project.github_url}" target="_blank" class="nes-btn is-primary" style="font-size: 10px;">Repo</a>` : ''}
            <button onclick="removeProject('${project.id}')" class="nes-btn is-error" style="font-size: 10px;">Delete</button>
          </div>
        </article>
      `).join('');
}

// Remove project
async function removeProject(projectId) {
  if (!confirm("Are you sure you want to delete this project?")) return;

  const { error } = await supabaseClient
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    alert("Failed to delete project: " + error.message);
  } else {
    loadProjects();
  }
}

// Save or Update Leaderboard Score
async function updateLeaderboardScore(userId, username, scoreDelta) {
  const { data: existing } = await supabaseClient
    .from('leaderboard')
    .select('score')
    .eq('user_id', userId)
    .single();

  const newScore = (existing?.score || 0) + scoreDelta;

  const { error } = await supabaseClient
    .from('leaderboard')
    .upsert({ user_id: userId, username: username, score: newScore, updated_at: new Date() }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error updating leaderboard:', error.message);
  } else {
    loadLeaderboard();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  loadProjects();
});