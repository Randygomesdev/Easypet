Start-Process wt -ArgumentList (
  "new-tab --title Infra -d `"C:\Projects\Easypet\Backend\Infra`" powershell -NoExit -Command docker compose up" +
  "; new-tab --title Auth -d `"C:\Projects\Easypet\Backend\Auth-Service`" powershell -NoExit -Command mvn spring-boot:run" +
  "; new-tab --title Gateway -d `"C:\Projects\Easypet\Backend\Gateway-Service`" powershell -NoExit -Command mvn spring-boot:run" +
  "; new-tab --title Pet -d `"C:\Projects\Easypet\Backend\Pet-Service`" powershell -NoExit -Command .\gradlew bootRun" +
  "; new-tab --title Partner -d `"C:\Projects\Easypet\Backend\Partner-Service`" powershell -NoExit -Command .\gradlew bootRun" +
  "; new-tab --title Booking -d `"C:\Projects\Easypet\Backend\Booking-Service`" powershell -NoExit -Command .\gradlew bootRun" +
  "; new-tab --title Payment -d `"C:\Projects\Easypet\Backend\Payment-Service`" powershell -NoExit -Command .\gradlew bootRun" +
  "; new-tab --title Frontend -d `"C:\Projects\Easypet\Frontend`" powershell -NoExit -Command npm run dev"
)
