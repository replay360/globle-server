const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let rooms = {};

io.on('connection', (socket) => {
  console.log('لاعب متصل:', socket.id);

  // إنشاء روم جديدة
  socket.on('createRoom', ({ targetCountryName }) => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomId] = {
      players: [socket.id],
      targetCountry: targetCountryName,
      turn: socket.id,
      guesses: []
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, isYourTurn: true });
  });

  // الانضمام لروم موجودة
  socket.on('joinRoom', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players.length === 1) {
      room.players.push(socket.id);
      socket.join(roomId);

      // إعلام اللاعبين ببداية اللعبة
      io.to(room.players[0]).emit('gameStart', { isYourTurn: true, roomId });
      socket.emit('gameStart', { isYourTurn: false, roomId });
    } else {
      socket.emit('errorMessage', 'الروم غير موجودة أو ممتلئة!');
    }
  });

  // إرسال التخمين وبثه للطرفين
  socket.on('sendGuess', ({ roomId, guessData }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.turn !== socket.id) {
      socket.emit('errorMessage', 'ليس دورك الآن!');
      return;
    }

    // تبديل الدور للخصم
    const nextTurn = room.players.find(id => id !== socket.id);
    room.turn = nextTurn;

    // إرسال النتيجة للطرفين
    io.to(roomId).emit('guessUpdate', {
      guessData,
      guessedBy: socket.id,
      nextTurnPlayer: nextTurn
    });
  });

  socket.on('disconnect', () => {
    console.log('لاعب قطع الاتصال:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
