# Use Java 21
FROM eclipse-temurin:21-jdk

# Working directory inside container
WORKDIR /app

# Copy Maven wrapper and project files
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make Maven wrapper executable
RUN chmod +x mvnw

# Download dependencies first
RUN ./mvnw dependency:go-offline -DskipTests

# Copy source code
COPY src ./src

# Build Spring Boot application
RUN ./mvnw clean package -DskipTests

# Render will provide PORT at runtime
EXPOSE 8080

# Start Spring Boot application
CMD ["sh", "-c", "java -jar target/*.jar"]