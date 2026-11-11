
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

public class Main {
  static final HttpClient HTTP = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(10)).build();

  static final String MODEL = "gpt-4o-mini";

  public static void main(String[] args) throws Exception {
    int port = Integer.parseInt(
        System.getenv().getOrDefault("PORT", "8080"));

    HttpServer server = HttpServer.create(
        new InetSocketAddress(port), 0);

    server.createContext("/api/health", ex -> {
      if (preflight(ex)) return;
      send(ex, 200, Map.of(
          "ok", true,
          "aiConfigured", hasKey()));
    });

    server.createContext("/api/recommend", ex -> {
      if (preflight(ex)) return;

      if (!ex.getRequestMethod().equals("POST")) {
        send(ex, 405, Map.of("error", "POST required"));
        return;
      }

      try {
        String body = new String(
            ex.getRequestBody().readAllBytes(),
            StandardCharsets.UTF_8);

        if (body.length() > 30000) {
          send(ex, 413, Map.of("error", "Request too large"));
          return;
        }

        Map<String,Object> input = obj(Json.parse(body));
        List<Object> people = arr(input.get("participants"));

        if (people.isEmpty()) {
          send(ex, 400, Map.of(
              "error", "Select at least one participant"));
          return;
        }

        if (people.size() > 12) {
          send(ex, 400, Map.of(
              "error", "Too many participants"));
          return;
        }

        String category = str(input.get("category"));

        if (!Set.of(
            "movie", "tv", "boardgame",
            "videogame", "surprise").contains(category)) {
          category = "movie";
        }

        String mood = str(input.get("mood"));
        int minutes = number(input.get("durationMinutes"), 120);
        int youngest = 120;

        for (Object person : people) {
          int age = number(obj(person).get("age"), -1);

          if (age < 1 || age > 120) {
            send(ex, 400, Map.of(
                "error", "Every participant needs a valid age"));
            return;
          }

          youngest = Math.min(youngest, age);
        }

        Map<String,Object> result;

        if (hasKey()) {
          try {
            result = recommendAI(
                people, category, mood, minutes, youngest);
            result.put("source", "ai");
          } catch (Exception err) {
            System.err.println(
                "AI unavailable: " + err.getMessage());
            result = fallback(category, youngest);
          }
        } else {
          result = fallback(category, youngest);
        }

        send(ex, 200, result);

      } catch (IllegalArgumentException err) {
        send(ex, 400, Map.of(
            "error", "Invalid JSON request"));
      } catch (Exception err) {
        System.err.println("Request error: " + err);
        send(ex, 500, Map.of(
            "error", "Internal server error"));
      }
    });

    server.start();

    System.out.println(
        "Java API running at http://localhost:" + port);
    System.out.println("AI configured: " + hasKey());
  }

  static boolean hasKey() {
    return !System.getenv()
        .getOrDefault("OPENAI_API_KEY", "").isBlank();
  }

  static Map<String,Object> recommendAI(
      List<Object> people,
      String category,
      String mood,
      int minutes,
      int youngest) throws Exception {

    String instructions =
        "You are What Are We Doing Tonight?, an entertainment "
        + "matchmaker. Return exactly 3 real entertainment "
        + "recommendations. Consider every participant fairly. "
        + "Use the requested category (movie, tv, boardgame, "
        + "videogame, or surprise), mood and time. "
        + "For surprise, choose any of those four categories. "
        + "Respect the youngest person's age. For children, "
        + "choose conservative family-friendly titles; avoid "
        + "mature or unsuitable content. "
        + "Do not claim to have checked live availability, "
        + "streaming platforms, game ownership or official ratings. "
        + "Use 'Unverified' for ageRating unless certain. "
        + "matchScore is an illustrative 0-100 estimate, "
        + "not a scientific score. "
        + "Return only JSON: "
        + "{\"recommendations\":["
        + "{\"title\":\"...\","
        + "\"category\":\"movie|tv|boardgame|videogame\","
        + "\"matchScore\":85,"
        + "\"reason\":\"...\","
        + "\"ageRating\":\"Unverified\"}]}";

    Map<String,Object> user = new LinkedHashMap<>();
    user.put("participants", people);
    user.put("category", category);
    user.put("mood", mood);
    user.put("durationMinutes", minutes);
    user.put("youngestAge", youngest);

    Map<String,Object> payload = new LinkedHashMap<>();
    payload.put("model", MODEL);
    payload.put("temperature", 0.7);
    payload.put("response_format",
        Map.of("type", "json_object"));

    payload.put("messages", List.of(
        Map.of(
            "role", "system",
            "content", instructions),
        Map.of(
            "role", "user",
            "content", Json.stringify(user))
    ));

    HttpRequest req = HttpRequest.newBuilder(
        URI.create(
            "https://api.openai.com/v1/chat/completions"))
        .timeout(Duration.ofSeconds(35))
        .header(
            "Authorization",
            "Bearer " + System.getenv("OPENAI_API_KEY"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(
            Json.stringify(payload),
            StandardCharsets.UTF_8))
        .build();

    HttpResponse<String> res = HTTP.send(
        req, HttpResponse.BodyHandlers.ofString());

    if (res.statusCode() != 200) {
      throw new IOException(
          "OpenAI HTTP " + res.statusCode());
    }

    Map<String,Object> api = obj(Json.parse(res.body()));
    Map<String,Object> choice =
        obj(arr(api.get("choices")).get(0));
    Map<String,Object> message =
        obj(choice.get("message"));

    Map<String,Object> answer = obj(Json.parse(
        str(message.get("content"))));

    List<Object> recs =
        arr(answer.get("recommendations"));

    if (recs.size() != 3) {
      throw new IOException(
          "Expected exactly three recommendations");
    }

    List<Object> clean = new ArrayList<>();

    for (Object rec : recs) {
      Map<String,Object> r = obj(rec);

      String title = str(r.get("title"));
      String reason = str(r.get("reason"));

      if (title.isBlank() || reason.isBlank()) {
        throw new IOException(
            "Missing recommendation fields");
      }

      String type = str(r.get("category"));

      if (!Set.of(
          "movie", "tv", "boardgame",
          "videogame").contains(type)) {
        type = category.equals("surprise")
            ? "movie" : category;
      }

      int score = Math.max(0, Math.min(
          100, number(r.get("matchScore"), 75)));

      clean.add(Map.of(
          "title", title,
          "category", type,
          "matchScore", score,
          "reason", reason,
          "ageRating", "Unverified"
      ));
    }

    Map<String,Object> result = new LinkedHashMap<>();
    result.put("recommendations", clean);
    return result;
  }

  static Map<String,Object> fallback(
      String category, int youngest) {

    String[][] titles;

    switch (category) {
      case "tv":
        titles = new String[][] {
          {"Hilda", "Animated fantasy adventure"},
          {"Phineas and Ferb", "Inventive family comedy"},
          {"The Dragon Prince", "Fantasy adventure and teamwork"}
        };
        break;

      case "boardgame":
        titles = new String[][] {
          {"Ticket to Ride", "Accessible route-building strategy"},
          {"Dixit", "Creative storytelling and imagination"},
          {"Codenames", "Team-based word guessing"}
        };
        break;

      case "videogame":
        titles = new String[][] {
          {"Minecraft", "Creative cooperative building"},
          {"Mario Kart 8 Deluxe", "Friendly racing competition"},
          {"Overcooked! 2", "Chaotic cooperative cooking"}
        };
        break;

      default:
        titles = youngest < 13
          ? new String[][] {
              {"The Mitchells vs. the Machines",
               "Animated family adventure"},
              {"Paddington 2",
               "Warmhearted comedy adventure"},
              {"The LEGO Movie",
               "Creative animated comedy"}
            }
          : new String[][] {
              {"Enola Holmes",
               "Mystery and clever problem-solving"},
              {"Jumanji: Welcome to the Jungle",
               "Action comedy adventure"},
              {"The Mitchells vs. the Machines",
               "Humorous family adventure"}
            };
    }

    String type = category.equals("surprise")
        ? "movie" : category;

    List<Object> recs = new ArrayList<>();

    for (int i = 0; i < 3; i++) {
      recs.add(Map.of(
          "title", titles[i][0],
          "category", type,
          "matchScore", 85 - i * 5,
          "reason",
          "DEMO SAMPLE: " + titles[i][1]
              + ". Not personalized or verified.",
          "ageRating", "Unverified"
      ));
    }

    Map<String,Object> out = new LinkedHashMap<>();
    out.put("recommendations", recs);
    out.put("source", "demo");
    out.put("notice",
        "AI unavailable or not configured; "
        + "displaying sample suggestions.");
    return out;
  }

  static boolean preflight(
      HttpExchange ex) throws IOException {
    if (ex.getRequestMethod().equals("OPTIONS")) {
      send(ex, 204, Map.of());
      return true;
    }
    return false;
  }

  static void send(
      HttpExchange ex,
      int status,
      Object response) throws IOException {

    var h = ex.getResponseHeaders();

    h.set("Access-Control-Allow-Origin", "*");
    h.set("Access-Control-Allow-Methods",
        "GET, POST, OPTIONS");
    h.set("Access-Control-Allow-Headers",
        "Content-Type");
    h.set("Content-Type",
        "application/json; charset=utf-8");

    byte[] bytes = Json.stringify(response)
        .getBytes(StandardCharsets.UTF_8);

    ex.sendResponseHeaders(
        status, status == 204 ? -1 : bytes.length);

    if (status != 204) {
      ex.getResponseBody().write(bytes);
    }

    ex.close();
  }

  static String str(Object o) {
    return o == null ? "" : String.valueOf(o);
  }

  static int number(Object o, int def) {
    if (o instanceof Number) {
      return ((Number) o).intValue();
    }

    try {
      return Integer.parseInt(str(o));
    } catch (Exception e) {
      return def;
    }
  }

  @SuppressWarnings("unchecked")
  static Map<String,Object> obj(Object o) {
    if (!(o instanceof Map)) {
      throw new IllegalArgumentException(
          "Expected JSON object");
    }
    return (Map<String,Object>) o;
  }

  @SuppressWarnings("unchecked")
  static List<Object> arr(Object o) {
    if (!(o instanceof List)) {
      throw new IllegalArgumentException(
          "Expected JSON array");
    }
    return (List<Object>) o;
  }

  // Built-in JSON reader and writer.
  // No third-party dependencies required.
  static class Json {
    final String s;
    int i;

    Json(String s) {
      this.s = s;
    }

    static Object parse(String s) {
      Json p = new Json(s);
      Object x = p.value();
      p.ws();

      if (p.i != s.length()) {
        throw new IllegalArgumentException(
            "Trailing JSON");
      }
      return x;
    }

    void ws() {
      while (i < s.length()
          && Character.isWhitespace(s.charAt(i))) {
        i++;
      }
    }

    char next() {
      if (i >= s.length()) {
        throw new IllegalArgumentException(
            "Unexpected end");
      }
      return s.charAt(i++);
    }

    void expect(char c) {
      ws();
      if (next() != c) {
        throw new IllegalArgumentException(
            "Expected " + c);
      }
    }

    Object value() {
      ws();

      if (i >= s.length()) {
        throw new IllegalArgumentException(
            "Missing value");
      }

      char c = s.charAt(i);

      if (c == '{') return object();
      if (c == '[') return array();
      if (c == '"') return string();

      if (s.startsWith("true", i)) {
        i += 4;
        return true;
      }

      if (s.startsWith("false", i)) {
        i += 5;
        return false;
      }

      if (s.startsWith("null", i)) {
        i += 4;
        return null;
      }

      int start = i;

      if (c == '-') i++;

      while (i < s.length()) {
        char n = s.charAt(i);

        if (Character.isDigit(n)
            || n == '.' || n == 'e'
            || n == 'E' || n == '+'
            || n == '-') {
          i++;
        } else {
          break;
        }
      }

      if (start == i) {
        throw new IllegalArgumentException(
            "Invalid JSON value");
      }

      try {
        return Double.valueOf(
            s.substring(start, i));
      } catch (Exception e) {
        throw new IllegalArgumentException(
            "Invalid number");
      }
    }

    Map<String,Object> object() {
      expect('{');

      Map<String,Object> m =
          new LinkedHashMap<>();

      ws();

      if (i < s.length()
          && s.charAt(i) == '}') {
        i++;
        return m;
      }

      while (true) {
        ws();
        String k = string();
        expect(':');
        m.put(k, value());
        ws();

        char c = next();

        if (c == '}') return m;

        if (c != ',') {
          throw new IllegalArgumentException(
              "Expected comma");
        }
      }
    }

    List<Object> array() {
      expect('[');

      List<Object> a = new ArrayList<>();
      ws();

      if (i < s.length()
          && s.charAt(i) == ']') {
        i++;
        return a;
      }

      while (true) {
        a.add(value());
        ws();

        char c = next();

        if (c == ']') return a;

        if (c != ',') {
          throw new IllegalArgumentException(
              "Expected comma");
        }
      }
    }

    String string() {
      expect('"');

      StringBuilder b = new StringBuilder();

      while (true) {
        char c = next();

        if (c == '"') {
          return b.toString();
        }

        if (c != '\\') {
          b.append(c);
          continue;
        }

        char e = next();

        switch (e) {
          case '"': b.append('"'); break;
          case '\\': b.append('\\'); break;
          case '/': b.append('/'); break;
          case 'b': b.append('\b'); break;
          case 'f': b.append('\f'); break;
          case 'n': b.append('\n'); break;
          case 'r': b.append('\r'); break;
          case 't': b.append('\t'); break;

          case 'u':
            if (i + 4 > s.length()) {
              throw new IllegalArgumentException(
                  "Bad unicode");
            }

            b.append((char) Integer.parseInt(
                s.substring(i, i + 4), 16));

            i += 4;
            break;

          default:
            throw new IllegalArgumentException(
                "Bad escape");
        }
      }
    }

    static String stringify(Object x) {
      if (x == null) return "null";

      if (x instanceof String) {
        return quote((String) x);
      }

      if (x instanceof Number
          || x instanceof Boolean) {
        return x.toString();
      }

      if (x instanceof Map<?,?> m) {
        List<String> p = new ArrayList<>();

        for (var e : m.entrySet()) {
          p.add(
              quote(String.valueOf(e.getKey()))
              + ":" + stringify(e.getValue()));
        }

        return "{" + String.join(",", p) + "}";
      }

      if (x instanceof Iterable<?> a) {
        List<String> p = new ArrayList<>();

        for (Object e : a) {
          p.add(stringify(e));
        }

        return "[" + String.join(",", p) + "]";
      }

      throw new IllegalArgumentException(
          "Unsupported JSON type");
    }

    static String quote(String s) {
      StringBuilder b = new StringBuilder("\"");

      for (char c : s.toCharArray()) {
        switch (c) {
          case '"': b.append("\\\""); break;
          case '\\': b.append("\\\\"); break;
          case '\n': b.append("\\n"); break;
          case '\r': b.append("\\r"); break;
          case '\t': b.append("\\t"); break;

          default:
            if (c < 32) {
              b.append(String.format(
                  "\\u%04x", (int) c));
            } else {
              b.append(c);
            }
        }
      }

      return b.append('"').toString();
    }
  }
}
