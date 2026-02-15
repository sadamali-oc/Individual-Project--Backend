const scanner =
  require("sonarqube-scanner").default || require("sonarqube-scanner");

scanner(
  {
    serverUrl: "http://localhost:9000",
    token: "sqa_74d7d4a38e50ad0e2669d055f8f55f4fe4829c48",
    options: {
      "sonar.projectKey": "morafusion-backend",
      "sonar.projectName": "Mora Fusion Backend",
     
      "sonar.projectVersion": "1.0",
      "sonar.sources": "src",
      "sonar.exclusions": "**/node_modules/**,**/dist/**",
      "sonar.javascript.lcov.reportPaths": "coverage/lcov.info",
    },
  },
  () => process.exit(),
);
