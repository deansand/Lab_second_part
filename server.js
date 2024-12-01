import express, { json } from 'express';
import cors from 'cors';
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const app = express();

app.use(cors());
app.use(json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFarms = async () => {
  const filePath = path.join(__dirname, 'src/api/farms.json');
  const data = await readFile(filePath, 'utf8');
  return JSON.parse(data);
};

const getUsers = async () => {
  const filePath = path.join(__dirname, 'src/api/users.json');
  const data = await readFile(filePath, 'utf8');
  return JSON.parse(data);
};

const usersFilePath = path.join(__dirname, 'src/api/users.json');

app.post('/api/register', (req, res) => {
  const newUser = req.body;

  fs.readFile(usersFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read users file' });
    }

    const users = JSON.parse(data);
    const userExists = users.some(user => user.email === newUser.email || user.username === newUser.username);

    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    users.push(newUser);

    fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to write to users file' });
      }

      res.status(201).json(newUser);
    });
  });
});

app.post('/api/checkUserExists', async (req, res) => {
  const { email, username } = req.body;
  const users = await getUsers();
  const userExists = users.some(user => user.email === email || user.username === username);
  res.json({ exists: userExists });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const users = await getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    res.json({ email: user.email, name: user.name, username: user.username });
  } else {
    res.status(401).json('Invalid credentials');
  }
});

app.get('/api/farms', async (req, res) => {
  const { search, filter, order } = req.query;
  let farms = await getFarms();

  if (search) {
    farms = farms.filter(farm =>
      farm.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (filter) {
    farms = farms.sort((a, b) => {
      if (order === 'desc') {
        return a[filter] < b[filter] ? 1 : -1;
      }
      return a[filter] > b[filter] ? -1 : 1;
    });
  }

  res.json(farms);
});

app.get('/api/farms/:id', async (req, res) => {
  const { id } = req.params;
  const farms = await getFarms();
  const farm = farms.find(f => f.id === parseInt(id));
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }
  res.json(farm);
});

app.post('/api/update-stock', async (req, res) => {
  const { cart } = req.body;
  let farms = await getFarms();

  cart.forEach(cartItem => {
    const farm = farms.find(farm => farm.id === cartItem.id);
    if (farm) {
      farm.animals -= cartItem.quantity;
    }
  });

  const filePath = path.join(__dirname, 'src/api/farms.json');
  await writeFile(filePath, JSON.stringify(farms, null, 2), 'utf8');

  res.status(200).send({ message: 'Stock updated successfully' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});