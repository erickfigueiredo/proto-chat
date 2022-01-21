const path = require('path')
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const formatMessage = require('./utils/messages');
const { userJoin, userLeave, getCurrUser, getRoomUsers } = require('./utils/users');

// Express usa o modulo http por baixo do capô
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

/*
    OBSERVAÇÕES IMPORTANTES

    - Todos os eventos devem ficar dentro da função de conexão
    - Função connection é emitida pelo fornt quando alguem conecta
    - socket -> limita-se ao cliente e o servidor
    - socket.broadcast -> todos os usuários menos o portador do socket
    - io -> todos os clientes;
*/

io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        console.log(user.room)

        socket.join(user.room);

        socket.emit('message', formatMessage('Bibot', `Bem-vindo ao Proto Chat, ${user.username}!`));

        // Com o to, definimos para qual sala faremos a transmissão broadcast
        socket.broadcast
            .to(user.room)
            .emit('message', formatMessage('Bibot', `${user.username} acabou de entrar!`));

        // Informação sobre os usuários disponíveis na Sala
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    // Ouvindo a mensagem
    socket.on('chatMessage', (msg) => {
        const user = getCurrUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            // Com io.emit enviamos para todos os clientes
            io.to(user.room)
                .emit('message', formatMessage('Bibot', `${user.username} deixou o chat!`));

            // Informação sobre os usuários disponíveis na Sala
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
