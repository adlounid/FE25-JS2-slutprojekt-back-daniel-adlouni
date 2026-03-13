import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { readDB, writeDB } from './database.js';
import { Member, Task } from './types.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        res.json(db.tasks);
    } catch (error) {
        res.status(500).json({ message: "Fel vid läsning" });
    }
});

app.post('/api/tasks', async (req: Request, res: Response) => {
    try {
        const { title, description, category } = req.body;
        const db = await readDB();
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            description,
            category,
            status: "new",
            assignedTo: null,
            timestamp: new Date().toLocaleString('sv-SE')
        };
        db.tasks.push(newTask);
        await writeDB(db);
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ message: "Fel vid sparning" });
    }
});

app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        const index = db.tasks.findIndex((t) => t.id === req.params.id);
        if (index !== -1) {
            db.tasks[index] = { ...db.tasks[index], ...req.body };
            await writeDB(db);
            res.json(db.tasks[index]);
        } else {
            res.status(404).send("Hittades ej");
        }
    } catch (error) {
        res.status(500).json({ message: "Fel vid uppdatering" });
    }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        db.tasks = db.tasks.filter((t) => t.id !== req.params.id);
        await writeDB(db);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Fel vid radering" });
    }
});


app.get('/api/members', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        res.json(db.members);
    } catch (error) {
        res.status(500).json({ message: "Fel vid läsning" });
    }
});

app.post('/api/members', async (req: Request, res: Response) => {
    try {
        const { name, category } = req.body;
        const db = await readDB();
        
        const newMember: Member = { 
            id: crypto.randomUUID(), 
            name, 
            category 
        };
        
        db.members.push(newMember);
        await writeDB(db);
        res.status(201).json(newMember);
    } catch (error) {
        res.status(500).json({ message: "Fel vid sparning av medlem" });
    }
});

app.listen(PORT, () => console.log(`Backend körs på http://localhost:${PORT}`));