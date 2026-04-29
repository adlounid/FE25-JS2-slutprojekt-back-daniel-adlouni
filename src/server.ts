
import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { readDB, writeDB } from './database.js';
import { Member, Task } from './types.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

const startStatuses = [ //den tar emot från front end även om de är olika
    'in-progress',
    'started',
    'ongoing',
    'active',
    'in progress',
    'pagaende'
];

app.use(cors()); // Tillåt alla domäner att göra förfrågningar till vår API
app.use(express.json()); // pratar med JSON in request body

function toStatusValue(value: unknown): string { //"städfunktion" för text
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().toLowerCase(); 
}

function isStartStatus(value: unknown): boolean { //kollar om en status betyder “startad” för att inte ha flera olika statusar som betyder samma sak
    const normalized = toStatusValue(value); 
    return startStatuses.includes(normalized); 
}

function hasValidAssignee(assigneeId: unknown, memberIds: string[]): boolean { //funktionen godkänner bara tom tilldelning eller ett riktigt medlems-id
    if (assigneeId === undefined || assigneeId === null) {
        return true;
    }

    if (typeof assigneeId !== 'string') {
        return false;
    }

    return memberIds.includes(assigneeId);
}


app.get('/api/tasks', async (_req: Request, res: Response) => { //hämtar alla tasks från databasen och skickar tillbaka dem som JSON. Vid fel returnerar den 500
    try {
        const db = await readDB();
        return res.json(db.tasks);
    } catch {
        return res.status(500).json({ message: 'Fel vid läsning av tasks' });
    }
});

app.post('/api/tasks', async (req: Request, res: Response) => { //läser in task-data, hämtar giltiga medlems-id:n och stoppar med 400 om assignedTo inte är ett giltigt member-id
    try {
        const { title, description, category, assignedTo } = req.body;

        const db = await readDB();

        const memberIds = db.members.map((member) => member.id);

        if (!hasValidAssignee(assignedTo, memberIds)) {
            return res.status(400).json({
                message: 'assignedTo måste vara ett giltigt member-id',
                code: 'INVALID_ASSIGNEE'
            });
        }

        const newTask: Task = { //den skapar en ny uppgift
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

        return res.status(201).json(newTask);
    } catch {
        return res.status(500).json({ message: 'Fel vid skapande av task' });
    }
});

app.patch('/api/tasks/:id', async (req: Request, res: Response) => { //Den hittar en task med id från URL, (finns ej=404) (finns=uppaterar med att slå ihop den gamla och nya datan)
    try {
        const db = await readDB();

        const taskIndex = db.tasks.findIndex((task) => task.id === req.params.id);

        if (taskIndex === -1) {
            return res.status(404).json({ message: 'Task hittades inte' });
        }

        const currentTask = db.tasks[taskIndex];

        const updatedTask: Task = {
            ...currentTask,
            ...req.body
        };

        const memberIds = db.members.map((member) => member.id); //kollar att det är giltig medlem

        if (!hasValidAssignee(updatedTask.assignedTo, memberIds)) {
            return res.status(400).json({
                message: 'assignedTo måste vara ett giltigt member-id',
                code: 'INVALID_ASSIGNEE'
            });
        }

        const movesIntoStartedState = isStartStatus(updatedTask.status) && !isStartStatus(currentTask.status);
        const hasNoAssignee = !updatedTask.assignedTo;

        if (movesIntoStartedState && hasNoAssignee) { //måste vara tilldelad för att kunna starta
            return res.status(400).json({
                message: 'Projekt kan inte startas utan tilldelad användare',
                code: 'TASK_START_REQUIRES_ASSIGNEE'
            });
        }

        db.tasks[taskIndex] = updatedTask; //sparar den uppdaterade uppgiften i listan

        await writeDB(db);

        return res.json(updatedTask);
    } catch {
        return res.status(500).json({ message: 'Fel vid uppdatering av task' });
    }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response) => { //den raderar en uppgift
    try {
        const db = await readDB();

        const initialCount = db.tasks.length;

        db.tasks = db.tasks.filter((task) => task.id !== req.params.id);

        if (db.tasks.length === initialCount) {
            return res.status(404).json({ message: 'Task hittades inte' });
        }

        await writeDB(db);

        return res.status(204).send();
    } catch {
        return res.status(500).json({ message: 'Fel vid radering av task' });
    }
});


app.get('/api/members', async (_req: Request, res: Response) => { //hämtar alla medlemmar och skickar tillbaka dem som JSON
    try {
        const db = await readDB();
        return res.json(db.members);
    } catch {
        return res.status(500).json({ message: 'Fel vid läsning av members' });
    }
});

app.post('/api/members', async (req: Request, res: Response) => { //skapar och sparar en ny medlem
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

        return res.status(201).json(newMember);
    } catch {
        return res.status(500).json({ message: 'Fel vid skapande av member' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend kör på http://localhost:${PORT}`);
});