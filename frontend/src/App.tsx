
import { useState } from "react";
import "./App.css";

type Category =
  | "Movies"
  | "TV Series"
  | "Board Games"
  | "Video Games"
  | "Surprise Us";

function App() {
  const [category, setCategory] = useState<Category>("Movies");
  const [mood, setMood] = useState("Anything");
  const [time, setTime] = useState("2 hours");

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

  function handleRecommend() {
    alert(
      `Category: ${category}\nMood: ${mood}\nTime: ${time}`
    );
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
                className={
                  category === item ? "selected" : ""
                }
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
                className={mood === item ? "selected" : ""}
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
                className={time === item ? "selected" : ""}
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
            onClick={handleRecommend}
          >
            ✨ Find Our Perfect Match
          </button>
        </section>
      </main>

      <footer>
        <p>What Are We Doing Tonight? | Hackathon Project</p>
      </footer>
    </div>
  );
}

export default App;
