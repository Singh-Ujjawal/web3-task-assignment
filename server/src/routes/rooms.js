import { Router } from 'express';

export default function roomRoutes(manager) {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const roomId = await manager.create(req.user.id, req.user.name);
      res.status(201).json({ roomId });
    } catch (err) {
      console.error('Room creation failed', err);
      res.status(500).json({ error: 'Could not create room' });
    }
  });

  router.get('/:roomId', async (req, res) => {
    const roomId = req.params.roomId.toUpperCase();
    try {
      if (await manager.exists(roomId)) return res.json({ roomId });
      res.status(404).json({ error: 'Room not found' });
    } catch (err) {
      console.error('Room lookup failed', err);
      res.status(500).json({ error: 'Lookup failed' });
    }
  });

  return router;
}
