import br.com.easypet.booking.config.RestTemplateConfig;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.util.ReflectionTestUtils;

public class BookingHttpTimeoutProbe {
    public static void main(String[] args) {
        Object wrapped = new RestTemplateConfig().restTemplate().getRequestFactory();
        Object factory = ReflectionTestUtils.getField(wrapped, "requestFactory");
        if (!(factory instanceof SimpleClientHttpRequestFactory)) throw new AssertionError("Factory changed: re-review");
        Object connect = ReflectionTestUtils.getField(factory, "connectTimeout");
        Object read = ReflectionTestUtils.getField(factory, "readTimeout");
        System.out.println("Actual Booking RestTemplate bean: connectTimeout=" + connect + "; readTimeout=" + read);
        if (!Integer.valueOf(-1).equals(connect) || !Integer.valueOf(-1).equals(read)) {
            throw new AssertionError("Explicit timeouts detected: re-review R01-002");
        }
        System.out.println("Confirmed: neither timeout is configured; SimpleClientHttpRequestFactory preserves URLConnection defaults. No network request made.");
    }
}
