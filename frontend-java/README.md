# Frontend for the Java backend

Copy of the React + Vite UI, used only with `backend-java` (Spring Boot).

The original `frontend/` folder is for the Node API. Do not change it for Java work — edit this folder instead.

## What differs from `frontend/`

- Vite proxies `/socket.io` to port **3001** (Java Socket.IO), not 3000
- Socket client sends the JWT as a query param (netty-socketio)
- Super Admin can submit the create-job form
- Job opportunities filters tolerate a missing `segments` list

## Run

Stop the Node frontend first if it is using ports 5173/5178.

```bash
cd frontend-java
npm install
npm run dev
```

Then open http://localhost:5173 with `backend-java` already running (`mvn spring-boot:run`).
