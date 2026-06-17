import http from "http";
import app from "./app";
import { initSocket } from "./app/utils/socket";

const PORT = process.env.PORT || 5000;

async function bootstrap() {
    try {
        const server = http.createServer(app);
        initSocket(server);

        server.listen(PORT, () => {
            console.log(`Planora Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

bootstrap();
