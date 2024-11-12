const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let groups = {}; // Store groups with members and admin info

// Serve static files
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected');

  // Create group
  socket.on('createGroup', ({ groupName, adminName }) => {
    if (!groups[groupName]) {
      groups[groupName] = { admin: adminName, members: [] };
      groups[groupName].members.push({ id: socket.id, name: adminName });
      socket.join(groupName);
      socket.emit('groupCreated', { groupName, admin: adminName });

      io.to(groupName).emit('updateGroup', { groupName, admin: adminName, members: groups[groupName].members });
    } else {
      socket.emit('error', 'Group already exists!');
    }
  });

  // Join group
  socket.on('joinGroup', ({ groupName, userName }) => {
    if (groups[groupName]) {
      groups[groupName].members.push({ id: socket.id, name: userName });
      socket.join(groupName);
      socket.emit('joinedGroup', { groupName, admin: groups[groupName].admin, members: groups[groupName].members, isAdminUser: false });

      io.to(groupName).emit('updateGroup', { groupName, admin: groups[groupName].admin, members: groups[groupName].members });
    } else {
      socket.emit('error', 'Group does not exist!');
    }
  });

  // Sync page for all users
  socket.on('syncPage', ({ groupName, page }) => {
    io.to(groupName).emit('syncPage', { page });
  });

  // Upload PDF and sync to all members
  socket.on('uploadPdf', ({ groupName, pdfUrl }) => {
    io.to(groupName).emit('syncPdf', { pdfUrl });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    for (let groupName in groups) {
      let group = groups[groupName];
      group.members = group.members.filter(member => member.id !== socket.id);

      // If the group becomes empty, delete it
      if (group.members.length === 0) {
        delete groups[groupName];
      } else {
        io.to(groupName).emit('updateGroup', { groupName, admin: group.admin, members: group.members });
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
