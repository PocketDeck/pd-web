import { initSocket } from '/core/socket.mjs';
import { navigate } from '/core/router.mjs';

initSocket();
//navigate(window.location.href);
navigate('/games/uno');
