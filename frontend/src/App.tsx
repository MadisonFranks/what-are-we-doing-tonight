
import { useState, type CSSProperties, type MouseEvent } from "react";
import "./App.css";

type Recommendation = {
  title: string;
  category: string;
  matchScore: number;
  reason: string;
  ageRating: string;
};

type RecommendationResponse = { recommendations: Recommendation[] };

type Category =
  | "Movies"
  | "TV Series"
  | "Board Games"
  | "Video Games"
  | "Surprise Us";


function handleTilt(event: MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  button.style.setProperty("--rotate-x", `${-y * 13}deg`);
  button.style.setProperty("--rotate-y", `${x * 13}deg`);
  button.style.setProperty("--glow-x", `${(x + 0.5) * 100}%`);
  button.style.setProperty("--glow-y", `${(y + 0.5) * 100}%`);
}

function resetTilt(event: MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  button.style.setProperty("--rotate-x", "0deg");
  button.style.setProperty("--rotate-y", "0deg");
  button.style.setProperty("--glow-x", "50%");
  button.style.setProperty("--glow-y", "50%");
}

const tiltStyle = { "--rotate-x": "0deg", "--rotate-y": "0deg" } as CSSProperties;

type Profile = { id: string; name: string; movies: string[]; games: string[]; shows: string[] };
const STORAGE_KEY = "wawdt-vaporwave-profiles-v1";
const ACTIVE_KEY = "wawdt-vaporwave-active-profile-v1";
function loadProfiles(): Profile[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((p): p is Profile => Boolean(p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.movies) && Array.isArray(p.games) && Array.isArray(p.shows)));
  } catch { return []; }
}
const toLines = (items: string[]) => items.join("\n");
const fromLines = (value: string) => [...new Set(value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];

function App() {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles);
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem(ACTIVE_KEY) || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [favoriteMovies, setFavoriteMovies] = useState("");
  const [favoriteGames, setFavoriteGames] = useState("");
  const [favoriteShows, setFavoriteShows] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeProfile = profiles.find(p => p.id === activeId);

  function startNewProfile() {
    setEditingId("new"); setProfileName(""); setFavoriteMovies(""); setFavoriteGames(""); setFavoriteShows(""); setSidebarOpen(true);
  }
  function editProfile(profile: Profile) {
    setEditingId(profile.id); setProfileName(profile.name);
    setFavoriteMovies(toLines(profile.movies)); setFavoriteGames(toLines(profile.games)); setFavoriteShows(toLines(profile.shows)); setSidebarOpen(true);
  }
  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = profileName.trim();
    if (!name) return;
    const id = editingId === "new" ? (globalThis.crypto?.randomUUID?.() || `${Date.now()}`) : editingId;
    if (!id) return;
    const profile: Profile = { id, name, movies: fromLines(favoriteMovies), games: fromLines(favoriteGames), shows: fromLines(favoriteShows) };
    const updated = editingId === "new" ? [...profiles, profile] : profiles.map(p => p.id === id ? profile : p);
    setProfiles(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setActiveId(id); localStorage.setItem(ACTIVE_KEY, id); setEditingId(null);
  }
  function selectProfile(id: string) {
    setActiveId(id); localStorage.setItem(ACTIVE_KEY, id); setEditingId(null);
  }
  function deleteProfile(id: string) {
    if (!window.confirm("Delete this profile and its favorites from this browser?")) return;
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (activeId === id) { setActiveId(""); localStorage.removeItem(ACTIVE_KEY); }
    setEditingId(null);
  }

  const [category, setCategory] = useState<Category>("Movies");
  const [mood, setMood] = useState("Anything");
  const [time, setTime] = useState("2 hours");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const categories: Category[] = [
    "Movies",
    "TV Series",
    "Board Games",
    "Video Games",
    "Surprise Us"
  ];

  const moods = [
    "Anything",
    "Funny",
    "Relaxing",
    "Adventurous",
    "Exciting",
    "Family Friendly"
  ];

  const times = [
    "30 minutes",
    "1 hour",
    "2 hours",
    "3+ hours"
  ];

  async function handleRecommend() {
    setLoading(true);
    setError("");
    setHasSearched(false);
    setRecommendations([]);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, mood, time, profile: activeProfile ? { name: activeProfile.name, favoriteMovies: activeProfile.movies, favoriteVideoGames: activeProfile.games, favoriteTvShows: activeProfile.shows } : null }),
      });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const data: RecommendationResponse = await response.json();
      if (!Array.isArray(data.recommendations)) throw new Error("Invalid backend response");
      setRecommendations(data.recommendations);
      setHasSearched(true);
    } catch (err) {
      setError(`${err instanceof Error ? err.message : "Request failed"}. Check that the Java backend is running on port 8080.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="sky-art" aria-hidden="true" />
      <div className="horizon-grid" aria-hidden="true" />
      <button className="sidebar-toggle tilt-button" style={tiltStyle} onMouseMove={handleTilt} onMouseLeave={resetTilt} onClick={() => setSidebarOpen(!sidebarOpen)} aria-expanded={sidebarOpen} aria-controls="profiles-sidebar">☰ Profiles</button>
      <aside id="profiles-sidebar" className={`profile-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="User profiles">
        <div className="sidebar-heading"><h2>✦ PLAYER PROFILES</h2><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close profiles">×</button></div>
        <p className="sidebar-subtitle">Build your own universe of favorites.</p>
        <button className="tilt-button add-profile" style={tiltStyle} onMouseMove={handleTilt} onMouseLeave={resetTilt} onClick={startNewProfile}>＋ Create profile</button>
        <div className="profile-list">
          {profiles.length === 0 && <p className="sidebar-empty">No profiles yet. Create one to get started!</p>}
          {profiles.map(profile => <div className={`profile-entry ${activeId === profile.id ? "active" : ""}`} key={profile.id}>
            <button className="profile-select" onClick={() => selectProfile(profile.id)} aria-pressed={activeId === profile.id}><span className="profile-avatar">{profile.name.slice(0, 1).toUpperCase()}</span><span>{profile.name}{activeId === profile.id && <small>✓ ACTIVE</small>}</span></button>
            <button className="profile-edit" onClick={() => editProfile(profile)} aria-label={`Edit ${profile.name}`}>✎</button>
          </div>)}
        </div>
        {activeProfile && editingId === null && <div className="favorite-preview"><h3>✦ {activeProfile.name}'s favorites</h3>
          <p><strong>Movies</strong> {activeProfile.movies.join(", ") || "None yet"}</p>
          <p><strong>Video games</strong> {activeProfile.games.join(", ") || "None yet"}</p>
          <p><strong>TV shows</strong> {activeProfile.shows.join(", ") || "None yet"}</p>
          <button className="profile-secondary" onClick={() => editProfile(activeProfile)}>Edit favorites</button>
        </div>}
        {editingId !== null && <form className="profile-form" onSubmit={saveProfile}>
          <h3>{editingId === "new" ? "Create your profile" : "Edit your profile"}</h3>
          <label>Profile name<input required maxLength={40} value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your name" /></label>
          <p className="form-tip">Add one favorite per line.</p>
          <label>🎬 Favorite movies<textarea rows={3} value={favoriteMovies} onChange={e => setFavoriteMovies(e.target.value)} placeholder={"Interstellar\nSpider-Man"}/></label>
          <label>🎮 Favorite video games<textarea rows={3} value={favoriteGames} onChange={e => setFavoriteGames(e.target.value)} placeholder={"Minecraft\nStardew Valley"}/></label>
          <label>📺 Favorite TV shows<textarea rows={3} value={favoriteShows} onChange={e => setFavoriteShows(e.target.value)} placeholder={"Stranger Things\nThe Office"}/></label>
          <div className="form-actions"><button className="tilt-button" style={tiltStyle} onMouseMove={handleTilt} onMouseLeave={resetTilt} type="submit">✦ Save profile</button><button className="profile-secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button></div>
          {editingId !== "new" && <button type="button" className="delete-profile" onClick={() => deleteProfile(editingId)}>Delete profile</button>}
        </form>}
        <p className="privacy-note">Profiles are saved only in this browser on this device.</p>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}/>}
      <header className="header">
        <div className="eyebrow">✦ THE NIGHT IS YOURS ✦</div>
        <h1>WHAT ARE WE <span>DOING TONIGHT?</span></h1>
        <p>Less debating. More fun together.</p>
      </header>

      <main className="main">
        <section className="welcome">
          <h2>YOUR NIGHT. <span>YOUR VIBE.</span></h2>
          <p>Find something everyone in your group will enjoy.</p>
          {activeProfile && <p className="active-greeting">✦ Playing as <strong>{activeProfile.name}</strong> ✦</p>}
        </section>

        <section className="card">
          <h2>What sounds fun tonight?</h2>

          <div className="categories">
            {categories.map((item) => (
              <button
                key={item}
                className={`tilt-button ${category === item ? "selected" : ""}`}
                style={tiltStyle}
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>What's the mood?</h2>

          <div className="categories">
            {moods.map((item) => (
              <button
                key={item}
                className={`tilt-button ${mood === item ? "selected" : ""}`}
                style={tiltStyle}
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
                onClick={() => setMood(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>How much time do you have?</h2>

          <div className="categories">
            {times.map((item) => (
              <button
                key={item}
                className={`tilt-button ${time === item ? "selected" : ""}`}
                style={tiltStyle}
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
                onClick={() => setTime(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="results">
          <h2>Ready to find something fun?</h2>
          <p>
            We'll help your group decide what to do tonight!
          </p>

          <button
            className="recommend-button tilt-button"
            style={tiltStyle}
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            onClick={handleRecommend}
            disabled={loading}
          >
            {loading ? "Finding matches..." : "✨ Find Our Perfect Match"}
          </button>
          {error && <p className="error" role="alert">{error}</p>}
          {hasSearched && (
            <div className="recommendations" aria-live="polite">
              <h2>Your recommendations</h2>
              {recommendations.length === 0 ? <p>No recommendations found.</p> : (
                <div className="recommendation-grid">
                  {recommendations.map((item, index) => (
                    <article className="recommendation-card" key={`${item.title}-${index}`}>
                      <span className="score">{item.matchScore}% match</span>
                      <h3>{item.title}</h3>
                      <p className="recommendation-meta">{item.category} · {item.ageRating}</p>
                      <p>{item.reason}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>What Are We Doing Tonight? | Hackathon Project</p>
      </footer>
    </div>
  );
}

export default App;
