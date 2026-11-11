
import { useState } from "react";
import "./App.css";

type Category =
  | "Movies"
  | "TV Series"
  | "Board Games"
  | "Video Games"
  | "Surprise Us";

type Recommendation = {
  title: string;
  category: string;
  matchScore: number;
  reason: string;
  ageRating: string;
};

type RecommendationResponse = {
  recommendations: Recommendation[];
};

function App() {
  const [category, setCategory] = useState<Category>("Movies");
  const [mood, setMood] = useState("Anything");
  const [time, setTime] = useState("2 hours");

  const [recommendations, setRecommendations] = useState<
    Recommendation[]
  >([]);

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
            time
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `Backend returned status ${response.status}`
        );
      }

      const data: RecommendationResponse =
        await response.json();

      if (!Array.isArray(data.recommendations)) {
        throw new Error("Invalid recommendation response");
      }

      setRecommendations(data.recommendations);
      setHasSearched(true);
    } catch (err) {
      console.error("Recommendation error:", err);

      setError(
        "Unable to connect to the recommendation server. " +
        "Make sure your Java backend is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎬 What Are We Doing Tonight?</h1>
        <p>Less debating. More fun together.</p>
      </header>

      <main className="main">
        <section className="welcome">
          <h2>Let's plan your perfect night!</h2>
          <p>
            Find something everyone in your group will enjoy.
          </p>
        </section>

        <section className="card">
          <h2>What sounds fun tonight?</h2>

          <div className="categories">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  category === item ? "selected" : ""
                }
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
          <p>
            We'll help your group decide what to do tonight!
          </p>

          <button
            className="recommend-button"
            type="button"
            onClick={handleRecommend}
            disabled={loading}
          >
            {loading
              ? "Finding your matches..."
              : "✨ Find Our Perfect Match"}
          </button>

          {error && (
            <div className="error-message" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={handleRecommend}
              >
                Try Again
              </button>
            </div>
          )}

          {hasSearched && (
            <div
              className="recommendation-section"
              aria-live="polite"
            >
              <h2>🎉 Your Recommendations!</h2>

              <p>
                Selected: {category} | {mood} | {time}
              </p>

              {recommendations.length === 0 ? (
                <p>No recommendations were returned.</p>
              ) : (
                <div className="recommendation-grid">
                  {recommendations.map((item, index) => (
                    <article
                      className="recommendation-card"
                      key={`${item.title}-${index}`}
                    >
                      <h3>{item.title}</h3>

                      <p>
                        <strong>Category:</strong>{" "}
                        {item.category}
                      </p>

                      <p>
                        <strong>Age Rating:</strong>{" "}
                        {item.ageRating}
                      </p>

                      <div className="match-score">
                        <strong>
                          {item.matchScore}% Match
                        </strong>

                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{
                              width: `${
                                Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    item.matchScore
                                  )
                                )
                              }%`
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
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>
          What Are We Doing Tonight? | Hackathon Project
        </p>
      </footer>
    </div>
  );
}

export default App;
