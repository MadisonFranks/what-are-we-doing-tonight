
import { useState, useEffect } from "react";
import "./App.css";

type Category =
  | "Movies"
  | "TV Series"
  | "Board Games"
  | "Video Games"
  | "Surprise Us";

type Profile = {
  id: string;
  name: string;
  age: number;
  interests: string[];
};

type Recommendation = {
  title: string;
  category: string;
  matchScore: number;
  reason: string;
  ageRating: string;
};

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

const interests = [
  "Comedy",
  "Action",
  "Adventure",
  "Mystery",
  "Animation",
  "Horror",
  "Romance",
  "Fantasy",
  "Strategy",
  "Family"
];

function App() {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem("tonight-profiles");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState<Category>("Movies");
  const [mood, setMood] = useState("Anything");
  const [time, setTime] = useState("2 hours");

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    localStorage.setItem("tonight-profiles", JSON.stringify(profiles));
  }, [profiles]);

  function toggleInterest(interest: string) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  function resetForm() {
    setName("");
    setAge("");
    setSelectedInterests([]);
    setEditingId(null);
    setShowForm(false);
  }

  function saveProfile() {
    const numericAge = Number(age);

    if (
      !name.trim() ||
      !Number.isInteger(numericAge) ||
      numericAge < 1 ||
      numericAge > 120
    ) {
      alert("Please enter a name and a valid age between 1 and 120.");
      return;
    }

    if (selectedInterests.length === 0) {
      alert("Please select at least one interest.");
      return;
    }

    if (editingId) {
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === editingId
            ? {
                ...profile,
                name: name.trim(),
                age: numericAge,
                interests: selectedInterests
              }
            : profile
        )
      );
    } else {
      const newProfile: Profile = {
        id: crypto.randomUUID(),
        name: name.trim(),
        age: numericAge,
        interests: selectedInterests
      };

      setProfiles((current) => [...current, newProfile]);
      setSelectedIds((current) => [...current, newProfile.id]);
    }

    resetForm();
  }

  function editProfile(profile: Profile) {
    setEditingId(profile.id);
    setName(profile.name);
    setAge(String(profile.age));
    setSelectedInterests([...profile.interests]);
    setShowForm(true);
  }

  function deleteProfile(id: string) {
    if (!window.confirm("Delete this profile?")) return;

    setProfiles((current) =>
      current.filter((profile) => profile.id !== id)
    );

    setSelectedIds((current) =>
      current.filter((selectedId) => selectedId !== id)
    );

    if (editingId === id) resetForm();
  }

  function toggleParticipant(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function handleRecommend() {
    const participants = profiles.filter((profile) =>
      selectedIds.includes(profile.id)
    );

    if (participants.length === 0) {
      setError("Select at least one participant first.");
      return;
    }

    setLoading(true);
    setError("");
    setRecommendations([]);
    setHasSearched(false);

    try {
      const response = await fetch(
        "http://localhost:8080/api/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            category,
            mood,
            time,
            participants
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.recommendations)) {
        throw new Error("Invalid recommendation response");
      }

      setRecommendations(data.recommendations);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load recommendations. Check that Java is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedProfiles = profiles.filter((profile) =>
    selectedIds.includes(profile.id)
  );

  return (
    <div className="app">
      <header className="header">
        <h1>🎬 What Are We Doing Tonight?</h1>
        <p>Less debating. More fun together.</p>
      </header>

      <main className="main">
        <section className="welcome">
          <h2>Let's plan your perfect night!</h2>
          <p>Find something everyone in your group will enjoy.</p>
        </section>

        <section className="card">
          <h2>👥 Who's joining tonight?</h2>
          <p>Create profiles and select your group.</p>

          <div className="profile-grid">
            {profiles.map((profile) => {
              const selected = selectedIds.includes(profile.id);

              return (
                <div
                  className={`profile-card ${selected ? "active" : ""}`}
                  key={profile.id}
                >
                  <button
                    type="button"
                    className="profile-select"
                    onClick={() => toggleParticipant(profile.id)}
                    aria-pressed={selected}
                  >
                    <span className="profile-avatar">
                      {profile.age < 18 ? "🧒" : "🧑"}
                    </span>

                    <strong>{profile.name}</strong>

                    <span>
                      {profile.age < 18 ? "Child" : "Adult"} · Age {profile.age}
                    </span>

                    <span className="profile-interests">
                      {profile.interests.join(", ")}
                    </span>

                    <span>{selected ? "✓ Selected" : "Select"}</span>
                  </button>

                  <div className="profile-actions">
                    <button
                      type="button"
                      onClick={() => editProfile(profile)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProfile(profile.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!showForm && (
            <button
              type="button"
              className="add-profile-button"
              onClick={() => setShowForm(true)}
            >
              + Add Profile
            </button>
          )}

          {showForm && (
            <div className="profile-form">
              <h3>{editingId ? "Edit Profile" : "Create Profile"}</h3>

              <label htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                type="text"
                value={name}
                maxLength={50}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter a name"
              />

              <label htmlFor="profile-age">Age</label>
              <input
                id="profile-age"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="Enter age"
              />

              <h4>Favorite interests</h4>

              <div className="categories">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={
                      selectedInterests.includes(interest)
                        ? "selected"
                        : ""
                    }
                    aria-pressed={selectedInterests.includes(interest)}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <div className="form-actions">
                <button type="button" onClick={saveProfile}>
                  Save Profile
                </button>

                <button type="button" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <p className="group-summary">
            {selectedProfiles.length} participant(s) selected
            {selectedProfiles.length > 0 &&
              `: ${selectedProfiles.map((p) => p.name).join(", ")}`}
          </p>
        </section>

        <section className="card">
          <h2>What sounds fun tonight?</h2>

          <div className="categories">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "selected" : ""}
                aria-pressed={category === item}
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
                type="button"
                className={mood === item ? "selected" : ""}
                aria-pressed={mood === item}
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
                type="button"
                className={time === item ? "selected" : ""}
                aria-pressed={time === item}
                onClick={() => setTime(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="results">
          <h2>Ready to find something fun?</h2>

          <button
            type="button"
            className="recommend-button"
            onClick={handleRecommend}
            disabled={loading}
          >
            {loading
              ? "Finding your matches..."
              : "✨ Find Our Perfect Match"}
          </button>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          {hasSearched && (
            <div className="recommendation-section">
              <h2>🎉 Your Recommendations!</h2>

              <p>
                Group: {selectedProfiles.map((p) => p.name).join(", ")}
              </p>

              <p>
                {category} | {mood} | {time}
              </p>

              <div className="recommendation-grid">
                {recommendations.map((item, index) => (
                  <article
                    className="recommendation-card"
                    key={`${item.title}-${index}`}
                  >
                    <h3>{item.title}</h3>

                    <p>
                      <strong>Category:</strong> {item.category}
                    </p>

                    <p>
                      <strong>Age Rating:</strong> {item.ageRating}
                    </p>

                    <div className="match-score">
                      <strong>{item.matchScore}% Match</strong>

                      <div className="score-bar">
                        <div
                          className="score-fill"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, item.matchScore)
                            )}%`
                          }}
                        />
                      </div>
                    </div>

                    <p className="recommendation-reason">
                      {item.reason}
                    </p>
                  </article>
                ))}
              </div>
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
