import { initSocket } from '/core/socket.mjs';
import { navigate } from '/core/router.mjs';

// Create a global app context (or use something like a state manager)
const socket = initSocket();

//navigate(window.location.href, socket);
navigate('/games/uno', socket);
