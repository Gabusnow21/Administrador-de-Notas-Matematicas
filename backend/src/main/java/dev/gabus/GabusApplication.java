package dev.gabus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

@SpringBootApplication
public class GabusApplication {

	public static void main(String[] args) {
		SpringApplication.run(GabusApplication.class, args);
	}

	public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Esto evita el error "No serializer found for class ... ByteBuddyInterceptor"
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        return mapper;
    }


}
