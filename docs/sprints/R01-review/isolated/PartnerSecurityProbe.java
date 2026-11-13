import br.com.easypet.partner.config.SecurityConfig;
import br.com.easypet.partner.security.JwtAuthenticationFilter;
import br.com.easypet.partner.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.Filter;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

// Actual security sources, with an inert route probe. No server, database, network or deployment secrets.
public class PartnerSecurityProbe {
    static final String SECRET = "review-only-signing-material-with-no-deployment-use-2026";
    @Configuration @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class, Routes.class})
    static class Config {}
    @RestController
    static class Routes {
        @GetMapping({"/partners", "/partners/{id}", "/partners/catalog", "/admin/partners"})
        String probe() { return "REACHED_ROUTE"; }
    }
    public static void main(String[] args) throws Exception {
        try (var ctx = new AnnotationConfigWebApplicationContext()) {
            ctx.setServletContext(new MockServletContext());
            ctx.getEnvironment().getSystemProperties().put("jwt.secret", SECRET);
            ctx.register(Config.class);
            ctx.refresh();
            MockMvc mvc = MockMvcBuilders.webAppContextSetup(ctx)
                .addFilters(ctx.getBean("springSecurityFilterChain", Filter.class)).build();
            String id = UUID.randomUUID().toString();
            check(mvc, "/partners", null, 200);
            check(mvc, "/partners/" + id, null, 200);
            check(mvc, "/admin/partners", null, 401);
            check(mvc, "/partners/catalog", null, 401);
            String token = Jwts.builder().subject("review@example.test")
                .claim("userId", UUID.randomUUID().toString()).claim("role", "CUSTOMER")
                .expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8))).compact();
            check(mvc, "/partners/" + id, token, 200);
            check(mvc, "/admin/partners", token, 403);
            System.out.println("6 checks passed: legacy complete-read paths bypass service authorization; admin/catalog controls reject anonymous.");
        }
    }
    static void check(MockMvc mvc, String path, String token, int expected) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1" + path).contextPath("/api/v1");
        if (token != null) request.header("Authorization", "Bearer " + token);
        int status = mvc.perform(request).andReturn().getResponse().getStatus();
        System.out.println((token == null ? "anonymous" : "CUSTOMER") + " GET " + path + " => " + status);
        if (status != expected) throw new AssertionError("Expected " + expected + " got " + status);
    }
}
