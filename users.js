const users = [];

const addUser = ({ id, name, room }) => {
  const numberOfUsersInRoom = users.filter((user) => user.room === room).length;

  const newUser = { id, name, room, team: "spectator", guide: false };
  users.push(newUser);
  return { newUser };
};

const removeUser = (id) => {
  const removeIndex = users.findIndex((user) => user.id === id);

  if (removeIndex !== -1) return users.splice(removeIndex, 1)[0];
};

const getUser = (id) => {
  return users.find((user) => user.id === id);
};

const setUserName = (id, name) => {
  let user = getUser(id);
  if (user) {
    user.name = name;
  }
  return user;
};

const setTeam = (id, team) => {
  let user = getUser(id);
  if (user) {
    user.team = team;
  }
  return user;
};

const getUsersInRoom = (room) => {
  return users.filter((user) => user.room === room);
};

module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  setUserName,
  setTeam,
};
