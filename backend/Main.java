
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class Main {

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(
            new InetSocketAddress(8080), 0
        );

        server.createContext("/api/health", exchange -> {
            send(exchange, 200, "{\"ok\":true}");
        });

        server.createContext("/api/recommend", exchange -> {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                send(exchange, 204, "");
                return;
            }

            if (!"POST".equals(exchange.getRequestMethod())) {
                send(exchange, 405, "{\"error\":\"Use POST\"}");
                return;
            }

            String request = new String(
                exchange.getRequestBody().readAllBytes(),
                StandardCharsets.UTF_8
            );

            // Temporary sample response.
            // The AI integration will replace this later.
            String result = """
            {
              "recommendations": [
                {
                  "title": "The Mitchells vs. the Machines",
                  "category": "movie",
                  "matchScore": 94,
                  "reason": "A fun mix of adventure, comedy, and family teamwork.",
                  "ageRating": "PG"
                },
                {
                  "title": "Jumanji: Welcome to the Jungle",
                  "category": "movie",
                  "matchScore": 90,
                  "reason": "Combines action, humor, and adventure.",
                  "ageRating": "PG-13"
                },
                {
                  "title": "Enola Holmes",
                  "category": "movie",
                  "matchScore": 87,
                  "reason": "Mystery, humor, and clever problem-solving.",
                  "ageRating": "PG-13"
                }
              ]
            }
            """;

            System.out.println("Recommendation request: " + request);
            send(exchange, 200, result);
        });

        server.start();
        System.out.println("Backend running at http://localhost:8080");
    }

    private static void send(
        HttpExchange exchange,
        int status,
        String response
    ) throws java.io.IOException {

        exchange.getResponseHeaders().set(
            "Content-Type", "application/json"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Origin", "*"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Headers",
            "Content-Type"
        );

        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);

        exchange.sendResponseHeaders(
            status,
            status == 204 ? -1 : bytes.length
        );

        if (status != 204) {
            exchange.getResponseBody().write(bytes);
        }

        exchange.close();
    }
}
