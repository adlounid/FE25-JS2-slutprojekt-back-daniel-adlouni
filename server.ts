import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { readDB, writeDB } from './database.js';
import { Member, Task } from './types.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const START_STATUSES = new Set([
    'in progress',
    'in-progress',
    'ongoing',
    'active',
    'started',
    'pagaende'
]);

function normalizeStatus(status: string): string {
    return status.trim().toLowerCase();
}

function isStartStatus(status: string): boolean {
    return START_STATUSES.has(normalizeStatus(status));
}

app.use(cors());
app.use(express.json());

app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        res.json(db.tasks);
    } catch (error) {
        res.status(500).json({ message: 'Fel vid lasning' });
    }
});

app.post('/api/tasks', async (req: Request, res: Response) => {
    try {
        const { title, description, category, assignedTo } = req.body;
        const db = await readDB();

        if (assignedTo !== undefined && assignedTo !== null) {
            const assigneeExists = db.members.some((member) => member.id === assignedTo);
            if (!assigneeExists) {
                return res.status(400).json({
                    message: 'assignedTo maste vara en giltig medlem',
                    code: 'INVALID_ASSIGNEE'
                });
            }
        }

        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            description,
            category,
            status: 'new',
            assignedTo: assignedTo ?? null,
            timestamp: new Date().toLocaleString('sv-SE')
        };

        db.tasks.push(newTask);
        await writeDB(db);
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ message: 'Fel vid sparning' });
    }
});

app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        const index = db.tasks.findIndex((task) => task.id === req.params.id);

        if (index === -1) {
            return res.status(404).send('Hittades ej');
        }

        const currentTask = db.tasks[index];
        const nextTask: Task = { ...currentTask, ...req.body };

        if (req.body.assignedTo !== undefined && req.body.assignedTo !== null) {
            const assigneeExists = db.members.some((member) => member.id === req.body.assignedTo);
            if (!assigneeExists) {
                return res.status(400).json({
                    message: 'assignedTo maste vara en giltig medlem',
                    code: 'INVALID_ASSIGNEE'
                });
            }
        }

        if (
            typeof nextTask.status === 'string' &&
            isStartStatus(nextTask.status) &&
            !isStartStatus(currentTask.status) &&
            !nextTask.assignedTo
        ) {
            return res.status(400).json({
                message: 'Projekt kan inte startas utan tilldelad anvandare',
                code: 'TASK_START_REQUIRES_ASSIGNEE'
            });
        }

        db.tasks[index] = nextTask;
        await writeDB(db);
        res.json(db.tasks[index]);
    } catch (error) {
        res.status(500).json({ message: 'Fel vid uppdatering' });
    }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        db.tasks = db.tasks.filter((task) => task.id !== req.params.id);
        await writeDB(db);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Fel vid radering' });
    }
});

app.get('/api/members', async (req: Request, res: Response) => {
    try {
        const db = await readDB();
        res.json(db.members);
    } catch (error) {
        res.status(500).json({ message: 'Fel vid lasning' });
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
        res.status(500).json({ message: 'Fel vid sparning av medlem' });
    }
});

app.listen(PORT, () => console.log(`Backend kors pa http://localhost:${PORT}`));